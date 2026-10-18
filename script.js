// ==========================================
// RoadSOS AI - Complete JavaScript
// ==========================================

// Toggle Dark / Light Mode
function toggleMode() {
    document.body.classList.toggle("light");
}

// Toggle Chatbot
function toggleChat() {
    const chat = document.getElementById("chatWindow");

    if (!chat) return;

    chat.style.display =
        getComputedStyle(chat).display === "none" ? "block" : "none";
}

// Handle Enter Key
function handleEnter(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatbot();
    }
}

// ==========================================
// SOS SCREEN FLASH + SIREN (local browser alert)
// Tap the SOS button again to stop the alarm.
// This visual/sound alert does not contact emergency services.
// ==========================================
let sosAudioContext = null;
let sosOscillator = null;
let sosGain = null;
let sosToneTimer = null;
let sosAutoStopTimer = null;
let sosHighTone = false;
let sosAlarmActive = false;

function activateEmergencySOS() {
    const button = document.getElementById("emergencySosButton");

    if (sosAlarmActive) {
        stopEmergencySOS();
        return;
    }

    sosAlarmActive = true;
    document.body.classList.add("sos-alerting");

    // Automatically stop the screen flash and siren after 5 seconds.
    if (sosAutoStopTimer) window.clearTimeout(sosAutoStopTimer);
    sosAutoStopTimer = window.setTimeout(() => {
        if (sosAlarmActive) stopEmergencySOS();
    }, 5000);

    if (button) {
        if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
        button.innerHTML = "🛑 STOP SOS ALARM";
        button.setAttribute("aria-pressed", "true");
    }

    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error("Audio is not supported in this browser");
        sosAudioContext = new AudioContextClass();
        sosOscillator = sosAudioContext.createOscillator();
        sosGain = sosAudioContext.createGain();
        sosOscillator.type = "sawtooth";
        sosOscillator.frequency.value = 880;
        sosGain.gain.value = 0.12;
        sosOscillator.connect(sosGain);
        sosGain.connect(sosAudioContext.destination);
        sosOscillator.start();
        sosToneTimer = window.setInterval(() => {
            if (!sosOscillator || !sosAudioContext) return;
            sosHighTone = !sosHighTone;
            sosOscillator.frequency.setTargetAtTime(sosHighTone ? 1050 : 650, sosAudioContext.currentTime, 0.04);
        }, 320);
    } catch (error) {
        console.warn("SOS siren could not start:", error);
        alert("Red SOS alert is active, but this browser could not play the siren. Check your sound settings.");
    }

    // Also start the existing location and nearby-hospital workflow.
    if (typeof getLocation === "function") getLocation();
}

function stopEmergencySOS() {
    sosAlarmActive = false;
    if (sosAutoStopTimer) { window.clearTimeout(sosAutoStopTimer); sosAutoStopTimer = null; }
    document.body.classList.remove("sos-alerting");
    if (sosToneTimer) { window.clearInterval(sosToneTimer); sosToneTimer = null; }
    if (sosOscillator) {
        try { sosOscillator.stop(); } catch (_) {}
        try { sosOscillator.disconnect(); } catch (_) {}
        sosOscillator = null;
    }
    if (sosGain) { try { sosGain.disconnect(); } catch (_) {} sosGain = null; }
    if (sosAudioContext) {
        try { sosAudioContext.close(); } catch (_) {}
        sosAudioContext = null;
    }
    const button = document.getElementById("emergencySosButton");
    if (button) {
        button.innerHTML = button.dataset.originalHtml || "🚨 EMERGENCY HELP";
        button.setAttribute("aria-pressed", "false");
    }
}

// ==========================================
// GPS LOCATION + MAP + NEARBY HOSPITALS
// ==========================================

function getLocation() {
    const status = document.getElementById("statusText");
    const loader = document.getElementById("loader");
    const results = document.getElementById("emergencyResults");
    const placesList = document.getElementById("placesList");
    const liveMap = document.getElementById("liveMap");

    if (status) status.innerText = "📍 Detecting your location...";
    if (loader) loader.classList.remove("hidden");
    if (results) results.style.display = "block";
    if (placesList) placesList.innerHTML = "";
    
    if (!navigator.geolocation) {
        locationError("Your browser does not support location detection.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            if (loader) loader.classList.add("hidden");
            if (status) status.innerText = "✅ Location detected";

            // Show map immediately
            if (liveMap) {
                liveMap.src =
                    `https://maps.google.com/maps?q=${lat},${lon}&z=14&output=embed`;
            }

            // Search nearby hospitals using OpenStreetMap Overpass
            if (placesList) {
                placesList.innerHTML =
                    "<p>🔎 Searching nearby hospitals...</p>";
            }

            const query = `
                [out:json][timeout:10];
                (
                  node["amenity"="hospital"](around:5000,${lat},${lon});
                  way["amenity"="hospital"](around:5000,${lat},${lon});
                  relation["amenity"="hospital"](around:5000,${lat},${lon});
                );
                out center tags;
            `;

            try {
                const response = await fetch(
                    "https://overpass-api.de/api/interpreter",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: "data=" + encodeURIComponent(query)
                    }
                );

                if (!response.ok) {
                    throw new Error("Hospital search unavailable");
                }

                const data = await response.json();
                const hospitals = (data.elements || []).slice(0, 8);

                if (hospitals.length === 0) {
                    placesList.innerHTML =
                        "<p>No hospitals were found in this search. Try the map below.</p>";
                    return;
                }

                placesList.innerHTML = hospitals.map(hospital => {
                    const tags = hospital.tags || {};
                    const name = escapeHTML(
                        tags.name || "Hospital (name unavailable)"
                    );

                    const hospitalLat =
                        hospital.lat ?? hospital.center?.lat;
                    const hospitalLon =
                        hospital.lon ?? hospital.center?.lon;

                    const mapLink =
                        `https://www.google.com/maps/search/?api=1&query=${hospitalLat},${hospitalLon}`;

                    return `
                        <div class="place-card">
                            <h3>🏥 ${name}</h3>
                            <p>${escapeHTML(tags["addr:street"] || "Address not listed")}</p>
                            <a href="${mapLink}" target="_blank"
                               rel="noopener noreferrer">
                               View directions ↗
                            </a>
                        </div>
                    `;
                }).join("");

            } catch (error) {
                console.error("Hospital search error:", error);

                if (placesList) {
                    placesList.innerHTML = `
                        <div class="place-card">
                            <h3>🏥 Hospital search unavailable</h3>
                            <p>Open the map to search for hospitals near you.</p>
                            <a href="https://www.google.com/maps/search/hospitals+near+me"
                               target="_blank" rel="noopener noreferrer">
                               Search hospitals on Google Maps ↗
                            </a>
                        </div>
                    `;
                }
            }
        },
        function (error) {
            let message = "Unable to detect your location.";

            if (error.code === 1) {
                message = "Location permission denied. Allow location access in your browser settings.";
            } else if (error.code === 2) {
                message = "Your location is unavailable. Check your device location settings.";
            } else if (error.code === 3) {
                message = "Location request timed out. Please try again.";
            }

            locationError(message);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
        }
    );
}

function locationError(message) {
    const status = document.getElementById("statusText");
    const loader = document.getElementById("loader");
    const placesList = document.getElementById("placesList");

    if (loader) loader.classList.add("hidden");
    if (status) status.innerText = "⚠️ Location unavailable";
    if (placesList) {
        placesList.innerHTML = `
            <div class="place-card">
                <p>${escapeHTML(message)}</p>
                <a href="https://www.google.com/maps/search/hospitals+near+me"
                   target="_blank" rel="noopener noreferrer">
                   Search hospitals on Google Maps ↗
                </a>
            </div>
        `;
    }

    console.warn(message);
}

// Escape external text before inserting it into HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// ==========================================
// ACCIDENT DEMO
// ==========================================

function simulateAccident() {
    const status = document.getElementById("statusText");
    const siren = document.getElementById("siren");

    if (status) status.innerText = "🚨 Accident Demo Activated";

    if (siren) {
        siren.play().catch(error => {
            console.warn("Siren could not play:", error);
        });
    }

    if (navigator.vibrate) {
        navigator.vibrate([300, 150, 300]);
    }

    speak(
        "This is an accident simulation demo. No emergency services have been contacted."
    );

    // Stop siren after 3 seconds; do not reload the page
    setTimeout(() => {
        if (siren) {
            siren.pause();
            siren.currentTime = 0;
        }

        if (navigator.vibrate) navigator.vibrate(0);

        if (status) status.innerText = "✅ Accident demo completed";
    }, 3000);
}

// ==========================================
// AMBULANCE CALL
// ==========================================

function callAmbulance() {
    speak("Opening the phone dialer for ambulance assistance.");

    // India: 108 ambulance; 112 integrated emergency helpline
    window.location.href = "tel:108";
}

// ==========================================
// WHATSAPP FAMILY ALERT
// ==========================================

function sendAlert() {
    const status = document.getElementById("statusText");

    if (status) {
        status.innerText = "📩 Emergency message ready to review";
    }

    const message =
        "Emergency! I need help. Please contact me as soon as possible.";

    speak("Opening WhatsApp with a prepared emergency message.");

    // User must select a recipient and send the message manually
    window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer"
    );
}
// ==========================================
// ROADSOS CHATBOT - BACKEND CONNECTED
// ==========================================

async function chatbot() {
    const inputElement = document.getElementById("userInput");
    const responseElement = document.getElementById("botResponse");

    if (!inputElement || !responseElement) {
        console.error("Chatbot HTML elements were not found.");
        return;
    }

    const message = inputElement.value.trim();

    if (!message) {
        responseElement.innerText =
            "Please type a message. I'm here to help!";
        return;
    }

    inputElement.value = "";
    responseElement.innerText = "RoadSOS AI is thinking...";

    try {
        const result = await fetch("https://roadsos-ai-jt2l.onrender.com/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        const data = await result.json();

        if (!result.ok) {
            throw new Error(data.error || "Unable to get a response.");
        }

        responseElement.innerText = data.reply;

        if (typeof speak === "function") {
            speak(data.reply);
        }

        console.log("RoadSOS chatbot mode:", data.mode);

    } catch (error) {
        console.error("Chatbot request failed:", error);

        responseElement.innerText =
            "Unable to connect to RoadSOS AI. Please check that the backend is running and try again.";
    }
}

// ==========================================
// VOICE INPUT
// ==========================================

function startVoice() {
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Voice recognition is not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = function (event) {
        const speech = event.results[0][0].transcript;
        const input = document.getElementById("userInput");

        if (input) {
            input.value = speech;
            chatbot();
        }
    };

    recognition.onerror = function (event) {
        console.warn("Voice recognition error:", event.error);
    };

    recognition.start();
}

// ==========================================
// VOICE OUTPUT
// ==========================================

function speak(text) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-IN";
    speech.rate = 1;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
}

// ==========================================
// CURSOR-FOLLOWING GLOW EFFECT
// ==========================================

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", function (event) {
        document.documentElement.style.setProperty(
            "--mouse-x",
            `${event.clientX}px`
        );

        document.documentElement.style.setProperty(
            "--mouse-y",
            `${event.clientY}px`
        );
    }, { passive: true });
}

// ==========================================
// ADVANCED SAFETY TOOLS
// ==========================================
function incrementSafetyActivity(report = false) {
    try {
        const count = Number(localStorage.getItem("roadsosActivityCount") || 0) + 1;
        localStorage.setItem("roadsosActivityCount", String(count));
        if (report) {
            const reports = Number(localStorage.getItem("roadsosReportCount") || 0) + 1;
            localStorage.setItem("roadsosReportCount", String(reports));
        }
        updateSafetyStats();
    } catch (error) { console.warn("Local statistics unavailable", error); }
}
function updateSafetyStats() {
    const activity = document.getElementById("activityCount");
    const reports = document.getElementById("reportCount");
    try {
        if (activity) activity.textContent = localStorage.getItem("roadsosActivityCount") || "0";
        if (reports) reports.textContent = localStorage.getItem("roadsosReportCount") || "0";
    } catch (_) { if (activity) activity.textContent = "—"; if (reports) reports.textContent = "—"; }
}
function shareMyLocation() {
    const output = document.getElementById("shareLocationStatus");
    if (!navigator.geolocation) { if (output) output.textContent = "Your browser does not support GPS location."; return; }
    if (output) output.textContent = "Requesting location permission…";
    navigator.geolocation.getCurrentPosition(async position => {
        const lat = position.coords.latitude; const lon = position.coords.longitude;
        const url = `https://www.google.com/maps?q=${lat},${lon}`;
        const text = `My current location: ${url}`;
        if (output) output.textContent = `Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}\nMap link: ${url}`;
        incrementSafetyActivity();
        try {
            if (navigator.share) { await navigator.share({ title: "My RoadSOS location", text: "Here is my current location", url }); }
            else if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); if (output) output.textContent += "\nLocation link copied to clipboard."; }
        } catch (error) { if (error.name !== "AbortError") console.warn("Share action cancelled or unavailable", error); }
    }, error => { if (output) output.textContent = error.code === 1 ? "Location permission was denied. Allow location access and try again." : "Could not get location. Check GPS and try again."; }, { enableHighAccuracy:true, timeout:15000, maximumAge:30000 });
}
function showFirstAid() {
    const selected = document.getElementById("firstAidType")?.value || "general";
    const output = document.getElementById("firstAidResult"); if (!output) return;
    const guidance = {
        general: "Make sure the scene is safe before approaching. Call 112 in India if there is immediate danger. Do not move a seriously injured person unless they are in immediate danger. Follow the emergency operator’s instructions.",
        bleeding: "Call emergency services for severe bleeding. If safe, apply firm, continuous direct pressure with clean cloth or gauze. Do not repeatedly lift the cloth to check. Follow the emergency operator’s instructions.",
        burn: "Move away from the heat source. Cool the burn under cool running water for 20 minutes if possible. Do not apply ice, butter, or creams; do not remove clothing stuck to the burn. Seek urgent medical help for severe burns.",
        unresponsive: "Call 112 immediately and follow the dispatcher’s instructions. Check whether the person is breathing normally. If they are not breathing normally, start CPR if you know how or follow the dispatcher’s coaching. Do not give food or drink."
    };
    output.textContent = guidance[selected] || guidance.general; incrementSafetyActivity();
}
async function getWeatherSafety() {
    const output = document.getElementById("weatherResult"); if (!output) return;
    if (!navigator.geolocation) { output.textContent = "Location is not supported by this browser."; return; }
    output.textContent = "Requesting location and checking weather…";
    navigator.geolocation.getCurrentPosition(async position => {
        try {
            const { latitude, longitude } = position.coords;
            const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=auto`;
            const response = await fetch(endpoint); if (!response.ok) throw new Error("Weather service unavailable");
            const data = await response.json(); const current = data.current;
            const tips = [];
            if (current.precipitation > 0) tips.push("Rain/precipitation reported: slow down and increase following distance.");
            if (current.wind_speed_10m >= 35) tips.push("Strong winds reported: be cautious, especially on two-wheelers.");
            if (current.relative_humidity_2m >= 85) tips.push("High humidity: stay hydrated and take breaks if needed.");
            if (!tips.length) tips.push("Continue to follow speed limits, signals, and local weather alerts.");
            output.textContent = `Current temperature: ${current.temperature_2m}°C\nHumidity: ${current.relative_humidity_2m}% · Wind: ${current.wind_speed_10m} km/h · Precipitation: ${current.precipitation} mm\n\nSafety reminder: ${tips.join(" ")}`;
            incrementSafetyActivity();
        } catch (error) { console.error(error); output.textContent = "Weather data could not be loaded right now. Check your connection and try again."; }
    }, () => { output.textContent = "Location permission is needed for local weather. Allow location access and try again."; }, { enableHighAccuracy:false, timeout:12000, maximumAge:60000 });
}
function downloadIncidentReport() {
    const type = document.getElementById("incidentType")?.value || "Incident";
    const details = document.getElementById("incidentDetails")?.value.trim() || "No additional notes provided.";
    const report = { product:"RoadSOS AI", reportType:type, createdAt:new Date().toISOString(), details, note:"User-created report. This file has not been sent to emergency services." };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `roadsos-incident-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    incrementSafetyActivity(true);
}
function resetSafetyStats() {
    if (!confirm("Reset the locally stored RoadSOS activity counters on this device?")) return;
    try { localStorage.removeItem("roadsosActivityCount"); localStorage.removeItem("roadsosReportCount"); } catch (_) {}
    updateSafetyStats();
}
document.addEventListener("DOMContentLoaded", updateSafetyStats);

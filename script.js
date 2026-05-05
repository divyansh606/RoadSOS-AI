// Toggle Dark Mode
function toggleMode(){

    document.body.classList.toggle("light");
}

// Toggle Chatbot
function toggleChat(){

    let chat =
    document.getElementById("chatWindow");

    if(chat.style.display === "block"){

        chat.style.display = "none";

    }else{

        chat.style.display = "block";
    }
}

// Handle Enter Key
function handleEnter(event){

    if(event.key === "Enter"){

        chatbot();
    }
}

// Emergency Location
function getLocation(){

    document.getElementById("statusText")
    .innerText = "📍 Detecting Location...";

    document.getElementById("loader")
    .classList.remove("hidden");

    if(navigator.geolocation){

        navigator.geolocation.getCurrentPosition(

            function(position){

                let lat =
                position.coords.latitude;

                let lon =
                position.coords.longitude;

                document.getElementById("loader")
                .classList.add("hidden");

                document.getElementById("statusText")
                .innerText =
                "✅ Emergency Services Found";

                // Show Results
                document.getElementById(
                "emergencyResults"
                ).style.display = "block";

                // Open Live Map
                document.getElementById(
                "liveMap"
                ).src =

                `https://maps.google.com/maps?q=hospital near ${lat},${lon}&z=14&output=embed`;

                // Fetch Real Hospitals
                fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=hospital+near+${lat},${lon}`
                )

                .then(response => response.json())

                .then(data => {

                    let output = "";

                    data.slice(0,5).forEach(place => {

                        output += `

                        <div class="place-card">

                            <h3>
                            🏥 ${place.display_name}
                            </h3>

                            <p>
                            📍 Real Nearby Hospital
                            </p>

                        </div>
                        `;
                    });

                    output += `

                    <div class="place-card">

                        <h3>
                        👮 Nearby Police Assistance
                        </h3>

                        <p>
                        📍 Emergency Support Available
                        </p>

                    </div>
                    `;

                    document.getElementById(
                    "placesList"
                    ).innerHTML = output;
                });

                speak(
                "Nearby emergency services detected successfully"
                );
            },

            showError
        );

    }else{

        alert("Geolocation not supported.");
    }
}

// Error
function showError(){

    document.getElementById("loader")
    .classList.add("hidden");

    alert("Location access denied.");
}

// Simulate Accident
function simulateAccident(){

    document.body.style.background =
    "darkred";

    document.getElementById("statusText")
    .innerText = "🚨 Accident Detected";

    // Play Siren
    document.getElementById("siren")
    .play();

    // Vibrate Phone
    if(navigator.vibrate){

        navigator.vibrate([500,300,500]);
    }

    speak(
    "Warning. Accident detected. Sending emergency assistance."
    );

    setTimeout(() => {

        location.reload();

    },5000);
}

// Ambulance Call
function callAmbulance(){

    speak("Calling ambulance service.");

    window.location.href = "tel:108";
}

// WhatsApp Alert
function sendAlert(){

    document.getElementById("statusText")
    .innerText = "📩 Emergency Alert Ready";

    speak("Emergency alert prepared.");

    let message =
    "Emergency! I need help immediately.";

    window.open(
    `https://wa.me/?text=${encodeURIComponent(message)}`
    );
}

// AI Chatbot
function chatbot(){

    let input =
    document.getElementById("userInput")
    .value.toLowerCase();

    let response =
    "I am here to help.";

    if(input.includes("ambulance")){

        response =
        "🚑 Ambulance number is 108.";

    }

    else if(input.includes("police")){

        response =
        "👮 Police helpline number is 100.";
    }

    else if(input.includes("fire")){

        response =
        "🔥 Fire brigade number is 101.";
    }

    else if(input.includes("help")){

        response =
        "🚨 Press emergency help button.";
    }

    else if(input.includes("hospital")){

        response =
        "🏥 Searching nearest hospitals.";
    }

    document.getElementById("botResponse")
    .innerText = response;

    speak(response);

    document.getElementById("userInput")
    .value = "";
}

// Voice Input
function startVoice(){

    if(
    !("webkitSpeechRecognition" in window ||
    "SpeechRecognition" in window)
    ){

        alert(
        "Voice recognition not supported."
        );

        return;
    }

    const SpeechRecognition =

    window.SpeechRecognition ||

    window.webkitSpeechRecognition;

    let recognition =
    new SpeechRecognition();

    recognition.start();

    recognition.onresult = function(event){

        let speech =
        event.results[0][0].transcript;

        document.getElementById("userInput")
        .value = speech;

        chatbot();
    };
}

// Voice Output
function speak(text){

    let speech =

    new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";

    speech.rate = 1;

    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
}
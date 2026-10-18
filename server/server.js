import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT || 3000);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
    origin: [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'https://divyansh606.github.io'
    ]
}));
app.use(express.json({ limit: '8kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));

const fallback = (message) => {
  const text = message.toLowerCase();
  if (/ambulance|accident|crash|injur|emergency|urgent|help/.test(text)) return 'If someone is in immediate danger in India, call 112 now. Move away from traffic if safe, do not move a seriously injured person unless there is immediate danger, and follow the emergency operator’s instructions. RoadSOS does not dispatch emergency services.';
  if (/hospital|nearby|nearest/.test(text)) return 'Use Emergency Help and allow location access to search nearby hospitals. Confirm details with the provider before travelling. If urgent, call 112.';
  if (/fire/.test(text)) return 'Move away from the fire and call 112 in India. Do not enter a burning building.';
  if (/police/.test(text)) return 'For emergency assistance in India, call 112. Move to a safe location if possible.';
  if (/first aid|bleed|burn|unresponsive|cpr/.test(text)) return 'Call 112 for a serious injury and follow the dispatcher’s instructions. Only provide first aid you are trained to give; this assistant is not a medical professional.';
  return 'I’m RoadSOS AI, a road-safety assistant. Ask about emergency steps, hospitals, first aid, or road safety. For an immediate emergency in India, call 112.';
};

app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: Boolean(process.env.AI_API_KEY) }));
app.post('/api/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 1200) return res.status(400).json({ error: 'Message must be between 1 and 1200 characters.' });
  if (!process.env.AI_API_KEY || !process.env.AI_API_URL) return res.json({ reply: fallback(message), mode: 'basic' });
  try {
    const upstream = await fetch(process.env.AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          { role: 'system', content: 'You are RoadSOS AI, a concise road-safety information assistant. For an immediate emergency in India, tell the user to call 112. Do not claim to dispatch an ambulance, contact family, track vehicles, or replace emergency responders or medical professionals. Give cautious, general first-aid guidance and direct users to emergency operators for serious situations. Never ask for passwords, payment details, or unnecessary personal data.' },
          { role: 'user', content: message }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!upstream.ok) throw new Error(`AI provider returned ${upstream.status}`);
    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) throw new Error('Empty AI response');
    return res.json({ reply: reply.trim(), mode: 'ai' });
  } catch (error) {
    console.error('AI provider request failed:', error.message);
    return res.json({ reply: fallback(message) + ' (Basic mode is active because the AI service is unavailable.)', mode: 'basic' });
  }
});
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.listen(port, () => console.log(`RoadSOS AI API listening on http://localhost:${port}`));

# RoadSOS AI backend (optional)

The website still works as a static site with its built-in safety responses. This optional Node.js backend adds a secure server-side AI provider connection; the API key must never be placed in `script.js` or other browser files.

## Setup
1. Install Node.js 18+.
2. Open a terminal in this `server` folder and run `npm install`.
3. Copy `.env.example` to `.env` and set `AI_API_KEY` (and `AI_API_URL` / `AI_MODEL` if needed).
4. Run `npm start`.
5. To test the backend locally with the website, serve the website through a local dev proxy or configure your deployment to route `/api/*` to this server. A static GitHub Pages deployment cannot run this backend by itself.

Health check: `GET /api/health`. Chat: `POST /api/chat` with JSON `{ "message": "What should I do after a crash?" }`.

## Safety and privacy
- Never commit `.env` or publish API keys.
- The API validates message length and applies a basic per-IP rate limit.
- Messages are sent to the AI provider only when the backend is configured with a key. Review the provider's data policy before use.
- This is not an emergency dispatch system. In immediate danger in India, call 112. AI output may be wrong; follow emergency professionals.

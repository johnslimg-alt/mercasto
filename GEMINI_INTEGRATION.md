**Gemini Integration (local proxy)**

- **What**: lightweight Express proxy that forwards a prompt to a configurable Gemini-like REST URL and returns the response to the frontend.
- **Why**: keep API keys off the browser by calling the LLM from a server process.

Files added:
- `server/index.js` — the proxy server.
- `.env.example` — environment vars template.
- `src/GeminiDemo.jsx` — simple React demo component that POSTs to `/api/gemini`.

Quick start (local):

1. Copy `.env.example` to `.env` and fill `GEMINI_REST_URL` and `GEMINI_API_KEY` (or leave empty to use demo fallback).

2. Install new deps and run server:

```bash
npm install
node server/index.js
```

3. Start the frontend (in project root):

```bash
npm run dev
```

4. Open the app and mount or import `src/GeminiDemo.jsx` where you'd like to use it. Example:

```jsx
import GeminiDemo from './GeminiDemo'
// ...
<GeminiDemo />
```

Notes:
- The server is intentionally generic: set `GEMINI_REST_URL` to your provider endpoint. For Google Vertex/Generative API you may need the full model-specific URL and JSON body shape; adjust `server/index.js` request body accordingly.
- Never commit real API keys to source control. Use environment variables or a secrets manager in production.

# Aura Skincare: AI Voice Customer Support Agent

A browser-based voice agent named **Aria** that handles customer support for a fictional D2C skincare brand, **Aura Skincare**. A customer clicks **Start Call**, speaks into the microphone, and Aria answers out loud. Aria looks up orders with a tool, enforces brand policies, and produces a structured JSON summary when the call ends.


> The backend runs on a free hosting tier and sleeps after inactivity. If the first message is slow, wait about a minute for it to wake up and try again.

---

## 1. Project Overview

Aria is a concise, friendly Indian customer support specialist. She can:

- Track orders, using a real function call against a mock order database
- Answer shipping, return, refund, damaged-item, cancellation and COD questions strictly according to brand policy
- Politely decline anything outside Aura Skincare support
- Summarise the call into structured JSON after it ends

## 2. Features

- Natural voice conversation (speech in, speech out)
- Live agent state indicator: **Idle, Listening, Thinking, Speaking**
- Start Call and End Call controls
- Live chronological transcript
- Test Orders helper panel so evaluators know what to try
- `get_order_details(order_id)` tool with case-insensitive, speech-tolerant ID matching
- Policy guardrails in the system prompt (no invented orders, no out-of-policy promises)
- Graceful handling of invalid or missing order IDs, unclear speech, backend errors and off-topic requests
- Post-call structured JSON summary (intent, order ID, resolution status, summary, key points)
- Typed-message fallback for testing without a microphone

## 3. Architecture

```
Browser (Chrome / Edge)
  |-- Microphone --> Web Speech API (speech-to-text)
  |-- State machine: IDLE -> LISTENING -> THINKING -> SPEAKING -> LISTENING
  '-- Speaker   <-- speechSynthesis (text-to-speech, en-IN)
        |
        |  POST /api/chat  { messages: [...] }
        v
FastAPI backend (stateless)
  |-- agent.py   : system prompt + LLM call + tool-calling loop
  |-- LLM requests a tool --> tools.py: get_order_details(order_id)
  |                              '--> orders.json (mock database)
  '-- LLM writes the final reply --> returned as text
        |
  End Call --> POST /api/summary { messages: [...] } --> structured JSON
```

### Why this architecture suits a 1.5-day MVP

- **No voice vendor.** The browser handles speech-to-text and text-to-speech, so there are no extra API keys, no audio streaming and no WebSockets.
- **Stateless backend.** The frontend sends the full message history on every turn. There are no sessions and no database to manage, so deployment is trivial.
- **One request-response loop and one tool.** It is easy to reason about, test with `curl`, and explain.
- **Swappable voice layer.** All speech logic lives in `frontend/src/voice.js`. Upgrading to a streaming voice provider later does not touch the agent logic.

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite (JavaScript) |
| Backend | Python, FastAPI, Uvicorn |
| LLM | Google Gemini (`gemini-2.5-flash`) through its OpenAI-compatible endpoint, called with the `openai` Python SDK |
| Speech-to-text | Browser Web Speech API (`SpeechRecognition`) |
| Text-to-speech | Browser `speechSynthesis` |
| Data | Local `orders.json` |
| Hosting | Vercel (frontend), Render (backend), both free tiers |

## 5. How the Voice Pipeline Works

1. **Start Call** moves the state to `SPEAKING` while Aria says a greeting, then to `LISTENING`.
2. In `LISTENING`, the Web Speech API (`en-IN`) captures one utterance and returns the final transcript.
3. The transcript is added to the conversation and sent to `/api/chat`. State becomes `THINKING`.
4. When the reply arrives, state becomes `SPEAKING` and `speechSynthesis` reads it aloud.
5. Speech recognition is paused while Aria speaks, so she does not hear herself. When speech ends, state returns to `LISTENING`.
6. **End Call** cancels speech and recognition, sets the call to ended, and requests the summary.

The state machine and turn logic live in `App.jsx`. The speech functions (`speak`, `cancelSpeech` and the listening helpers) live in `voice.js`.

## 6. How Tool Calling Works

1. The backend sends the conversation, the system prompt and the `get_order_details` tool schema to the LLM.
2. If the customer asks about a specific order and gives an ID, the model responds with a tool call instead of text.
3. `agent.py` runs `get_order_details(order_id)` and sends the result back to the model as a `tool` message.
4. The model writes the final natural-language reply using only the returned data.
5. The loop allows a few tool rounds, then falls back to a safe message, so it can never run forever.

`get_order_details` normalises IDs (`ord 101`, `ORD101`, `101`, `ord-101` all become `ORD-101`) because speech recognition often drops hyphens. It never raises: for unknown IDs it returns `{"found": false, ...}`, and the prompt forces Aria to ask the customer to verify the ID.

## 7. How Policy Guardrails Work

Policies and rules live in the system prompt (`backend/prompts.py`):

- **Grounding:** every order fact (status, courier, tracking, ETA) must come from the tool result. Aria never invents order data.
- **Policy enforcement:** shipping fees, the 7-day return window, unopened and unused condition, the 48-hour damage reporting window, cancellation only while Processing, and COD up to 2,500 rupees.
- **No out-of-policy promises:** Aria explains why something is not possible and what is possible instead.
- **Missing or invalid IDs:** she asks for the ID, or asks the customer to verify it.
- **Scope control:** non-Aura topics get a polite fixed redirect.
- **Voice style:** 1 to 3 short sentences, no lists or markdown.
- **Context:** she remembers earlier details and does not re-ask for them.

Defence in depth: the tool layer also returns structured "not found" results, and the agent loop has fallbacks for tool and LLM errors.

## 8. Local Setup

**Prerequisites:** Python 3.10+, Node 18+, Chrome or Edge, and a Gemini API key from [Google AI Studio](https://aistudio.google.com).

```bash
git clone https://github.com/<you>/aura-ai-voice-agent.git
cd aura-ai-voice-agent

# Backend
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then add your GEMINI_API_KEY
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

## 9. Environment Variables

**backend/.env**

| Variable | Description | Example |
|---|---|---|
| `GEMINI_API_KEY` | Gemini API key | `AIza...` |
| `LLM_MODEL` | Optional model override | `gemini-2.5-flash` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173,https://<app>.vercel.app` |

**frontend/.env**

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL, no trailing slash | `http://localhost:8000` |

## 10. API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| GET | `/api/orders` | Sample orders for the helper panel |
| POST | `/api/chat` | One agent turn |
| POST | `/api/summary` | Post-call structured summary |

**POST /api/chat**

```json
// Request
{ "messages": [ { "role": "user", "content": "Where is my order ORD-101?" } ] }

// Response
{
  "reply": "Your order ORD-101 is out for delivery with BlueDart and is expected by 6 PM today.",
  "tool_calls": [
    { "name": "get_order_details", "arguments": "{\"order_id\": \"ORD-101\"}", "result": { "found": true, "order": { "...": "..." } } }
  ]
}
```

**POST /api/summary**

```json
// Request: same shape as /api/chat
// Response
{
  "customer_intent": "ORDER_TRACKING",
  "order_id": "ORD-101",
  "resolution_status": "RESOLVED",
  "call_summary": "Customer asked about the delivery status of ORD-101. The order is out for delivery and expected by 6 PM today.",
  "key_points": ["Courier: BlueDart", "Expected by 6 PM today"]
}
```

Intents: `ORDER_TRACKING`, `CANCELLATION`, `RETURN`, `REFUND`, `SHIPPING`, `COD`, `GENERAL_QUERY`, `OUT_OF_SCOPE`, `UNKNOWN`.
Statuses: `RESOLVED`, `UNRESOLVED`, `OUT_OF_SCOPE`, `NEEDS_INFORMATION`.

## 11. Test Scenarios

| # | Say | Expected behaviour |
|---|---|---|
| 1 | "Where is my order ORD-101?" | Calls the tool. Out for Delivery, BlueDart, expected by 6 PM today |
| 2 | "Can I cancel ORD-103?" | Calls the tool. Yes, eligible because the order is Processing |
| 3 | "Where is ORD-999?" | Tool returns not found. Aria asks the customer to verify the order ID |
| 4 | "I bought this 20 days ago and opened it. Can I return it?" | No tool call. Not eligible: outside the 7-day window, and the product must be unopened and unused |
| 5 | "Can you book me a flight to Goa?" | Polite refusal. Aria only helps with Aura Skincare queries |

Bonus checks: "Can I cancel ORD-101?" (out for delivery, cannot cancel, may refuse at the doorstep), "Can I return ORD-102?" (delivered 14 days ago, outside the 7-day window), and a follow-up like "and what about that order?" to check conversation context.

## 12. Deployment Instructions

**Backend on Render (free)**

1. Push the repo to GitHub.
2. Render: **New, Web Service**, pick the repo.
3. Settings: Root Directory `backend`, Build Command `pip install -r requirements.txt`, Start Command `uvicorn main:app --host 0.0.0.0 --port $PORT`, Instance Type Free.
4. Environment variables: `GEMINI_API_KEY`, `ALLOWED_ORIGINS`, and `PYTHON_VERSION` (an exact version such as `3.12.3`).
5. Verify `https://<service>.onrender.com/health` returns `{"status":"ok"}`.

**Frontend on Vercel (free)**

1. Vercel: **Add New, Project**, import the repo.
2. Root Directory `frontend`, preset Vite.
3. Environment variable `VITE_API_URL` set to the Render URL, with no trailing slash. Set it before the first build.
4. Deploy.

**Finish**

Set `ALLOWED_ORIGINS` on Render to `https://<your-vercel-url>,http://localhost:5173` so CORS allows the frontend. Optionally add a free uptime monitor that pings `/health` every 5 minutes to keep the backend warm.

## 13. Known Limitations

- **Browser support:** the Web Speech API works best in Chrome and Edge, and Firefox is not supported.
- **Voice quality:** browser speech recognition and synthesis are less accurate and less natural than dedicated providers, especially with noise or strong accents.
- **Turn-based:** there is no barge-in, so the customer cannot interrupt Aria mid-sentence.
- **Latency:** each turn is request-response (speech to text, LLM, text to speech) rather than streaming.
- **Cold starts:** the free backend tier sleeps after inactivity and takes around a minute to wake.
- **Free LLM limits:** the Gemini free tier has modest rate limits.
- **Mock data:** orders are static JSON, and Aria cannot actually perform cancellations or refunds. She only states eligibility.
- **No authentication:** there is no customer identity verification.
- **English-first:** Hinglish and other languages are not supported.

## 14. Future Improvements

- Streaming voice with a provider such as Deepgram and ElevenLabs, or a realtime speech-to-speech API, with barge-in
- Streaming LLM responses to start speaking sooner
- Hinglish and multilingual support
- Real database and order-system integration, with customer verification
- More tools: cancel order, create return request, escalate to a human agent
- Automated evaluation suite for policy compliance, plus conversation logging and analytics
- Server-side sessions and call history storage

---

## Project Structure

```
aura-ai-voice-agent/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── VoiceAgent.jsx
│       │   ├── Transcript.jsx
│       │   ├── OrderHelper.jsx
│       │   └── CallSummary.jsx
│       ├── api.js
│       ├── voice.js
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
├── backend/
│   ├── main.py
│   ├── agent.py
│   ├── tools.py
│   ├── prompts.py
│   ├── orders.json
│   ├── requirements.txt
│   └── .env.example
├── README.md
└── .gitignore
```

## Interview Questions

**Q1. Why did you choose this architecture and technology stack?**

I optimised for a working, reliable demo in 1.5 days. Browser speech APIs removed the need for any voice vendor, audio streaming or extra keys. A stateless FastAPI backend with one LLM call loop and one tool is simple to deploy, test and explain. Gemini through an OpenAI-compatible interface gave free, fast tool calling, and the voice layer is isolated in one file so it can be upgraded without touching the agent. The tradeoff is voice quality and Chrome-only support, which I accepted knowingly.

**Q2. What was the most difficult part and how did you solve it?**

Making the voice loop reliable and keeping the agent grounded. For the loop, I modelled the call as an explicit state machine (idle, listening, thinking, speaking) with refs to avoid stale async state, a busy guard to block overlapping turns, and recognition paused while Aria speaks so she does not hear herself. For grounding, I forced all order facts to come from the tool result, normalised spoken order IDs (speech often drops hyphens), returned a structured "not found" result, and wrote explicit policy rules into the prompt.

**Q3. If you had one more week, what would you improve first and why?**

Voice quality and latency. That is what customers feel most. I would move to streaming speech-to-text and text-to-speech with a provider such as Deepgram and ElevenLabs, stream LLM tokens so Aria starts speaking sooner, and add barge-in. Second, I would build an automated evaluation set for policy compliance, so prompt changes can be tested instead of judged by hand.

**Q4. What would need to change if the agent handled 1,000 customer conversations per day?**

- **Infrastructure:** paid always-on hosting with autoscaling and no cold starts, plus rate limiting and authentication.
- **Voice:** streaming speech services over WebSockets, which scale and perform better than browser speech.
- **State and data:** server-side sessions in Redis, a real database for orders, and Postgres for transcripts and summaries.
- **LLM:** a paid tier with higher rate limits, retries and timeouts, plus fallback models, token and cost monitoring, and prompt caching.
- **Quality and safety:** logging, tracing and dashboards for latency, resolution rate and tool errors, automated policy evals, PII handling, and human escalation for cases the agent cannot resolve.

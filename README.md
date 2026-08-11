# Job Hunt Assistant

A full-stack rebuild of the original Streamlit prototype: React frontend, Node/Express
API, MongoDB for persistence, Redis for caching and queueing, and a Python (FastAPI)
service for the Gemini calls. Job data comes from the Adzuna API (covers India) instead
of scraping Naukri/Internshala, which have no public search API and disallow scraping
in their terms of service.

## Architecture

```
React client -> Node/Express API -> MongoDB (users, resumes, analyses)
                                  -> Redis (cache + BullMQ queue)
                                       -> analysis worker -> Python AI service -> Gemini
```

- **Search** hits Adzuna directly from the API layer and caches results in Redis for 15
  minutes, keyed by keyword + location + page, so repeated searches don't re-hit the
  provider.
- **Analysis** (job-description breakdown, resume tailoring, cover letter) is not run
  inline on the request. The API enqueues a BullMQ job and returns immediately; a
  separate worker process picks it up, calls the AI service, and writes the result back
  to MongoDB. This keeps a single slow Gemini call from blocking the API, and lets the
  worker scale independently.
- **Live status** reaches the browser two ways: the worker publishes status changes on
  a Redis channel that the API process re-emits over Socket.IO, and the client also
  polls as a fallback in case a socket message is missed.
- **ATS keyword scoring** is deterministic string matching, not an LLM call - it's
  free and instant, and there's no reason to spend a Gemini call on substring matching.

## What changed from the Streamlit prototype

- State moved from `st.session_state` into MongoDB, so nothing is lost on refresh and
  documents belong to an actual user account (JWT auth added).
- The CrewAI agent + regex JSON extraction + three-deep fallback (`kickoff()` ->
  `Task.execute()` -> raw `llm.invoke()`) was replaced with direct calls to Gemini using
  `response_schema` for structured JSON output. A single agent doing JSON extraction
  doesn't need a multi-agent framework, and constrained decoding removes the need to
  parse or fall back at all.
- USAJOBS was replaced with Adzuna, which has real coverage in India and a documented
  public API, instead of scraping Naukri/Internshala.
- Added an interview-prep AI call (likely questions, gaps between resume and job
  requirements, prep tips) alongside the resume/cover-letter generation, since it was
  a real section in the original prototype and is a genuinely separate task from
  document tailoring.
- The UI is organized as independent workspaces (job postings, resume, job analysis,
  documents, interview prep) in a sidebar, not a forced linear wizard. Analysis still
  depends on having a job and resume selected - that's a real constraint - but each
  section is reachable at any time and just tells you inline what it's waiting on,
  rather than gating navigation.
- Migrated the AI service from raw `google-genai` calls to LangChain (`with_structured_output`
  against Pydantic schemas), with retry/backoff on transient failures, a configurable
  timeout, and structured logging. Added a shared internal token between Node and the
  AI service so it isn't callable by anything else on the network.
- Added a match score generator: resume and job description are embedded (Gemini
  embeddings via LangChain), combined with cosine similarity into a semantic score,
  and blended with the existing keyword score into `matchScore`. Resume embeddings are
  cached on the `Resume` document so repeat matches against the same resume don't
  re-embed identical text. If embedding fails, analysis still completes with the
  keyword-only score rather than failing the whole job.
- Extended the ATS scorer with three deterministic (no-LLM) checks: exact multi-word
  phrase matching (tracked separately from partial keyword hits, since verbatim phrase
  matches correlate much more strongly with ATS callbacks), job title match location
  (header vs. body vs. absent), and keyword-stuffing detection (flags terms repeated
  suspiciously often relative to document length).
- Replaced the fixed question-list mock interview with a **LangGraph-driven interview
  orchestrator** in the AI service. Each answer runs through a state graph that
  evaluates the response, then routes to a probing follow-up (weak answer), a
  dynamically generated next question (grounded in the resume, job requirements, and
  topics already covered), or the final report. When the interview ends, the graph
  produces a detailed report card: overall score, strengths/weaknesses, topics
  answered vs. missed, per-question breakdown, and recommendations.

## Frontend

React + Vite, Tailwind, `react-router-dom` (routes: `/`, `/search`, `/resume`,
`/analysis`, `/interview`). Job selection and the active analysis id are bridged
between pages via `localStorage` (`jobai-selected-job`, `jobai-analysis-id`) rather
than prop drilling, since each page is a separate route. The mock interview runs
through the browser's Web Speech API - the interviewer's questions are spoken aloud
(`speechSynthesis`) and answers are captured by voice (`SpeechRecognition`, Chrome/Edge
only as of this writing).

## Testing

```bash
cd backend && npm test
```

Covers the deterministic scoring logic (`atsScorer.js`, `scoring.js`) with `node:test`.
The LLM-calling chains in the AI service aren't unit tested here - that would need
mocked model responses or recorded fixtures, which is a reasonable next step but out
of scope for what's built so far.

## Running locally

```bash
cp backend/.env.example backend/.env       # fill in ADZUNA_APP_ID / ADZUNA_APP_KEY / JWT_SECRET
cp ai-service/.env.example ai-service/.env # fill in GEMINI_API_KEY
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:4000
- AI service: http://localhost:8000/health

Get Adzuna keys at https://developer.adzuna.com/. Get a Gemini key at
https://aistudio.google.com/apikey.

## Running without Docker

```bash
# terminal 1
cd backend && npm install && npm start

# terminal 2 - separate process, this is what makes analysis async
cd backend && npm run worker

# terminal 3
cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --reload

# terminal 4
cd frontend && npm install && npm run dev
```

You'll need MongoDB and Redis running locally (or point `MONGO_URI` / `REDIS_URL` in
`backend/.env` at hosted instances).

## Known gaps / next steps

- No semantic (embedding-based) job matching yet - search is still keyword-based via
  Adzuna's own query params. Adding a vector store and embedding both the resume and
  job descriptions is the natural next step.
- No rate limiting on the Adzuna/Gemini calls beyond Redis caching - a token-bucket
  limiter per user would be needed before this saw real traffic. *(Done: search and
  analysis endpoints now use a Redis-backed token-bucket limiter keyed by user id,
  with per-user buckets so one user can't exhaust a shared IP bucket.)*
- No retry/backoff on BullMQ jobs - a failed analysis currently just marks the record
  `failed`; adding `attempts` + `backoff` to the queue job would make transient AI
  service errors self-heal. *(Done: analysis jobs now retry up to 3 times with
  exponential backoff, and the record is only marked `failed` after the final attempt.)*

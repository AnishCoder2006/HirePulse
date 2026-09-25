# 🚀 HirePulse — AI-Powered Job Search & Resume Assistant

[![Live Application](https://img.shields.io/badge/Live_App-hire--pulse--ruddy.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://hire-pulse-ruddy.vercel.app/)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61dafb?style=flat&logo=react)](https://hire-pulse-ruddy.vercel.app/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_%2B_Express-339933?style=flat&logo=nodedotjs)](https://hire-pulse-ruddy.vercel.app/)
[![Python](https://img.shields.io/badge/AI_Service-Python_%2B_FastAPI-3776AB?style=flat&logo=python)](https://hire-pulse-ruddy.vercel.app/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat&logo=mongodb)](https://hire-pulse-ruddy.vercel.app/)
[![Redis](https://img.shields.io/badge/Cache-Redis_%2B_BullMQ-DC382D?style=flat&logo=redis)](https://hire-pulse-ruddy.vercel.app/)

**HirePulse** is a state-of-the-art, full-stack AI career platform designed to automate and optimize the entire job application lifecycle. It combines real-time job discovery (via Adzuna API), a dual ATS match scoring engine (deterministic keyword matching + vector semantic embeddings), automated resume tailoring, cover letter generation, STAR method story crafting, and an interactive **LangGraph-driven voice mock interview system**.

🔗 **Live Platform URL**: [https://hire-pulse-ruddy.vercel.app/](https://hire-pulse-ruddy.vercel.app/)

---

## 🌟 Key Features

### 🔍 1. Real-Time Job Search Engine
- Integrated directly with the **Adzuna API** with full coverage across India and international regions.
- High-performance **Redis response caching** (15-minute TTL) keyed by query parameters to minimize external API latency and quota consumption.
- Per-user rate-limited search endpoints to protect against query exhaustion.

### 🎯 2. Dual-Layer ATS Match Engine
- **Deterministic Keyword Parser**: Instant substring and exact multi-word phrase extraction (verbatim matches carry highest weight in modern ATS software).
- **Semantic Vector Embedding**: Uses embedding models (`text-embedding-004` / HuggingFace `all-MiniLM-L6-v2`) and cosine similarity to compute true contextual alignment between resume and job description.
- **Job Title Verification**: Detects title placement (Header vs. Body vs. Scattered terms) to evaluate first-impression relevance.
- **Keyword Stuffing Detector**: Flags suspicious term repetition ratios relative to document length.

### 🤖 3. Resilient Multi-Provider AI Architecture
- **LangChain Structured Output**: Uses strict Pydantic schemas for reliable JSON extraction without flaky parsing or regex workarounds.
- **Multi-Provider Fallback (Groq + Gemini)**: Automatically routes requests to primary models (`gemini-3.8-flash`, `qwen/qwen3.8-27b`, `openai/gpt-oss-120b`).
- **Automatic 429 & 404 Recovery**: If a primary LLM hits rate limits (429) or deprecated model routes (404), the service seamlessly switches to active fallback models (`gemini-3.5-flash-lite`, `openai/gpt-oss-20b`) with exponential backoff.

### ✍️ 4. AI Document Tailoring & STAR Story Generator
- **Resume Tailor**: Rewrites bullet points to highlight missing keywords and contextual phrasing matching target postings.
- **Cover Letter Generator**: Drafts compelling, role-specific cover letters emphasizing candidate strengths and positioning strategies.
- **STAR Story Builder**: Transforms raw experience into structured **Situation, Task, Action, Result** narratives ideal for behavioral interviews.

### 🎙️ 5. LangGraph Voice-Enabled Mock Interview
- **Dynamic Orchestration**: Built with a state graph that evaluates user responses in real-time, probes deeper on weak answers, asks contextually relevant follow-up questions, or routes to final scoring.
- **Voice Synthesis & Speech Recognition**: Full Web Speech API integration (`speechSynthesis` for questions, `SpeechRecognition` for candidate spoken answers).
- **Comprehensive Score Card**: Generates an overall score, strengths/weaknesses breakdown, topics covered/missed, per-question evaluations, and actionable recommendations.

### 📄 6. One-Click PDF Export & Live Progress
- Export deep ATS match reports, tailored resumes, and interview prep sheets into PDF documents.
- Background asynchronous queueing via **BullMQ + Redis** with real-time browser updates via **Socket.IO** and fallback polling.

---

## 🏗️ System Architecture

```text
React Client (Vercel) ──► Node.js / Express API ──► MongoDB (Users, Resumes, Analyses)
                                  │
                                  ├─► Redis Cache (Search queries & Rate limit buckets)
                                  │
                                  └─► BullMQ Queue ──► Analysis Worker Process
                                                             │
                                                             ▼
                                                    Python FastAPI Service
                                                             │
                                                    ┌────────┴────────┐
                                                    ▼                 ▼
                                                Groq LLM        Gemini LLM
                                           (Qwen 27B / GPT)   (Flash 3.8 / 3.5)
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, Framer Motion, Lucide Icons, Web Speech API |
| **Backend API** | Node.js, Express.js, JWT Authentication, Socket.IO, BullMQ, Express Rate Limit |
| **AI Service** | Python 3.12, FastAPI, LangChain, LangGraph, Pydantic, Tenacity |
| **AI Providers** | Groq (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`), Google Gemini (`gemini-3.8-flash`, `gemini-3.5-flash-lite`) |
| **Database & Cache**| MongoDB Atlas / Local, Redis (Cache, Queues, Pub/Sub channels) |
| **Deployment** | Vercel (Frontend), Render / Railway (Backend & AI Service), GitHub Actions CI/CD |

---

## 🚀 CI/CD Automated Deployment

This repository uses an automated **GitHub Actions CI/CD pipeline** ([.github/workflows/deploy.yml](file:///.github/workflows/deploy.yml)) that deploys the frontend directly to Vercel Production using the official Vercel CLI upon pushing to `main`:

```yaml
- name: Install Vercel CLI
  run: npm install --global vercel@latest

- name: Pull Vercel Environment Information
  run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
  working-directory: ./frontend

- name: Build Project Artifacts
  run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
  working-directory: ./frontend

- name: Deploy Project Artifacts to Vercel
  run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
  working-directory: ./frontend
```

---

## 💻 Running Locally

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB and Redis (or Docker)

### Option A: Running with Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/AnishCoder2006/HirePulse.git
   cd HirePulse
   ```

2. Configure environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp ai-service/.env.example ai-service/app/.env
   ```

3. Launch all services:
   ```bash
   docker compose up --build
   ```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`
- **AI Service Health**: `http://localhost:8000/health`

---

### Option B: Manual Service Execution

```bash
# Terminal 1: Node API Server
cd backend && npm install && npm start

# Terminal 2: BullMQ Async Worker
cd backend && npm run worker

# Terminal 3: Python AI Service
cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --reload

# Terminal 4: React Vite Frontend
cd frontend && npm install && npm run dev
```

---

## 🔑 Environment Configuration

### `backend/.env`
```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/jobhunt
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secure-jwt-secret
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TOKEN=dev-token
```

### `ai-service/app/.env`
```env
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=qwen/qwen3.8-27b
GROQ_FALLBACK_MODEL=openai/gpt-oss-20b
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
INTERNAL_SERVICE_TOKEN=dev-token
```

---

## 👨‍💻 Author & Maintainer

Developed with ❤️ by **AnishCoder2006**  
- **GitHub**: [@AnishCoder2006](https://github.com/AnishCoder2006)
- **Live Demo**: [hire-pulse-ruddy.vercel.app](https://hire-pulse-ruddy.vercel.app/)

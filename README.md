# 🧠 AI Codebase Understanding Engine

Query any codebase using natural language — powered by RAG, Ollama embeddings, and Gemini.

## Architecture

```
frontend (Next.js 14)       → UI + project management        → localhost:3000
backend-api (Node/Express)  → REST API, queue, caching       → localhost:3001
ai-service (FastAPI)        → Embeddings, vector search, LLM → localhost:8001
Ollama                      → Local embeddings (nomic-embed-text)
ChromaDB                    → Vector storage (local)
Redis                       → BullMQ queue + cache
```

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.10+
- Redis (`brew install redis && brew services start redis` on Mac)
- Ollama (`https://ollama.com` → install → `ollama pull nomic-embed-text`)
- Gemini API key — free at `https://aistudio.google.com/app/apikey`

n terminal run: ollama pull nomic-embed-text

# AI Service
- cd ai-service
- python3 -m venv venv
- cp .env.example .env 
- source venv/bin/activate
- pip install -r requirements.txt
- Open .env → set GEMINI_API_KEY and INTERNAL_API_KEY
- uvicorn main:app --reload --port 8001

# Backend
- cd backend-api
- npm install
- cp .env.example .env
- Open .env → set same INTERNAL_API_KEY, REDIS_URL=redis://localhost:6379
- npm run dev

# Frontend
- cd frontend
- npm install
- cp .env.example .env.local
- npm run dev


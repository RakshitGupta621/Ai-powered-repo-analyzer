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

### 1. AI Service
```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # Add GEMINI_API_KEY and INTERNAL_API_KEY
uvicorn main:app --reload --port 8001
```

### 2. Backend API
```bash
cd backend-api
npm install
cp .env.example .env       # Add same INTERNAL_API_KEY, set REDIS_URL
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Environment Variables

### ai-service/.env
```
GEMINI_API_KEY=your_key        # From aistudio.google.com
INTERNAL_API_KEY=same_secret   # Any random string, must match backend
EMBEDDING_PROVIDER=ollama      # ollama | huggingface | gemini
```

### backend-api/.env
```
INTERNAL_API_KEY=same_secret   # Must match ai-service
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8001
```

## Verify Everything Works

```bash
curl localhost:3001/health          # Node API
curl localhost:8001/health          # FastAPI + Ollama + ChromaDB
curl localhost:11434/api/tags       # Ollama (should show nomic-embed-text)
```

## Stack
- **Embeddings**: Ollama `nomic-embed-text` (local, free, 768-dim)
- **LLM**: Gemini 2.5 Flash (free tier, 1500 req/day)
- **Vector DB**: ChromaDB (local persistent)
- **Queue**: BullMQ + Redis
- **Cache**: Redis (query result caching)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DailyUp is an AI-powered personalized learning platform. Users create learning projects with goals/background, and four AI agent roles (Plan Architect, Content Tutor, Assessment Designer, Answer Evaluator) generate structured plans, stream learning materials, create assessments, and evaluate answers. All AI content is delivered via SSE streaming.

## Commands

### Backend (Python/FastAPI)

```bash
# Install dependencies (creates venv automatically)
cd backend && uv sync

# Run dev server (port 8000)
cd backend && uv run uvicorn app.main:app --reload

# Run all tests
cd backend && uv run pytest

# Run a single test file
cd backend && uv run pytest tests/test_projects.py

# Run a specific test
cd backend && uv run pytest tests/test_projects.py::test_create_project -v
```

### Frontend (React/Vite/TypeScript)

```bash
# Install dependencies
cd frontend && npm install

# Run dev server (port 5173, proxies /api to localhost:8000)
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Run tests
cd frontend && npm run test
```

## Architecture

### Backend (`backend/`)

Layered architecture: **Routes → Schemas → AI Services → OpenAI SDK → SQLite**

- **`app/main.py`** — FastAPI app with lifespan-based DB init and CORS for `localhost:5173`
- **`app/api/`** — REST endpoints. `plans.py` and `chapters.py` return `StreamingResponse` (SSE)
- **`app/models/__init__.py`** — All SQLAlchemy models in one file: `LLMSettings` (singleton, id=1), `LearningProject → LearningPlan → Chapter → LearningMaterial/Assessment`
- **`app/schemas/__init__.py`** — All Pydantic request/response schemas in one file
- **`app/services/ai_service.py`** — Core orchestrator. `AIService` class wraps `AsyncOpenAI` client and implements four agent methods with SSE streaming
- **`app/services/context_builder.py`** — Queries DB to build "learning memory" (completed chapters, scores, weak areas) for AI personalization
- **`app/services/output_parser.py`** — 3-level JSON extraction fallback: (1) `json_schema` response format, (2) `json_object` mode, (3) regex extraction + smart retry with error feedback
- **`app/services/prompts/`** — System/user prompt templates for each agent role, with expected JSON schemas
- **`app/database.py`** — Async SQLAlchemy engine with aiosqlite. Tables auto-created on startup via `create_all()`

No migration system (Alembic). Schema changes require manual DB recreation.

### Frontend (`frontend/src/`)

React 19 SPA with file-based page routing and Zustand stores.

- **`pages/`** — Route components: Home → CreateProject → ProjectDetail → ChapterLearning → ChapterAssessment, plus Settings
- **`stores/`** — Zustand stores: `projectStore` (CRUD), `planStore` (generation + fetch), `settingsStore` (LLM config + verification), `streamStore` (SSE content with cursor animation)
- **`services/api.ts`** — Typed REST client for all backend endpoints
- **`services/sse.ts`** — SSE client that parses `chunk`, `progress`, `done`, `error` event types
- **`components/ui/`** — shadcn/ui primitives (new-york style, CSS variables)
- **`components/`** — Domain components (AssessmentForm, ChapterList, StreamingContent, MarkdownRenderer, etc.)

Path alias: `@/*` maps to `./src/*`.

### Key Patterns

- **SSE protocol**: Backend yields `data: {"type": "chunk|progress|done|error", ...}\n\n`. Frontend `sse.ts` parses these into callbacks.
- **LLM settings are DB-stored** (not env vars): `LLMSettings` singleton at id=1 holds `api_key`, `base_url`, `model_name`. The Settings page configures these, and `LLMGuard` component blocks AI features until configured.
- **Tests use Hypothesis** for property-based testing on the backend. pytest is configured with `asyncio_mode = auto`.
- **Frontend testing** uses Vitest + Testing Library + fast-check (property-based).

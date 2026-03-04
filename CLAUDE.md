# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DailyUp is an AI-powered personalized learning platform. Users create learning projects with goals/background, and four AI agent roles (Plan Architect, Content Tutor, Assessment Designer, Answer Evaluator) generate structured plans, stream learning materials, create assessments, and evaluate answers. All AI content is delivered via SSE streaming.

## Commands

### Quick Start (Makefile)

```bash
make install        # Install all dependencies (backend + frontend)
make dev            # Run backend + frontend concurrently
make test           # Run all tests (backend + frontend)
make dev-backend    # Run backend only (port 8000)
make dev-frontend   # Run frontend only (port 5173)
make clean          # Remove venvs, node_modules, dist, __pycache__, .hypothesis, *.db
make build          # Production frontend build
```

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

# Run tests (no test script in package.json; use vitest directly)
cd frontend && npx vitest run
```

## Architecture

### Backend (`backend/`)

Layered architecture: **Routes → Schemas → AI Services → OpenAI SDK → SQLite**

- **`app/main.py`** — FastAPI app with lifespan-based DB init and CORS for `localhost:5173`
- **`app/api/`** — REST endpoints. `plans.py` and `chapters.py` return `StreamingResponse` (SSE). Also includes `projects.py` (CRUD), `assessments.py` (assessment generation + evaluation), `settings.py` (LLM config)
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
- **`lib/utils.ts`** — `cn()` helper for merging Tailwind classes (clsx + tailwind-merge)
- **`types/index.ts`** — Shared TypeScript interfaces
- **`test/setup.ts`** — Vitest global setup (jsdom environment, Testing Library matchers)

Path alias: `@/*` maps to `./src/*`.

### Key Patterns

- **SSE protocol**: Backend yields `data: {"type": "chunk|progress|done|error", ...}\n\n`. Frontend `sse.ts` parses these into callbacks.
- **LLM settings are DB-stored** (not env vars): `LLMSettings` singleton at id=1 holds `api_key`, `base_url`, `model_name`. The Settings page configures these, and `LLMGuard` component blocks AI features until configured.
- **Tests use Hypothesis** for property-based testing on the backend. pytest is configured with `asyncio_mode = auto`.
- **Frontend testing** uses Vitest + Testing Library + fast-check (property-based).

### Gotchas

- **No `npm run test`**: Frontend has no `test` script in package.json. Use `npx vitest run` or `make test`.
- **DB reset**: SQLite files (`*.db`) live in `backend/`. Delete them or run `make clean` to reset. No migrations — schema changes require DB recreation.
- **Vitest config**: Tests use `jsdom` environment with globals enabled. Setup file at `src/test/setup.ts` registers Testing Library matchers.
- **CORS**: Backend only allows `localhost:5173`. If you change the frontend port, update `app/main.py`.

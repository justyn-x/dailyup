# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
make dev              # Vite dev server (port 1420)
make tauri            # Tauri desktop dev (compiles Rust + launches app)
make build            # Frontend production build (tsc -b && vite build)
make tauri-build      # Tauri release package
make tauri-build-debug # Debug mode build (faster, for testing packaging)
make typecheck        # TypeScript type check only
make clean            # Remove dist/ and src-tauri/target/
make clean-all        # Above + node_modules + lockfile
make install          # pnpm install
make version          # Check version consistency across package.json / tauri.conf.json / Cargo.toml
make bump V=x.y.z    # Bump version in all three files
```

No test framework is configured yet.

## Releasing

Version lives in three files that must stay in sync: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`.

```bash
make bump V=0.2.0
git add -A && git commit -m "chore: bump version to 0.2.0"
git tag v0.2.0
git push origin main --tags   # triggers CI → builds macOS (arm64 + x64) + Windows → GitHub Release
```

- **Local build**: `make tauri-build` produces `src-tauri/target/release/bundle/dmg/*.dmg` (macOS)
- **CI**: `.github/workflows/release.yml` runs on `v*` tags — creates a draft release, builds all platforms in parallel, then publishes
- **No code signing** is configured (personal project); macOS users will need to right-click → Open on first launch

## Architecture

DailyUp is an AI-driven learning planner. Users describe a learning goal, AI generates a chapter plan, streams personalized learning materials, and creates assessments. All data is local (IndexedDB), all AI calls go directly to the user's own OpenAI-compatible API.

### Runtime Stack

- **Tauri 2.0** desktop shell wrapping a React 19 SPA
- **Dexie.js** for IndexedDB (tables: `projects`, `chapters`)
- **Zustand** stores with `persist` middleware for config/profile → localStorage
- **Vercel AI SDK** (`streamText` / `generateText` + `Output.object()` with Zod schemas) for LLM calls
- **Tailwind CSS 4** — CSS-first config via `@theme` in `src/index.css`, no `tailwind.config`

### CORS Proxy (Dev Mode)

In dev mode, LLM API calls route through a Vite middleware plugin (`llmProxyPlugin` in `vite.config.ts`). The frontend sends requests to `/llm-proxy` with an `X-Target-URL` header containing the real API endpoint. The proxy forwards the request, handles streaming, and strips duplicate CORS headers. This is necessary because Tauri dev mode loads from `http://localhost:1420`.

### Streaming Markdown (MaterialPage)

`src/pages/MaterialPage.tsx` uses a high-performance pattern to render streaming LLM output:
- A `requestAnimationFrame` loop reads from a ref buffer and calls `marked.parse()` → `innerHTML` directly on a DOM ref
- Zero React re-renders during streaming; React only renders the final HTML via `dangerouslySetInnerHTML` after the stream completes
- `marked` (not `react-markdown`) is used for both streaming and final render

### AI Service (`src/services/ai.ts`)

Four functions, all single-turn LLM calls:
- `generatePlan` — structured output (`generateText` + Zod `planSchema`) → chapter list
- `generateMaterial` — streaming (`streamText`) → markdown text
- `generateAssessment` — structured output (`generateText` + Zod `assessmentSchema`) → quiz questions
- `testConnection` — lightweight ping

The provider factory uses `@ai-sdk/openai-compatible` with a custom `fetch` that rewrites URLs for the CORS proxy.

### Data Flow

```
Zustand stores (localStorage)     Dexie (IndexedDB)
├── llmConfigStore (API config)   ├── projects: id, goal, background, skills, planStatus
└── profileStore (nickname/avatar)└── chapters: id, projectId, orderIndex, title, material, assessment, status
```

Dexie hooks (`useLiveQuery`) in `src/hooks/` provide reactive data binding — components auto-update when DB changes.

### Routing

All 9 routes are nested under `<DesktopLayout>` (sidebar + scrollable main area) in `src/App.tsx`. Key routes: `/create`, `/project/:id`, `/project/:pid/chapter/:cid/material`, `/project/:pid/chapter/:cid/assessment`.

### UI Language

The entire UI and all AI prompts are in Chinese (简体中文).

## Key Conventions

- **IDs**: `crypto.randomUUID()` via `src/lib/utils.ts`
- **Prompts**: System prompts and user prompt builders live in `src/lib/prompts.ts`
- **Schemas**: Zod schemas for AI structured output in `src/schemas/index.ts`
- **TypeScript**: Strict mode with `noUnusedLocals` and `noUnusedParameters`
- **Package manager**: pnpm
- **Styling**: Tailwind utility classes; custom animations and `.material-content` markdown styles defined in `src/index.css`

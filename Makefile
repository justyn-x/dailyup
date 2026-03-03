.PHONY: install dev dev-backend dev-frontend test test-backend test-frontend clean build

install:
	cd backend && uv sync
	cd frontend && npm install

dev:
	@trap 'kill 0' INT TERM; \
	cd backend && uv run uvicorn app.main:app --reload & \
	cd frontend && npm run dev & \
	wait

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload

dev-frontend:
	cd frontend && npm run dev

test: test-backend test-frontend

test-backend:
	cd backend && uv run pytest

test-frontend:
	cd frontend && npx vitest run

clean:
	rm -rf backend/.venv frontend/node_modules frontend/dist
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -f backend/*.db

build:
	cd frontend && npm run build

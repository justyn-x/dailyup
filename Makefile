.PHONY: dev tauri build tauri-build install clean clean-all lint typecheck

# Development
dev:
	pnpm dev

tauri:
	pnpm tauri dev

# Build
build:
	pnpm build

tauri-build:
	pnpm tauri build

# Setup
install:
	pnpm install

# Quality
typecheck:
	pnpm exec tsc -b

# Clean
clean:
	rm -rf dist
	rm -rf src-tauri/target

clean-all: clean
	rm -rf node_modules
	rm -f pnpm-lock.yaml

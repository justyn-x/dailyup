.PHONY: dev tauri build tauri-build tauri-build-debug install clean clean-all typecheck check-pnpm check-rust version bump

# Dependency checks
check-pnpm:
	@command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is not installed. Install via: curl -fsSL https://get.pnpm.io/install.sh | sh -"; exit 1; }

check-rust:
	@command -v cargo >/dev/null 2>&1 || { echo "Error: Rust is not installed. Install via: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"; exit 1; }

# Development
dev: check-pnpm
	pnpm dev

tauri: check-pnpm check-rust
	pnpm tauri dev

# Build
build: check-pnpm
	pnpm build

tauri-build: check-pnpm check-rust
	pnpm tauri build

tauri-build-debug: check-pnpm check-rust
	pnpm tauri build --debug

# Setup
install: check-pnpm
	pnpm install

# Quality
typecheck: check-pnpm
	pnpm exec tsc -b

# Version management
version:
	@echo "package.json:      $$(grep '"version"' package.json | head -1 | sed 's/.*: "//;s/".*//')"
	@echo "tauri.conf.json:   $$(grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*: "//;s/".*//')"
	@echo "Cargo.toml:        $$(grep '^version' src-tauri/Cargo.toml | head -1 | sed 's/.*= "//;s/".*//')"

bump:
	@test -n "$(V)" || { echo "Usage: make bump V=x.y.z"; exit 1; }
	bash scripts/bump-version.sh $(V)

# Clean
clean:
	rm -rf dist
	rm -rf src-tauri/target

clean-all: clean
	rm -rf node_modules
	rm -f pnpm-lock.yaml

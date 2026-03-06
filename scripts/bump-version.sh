#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?Usage: bump-version.sh <version>  (e.g. 0.2.0)}"

# Strip leading 'v' if present
VERSION="${VERSION#v}"

# Validate semver format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be semver (x.y.z), got: $VERSION"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Bumping version to $VERSION ..."

# 1. package.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT/package.json"
echo "  Updated package.json"

# 2. src-tauri/tauri.conf.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT/src-tauri/tauri.conf.json"
echo "  Updated src-tauri/tauri.conf.json"

# 3. src-tauri/Cargo.toml (only the package version, not dependency versions)
sed -i '' '/^\[package\]/,/^\[/{s/^version = "[^"]*"/version = "'"$VERSION"'"/;}' "$ROOT/src-tauri/Cargo.toml"
echo "  Updated src-tauri/Cargo.toml"

echo ""
echo "Done! Next steps:"
echo "  git add -A && git commit -m \"chore: bump version to $VERSION\""
echo "  git tag v$VERSION"
echo "  git push origin main --tags"

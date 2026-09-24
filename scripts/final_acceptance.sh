#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Ensure .venv is used if present or created if pytest is missing
if [ -d "$ROOT/.venv" ]; then
  export PATH="$ROOT/.venv/bin:$PATH"
elif ! command -v pytest >/dev/null 2>&1; then
  echo "Setting up Python virtual environment (.venv)..."
  python3 -m venv "$ROOT/.venv"
  "$ROOT/.venv/bin/pip" install -q -r "$ROOT/requirements.txt"
  export PATH="$ROOT/.venv/bin:$PATH"
fi

echo "=== Astro Vega V1.7 Final Acceptance Gate ==="
echo "[1/7] Python reference + corpus"
pytest -q

echo "[2/7] Corpus structural validation"
python validation/validate_corpus.py

echo "[3/7] Web dependency presence"
cd web
if [ ! -d node_modules ]; then
  echo "BLOCKED: web/node_modules absent. Run: npm install --no-audit --no-fund"
  exit 2
fi

echo "[4/7] TypeScript deterministic/profile/provider tests"
npm run test:all

echo "[5/7] Real Swiss/Moshier WASM numerical gate"
npm run test:wasm-real

echo "[6/7] Typecheck"
npm run typecheck

echo "[7/7] Production build"
npm run build

echo "=== PASS: V1.7 acceptance gate complete ==="

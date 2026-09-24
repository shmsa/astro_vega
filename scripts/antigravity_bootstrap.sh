#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Ensure Python venv and requirements are installed
if [ ! -d "$ROOT/.venv" ]; then
  echo "Creating .venv in $ROOT..."
  python3 -m venv "$ROOT/.venv"
fi
"$ROOT/.venv/bin/pip" install -q -r "$ROOT/requirements.txt"
export PATH="$ROOT/.venv/bin:$PATH"

cd "$ROOT/web"
node --version
npm --version
npm install --no-audit --no-fund
cd "$ROOT"
./scripts/final_acceptance.sh

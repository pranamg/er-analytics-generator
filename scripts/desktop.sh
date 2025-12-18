#!/bin/bash
# Run the desktop app in development mode

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Setup PATH
if [ -d "$HOME/.nodejs/bin" ]; then
    export PATH="$HOME/.nodejs/bin:$PATH"
fi

cd "$PROJECT_DIR"

echo "Starting ER Analytics Generator Desktop App..."
echo "Open http://localhost:5173 in your browser"
echo ""

pnpm --filter @er-analytics/desktop dev

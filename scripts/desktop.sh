#!/bin/bash
# Run the desktop app in development mode (web-based)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Setup PATH
if [ -d "$HOME/.nodejs/bin" ]; then
    export PATH="$HOME/.nodejs/bin:$PATH"
fi

cd "$PROJECT_DIR"

echo "Starting ER Analytics Generator..."
echo ""
echo "  Backend API: http://localhost:3001"
echo "  Frontend UI: http://localhost:5173"
echo ""
echo "Open http://localhost:5173 in your browser"
echo ""

# Run server + frontend concurrently
pnpm --filter @er-analytics/desktop start

#!/bin/bash
# Setup script for ER Analytics Generator

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NODE_DIR="$HOME/.nodejs"

echo "=== ER Analytics Generator Setup ==="

# Check/Install Node.js
if [ -x "$NODE_DIR/bin/node" ]; then
    echo "✓ Node.js found at $NODE_DIR"
    export PATH="$NODE_DIR/bin:$PATH"
elif command -v node &> /dev/null; then
    echo "✓ Node.js found in PATH"
else
    echo "Installing Node.js..."
    cd "$HOME"
    wget -q https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz -O node.tar.xz
    tar -xf node.tar.xz
    rm node.tar.xz
    mv node-v20.18.0-linux-x64 .nodejs
    export PATH="$NODE_DIR/bin:$PATH"
    echo "✓ Node.js installed"
fi

# Check/Install pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
    echo "✓ pnpm installed"
else
    echo "✓ pnpm found"
fi

# Install dependencies
cd "$PROJECT_DIR"
echo "Installing dependencies..."
pnpm install

# Build packages
echo "Building packages..."
pnpm build

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Add this to your ~/.bashrc or ~/.profile:"
echo "  export PATH=\"\$HOME/.nodejs/bin:\$PATH\""
echo ""
echo "Then run: ./scripts/parse.sh <image-path>"

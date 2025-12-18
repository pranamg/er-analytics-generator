#!/bin/bash
# Parse an ER diagram image

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Setup PATH
if [ -d "$HOME/.nodejs/bin" ]; then
    export PATH="$HOME/.nodejs/bin:$PATH"
fi

# Load environment
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Default values
PROVIDER="${DEFAULT_AI_PROVIDER:-gemini}"
OUTPUT="$PROJECT_DIR/outputs/schema.json"
VALIDATE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--provider)
            PROVIDER="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT="$2"
            shift 2
            ;;
        -v|--validate)
            VALIDATE="-v"
            shift
            ;;
        -h|--help)
            echo "Usage: parse.sh <image-path> [options]"
            echo ""
            echo "Options:"
            echo "  -p, --provider <name>  AI provider (claude|gemini|openai)"
            echo "  -o, --output <path>    Output path for schema JSON"
            echo "  -v, --validate         Validate parsed schema"
            echo "  -h, --help             Show this help"
            exit 0
            ;;
        *)
            IMAGE="$1"
            shift
            ;;
    esac
done

if [ -z "$IMAGE" ]; then
    echo "Error: No image path provided"
    echo "Usage: parse.sh <image-path> [options]"
    exit 1
fi

if [ ! -f "$IMAGE" ]; then
    echo "Error: Image file not found: $IMAGE"
    exit 1
fi

cd "$PROJECT_DIR"
node packages/er-parser/dist/cli.js "$IMAGE" -p "$PROVIDER" -o "$OUTPUT" $VALIDATE

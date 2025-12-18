# Getting Started with ER Analytics Generator

## Prerequisites

- Node.js v18+ (automatically installed in `~/.nodejs` if not present)
- API key for one of: Claude (Anthropic), Gemini (Google), or OpenAI

## Quick Start

### 1. Setup Environment

```bash
cd /home/pranamg/er-analytics-generator

# Copy environment template and add your API key
cp .env.example .env
# Edit .env and add your API key (GOOGLE_AI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY)
```

### 2. Install Dependencies

```bash
# Use the setup script (recommended)
./scripts/setup.sh

# Or manually:
export PATH="$HOME/.nodejs/bin:$PATH"
pnpm install
pnpm build
```

### 3. Parse an ER Diagram

```bash
# Using helper script (recommended)
./scripts/parse.sh examples/advertising_agencies_model.gif

# Or manually:
export PATH="$HOME/.nodejs/bin:$PATH"
node packages/er-parser/dist/cli.js <image-path> -p gemini -o outputs/schema.json -v
```

### 4. Run Full Pipeline

```bash
# Generate everything from an ER diagram
./scripts/pipeline.sh examples/advertising_agencies_model.gif

# This will generate:
# - outputs/schema.json          (parsed schema)
# - outputs/schema.sql           (DDL statements)
# - outputs/data/*.csv           (synthetic data)
# - outputs/docs/                (requirements, PRD)
# - outputs/dashboards/          (React components)
# - outputs/powerbi/             (DAX measures)
# - outputs/deploy/              (deployment scripts)
```

## CLI Options

```bash
# Parse with specific provider
./scripts/parse.sh <image> --provider claude|gemini|openai

# Parse with custom output path
./scripts/parse.sh <image> --output ./my-output/schema.json

# Validate schema
./scripts/parse.sh <image> --validate
```

## Supported Image Formats

- PNG (recommended)
- JPEG/JPG
- GIF (auto-converted to PNG)
- BMP (auto-converted to PNG)
- TIFF (auto-converted to PNG)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_AI_API_KEY` | Gemini API key | If using Gemini |
| `ANTHROPIC_API_KEY` | Claude API key | If using Claude |
| `OPENAI_API_KEY` | OpenAI API key | If using OpenAI |
| `DEFAULT_AI_PROVIDER` | Default provider (gemini/claude/openai) | No (default: gemini) |
| `OUTPUT_DIR` | Output directory | No (default: ./outputs) |

## Troubleshooting

### "Node not found"
Run the setup script: `./scripts/setup.sh`

### "API quota exceeded"
- Wait a few minutes and retry
- Check your API usage at the provider's dashboard
- Consider upgrading your API plan

### "Model not found"
- Ensure your API key has access to vision models
- Try a different model by editing `packages/core/src/ai-providers/gemini.ts`

## Project Structure

```
er-analytics-generator/
├── scripts/           # Helper scripts
├── packages/          # Modular packages (stages 1-10)
├── apps/desktop/      # Electron desktop app
├── outputs/           # Generated outputs
├── examples/          # Example ER diagrams
└── docs/              # Documentation
```

## Desktop App / Output Preview

### Run the App

```bash
# Start the desktop app (opens in browser at http://localhost:5173)
./scripts/desktop.sh

# Or manually:
export PATH="$HOME/.nodejs/bin:$PATH"
pnpm --filter @er-analytics/desktop dev
```

### App Features

The app has two views:

**Pipeline View:**
- Select ER diagram image
- Choose AI provider (Claude/Gemini/OpenAI)
- Configure output directory
- Run pipeline with visual progress indicators

**Output Preview View (click "View Outputs"):**

| Tab | Contents |
|-----|----------|
| **Schema** | Visual table structure with PK/FK indicators |
| **SQL** | Generated DDL with syntax highlighting |
| **Data** | Preview of all 11 CSV files |
| **Requirements** | Stakeholder questions by level (Basic/Intermediate/Advanced) |
| **PRD** | Product Requirements Document sections |
| **Analytics** | Cohort retention curves and KPIs |
| **Dashboards** | Interactive charts: Revenue, Industry, Trends, Outcomes |
| **Power BI** | DAX measures, date table code, relationship mappings |
| **Deploy** | Deployment scripts checklist |

### Screenshots

The Preview shows:
- 📊 Interactive charts with Recharts
- 📈 KPI cards with real metrics
- 📋 Requirements by stakeholder level
- 📄 SQL with syntax highlighting
- 🚀 Deployment checklist

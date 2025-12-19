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

# This will generate (after archiving previous outputs):
# - inputs/<image>               (copy of source ER diagram)
# - outputs/.run_metadata.json   (run info: input, timestamp, provider)
# - outputs/schema.json          (parsed schema)
# - outputs/schema.sql           (DDL statements)
# - outputs/data/*.csv           (synthetic data)
# - outputs/analytics/           (cohort analysis results)
# - outputs/docs/                (requirements, PRD)
# - outputs/dashboards/          (React components with README)
# - outputs/powerbi/             (DAX measures)
# - outputs/deploy/              (deployment scripts)
# - outputs/archive/             (archives from previous runs)
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
- Browse and upload ER diagram images directly from your computer
- Choose AI provider (Claude/Gemini/OpenAI)
- Run full 11-stage pipeline with visual progress indicators
- Previous outputs are automatically archived before each run
- Archives are stored in `outputs/archive/` with timestamped names

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

## Downloading Outputs

The desktop app and API provide download options with **unique filenames** based on your input:

| Input File | Download All | Download Folder |
|------------|--------------|-----------------|
| `advertising_agencies_model.gif` | `advertising_agencies_output.zip` | `advertising_agencies_data.zip` |
| `my_schema.png` | `my_schema_output.zip` | `my_schema_dashboards.zip` |

## Working with Archives

Previous outputs are automatically archived before each new pipeline run. Archives are stored in `outputs/archive/`.

### Viewing Archive Contents

```bash
# List files in a tar archive
tar -tvf outputs/archive/advertising_agencies_20251219_161617.tar

# Extract specific file from archive
tar -xvf outputs/archive/advertising_agencies_20251219_161617.tar schema.json

# Extract entire archive
tar -xvf outputs/archive/advertising_agencies_20251219_161617.tar -C /tmp/restored/
```

See `outputs/archive/README.md` for more detailed instructions.

## Using Generated Dashboards

The React dashboard components in `outputs/dashboards/` can be integrated into your projects:

1. Copy the `.tsx` files to your React project
2. Install dependencies: `npm install recharts`
3. Import and use: `import { ExecutiveDashboard } from './dashboards/ExecutiveDashboard'`

See `outputs/dashboards/README.md` for detailed usage instructions and customization tips.

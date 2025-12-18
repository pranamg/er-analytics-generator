# ER Analytics Generator

Transform ER diagram images into production-ready analytics platforms with AI-powered schema extraction, synthetic data generation, interactive dashboards, and deployment scripts.

![Pipeline](https://img.shields.io/badge/Pipeline-10%20Stages-blue)
![AI Providers](https://img.shields.io/badge/AI-Claude%20%7C%20Gemini%20%7C%20OpenAI-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **Vision AI Parsing**: Extract database schemas from ER diagram images using Claude, Gemini, or OpenAI
- **Multi-Provider Support**: Switch between AI providers with a single flag
- **Modular Architecture**: Each pipeline stage is an independent, reusable package
- **Complete Pipeline**: Schema → SQL → Data → Requirements → PRD → Analytics → Dashboards → Deploy
- **Interactive Preview**: Web-based UI to visualize all generated outputs
- **Power BI Ready**: DAX measures, date tables, and import instructions included

## Quick Start

```bash
# 1. Clone and setup
cd er-analytics-generator
cp .env.example .env
# Add your API key to .env (GOOGLE_AI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY)

# 2. Install and build
./scripts/setup.sh

# 3. Parse an ER diagram
./scripts/parse.sh examples/advertising_agencies_model.gif

# 4. Run full pipeline
./scripts/pipeline.sh examples/advertising_agencies_model.gif

# 5. Preview outputs (opens browser)
./scripts/desktop.sh
```

## Pipeline Stages

| Stage | Package | Description |
|-------|---------|-------------|
| 1 | `er-parser` | Parse ER diagram images using Vision APIs |
| 2 | `schema-processor` | Validate and enhance schema, build dependency graph |
| 3 | `sql-generator` | Generate DDL for PostgreSQL/MySQL |
| 4 | `data-generator` | Create realistic synthetic data with Faker.js |
| 5 | `requirements-generator` | Generate stakeholder requirements document |
| 6 | `prd-generator` | Create Product Requirements Document |
| 7 | `analytics-engine` | Cohort analysis, retention curves, churn scoring |
| 8 | `dashboard-builder` | Generate React dashboard components |
| 9 | `powerbi-exporter` | DAX measures and Power BI resources |
| 10 | `deploy-generator` | Database deployment scripts |

## Generated Outputs

```
outputs/
├── schema.json              # Parsed ER schema (JSON)
├── schema_processed.json    # Enhanced schema with metadata
├── schema.sql               # PostgreSQL DDL
├── data/                    # Synthetic data (11 CSV files)
│   ├── Agencies.csv
│   ├── Clients.csv
│   ├── Invoices.csv
│   └── ...
├── docs/
│   ├── requirements.txt     # Stakeholder requirements
│   └── PRD.txt              # Product Requirements Document
├── dashboards/
│   ├── ExecutiveDashboard.tsx
│   └── FinanceDashboard.tsx
├── powerbi/
│   ├── power_bi_measures.dax
│   ├── power_bi_date_table.m
│   └── power_bi_instructions.md
└── deploy/
    ├── deploy.sh
    ├── import_data.sh
    └── ...
```

## Desktop App

The desktop app provides a visual interface for running the pipeline and previewing outputs.

```bash
./scripts/desktop.sh
# Opens at http://localhost:5173
```

**Pipeline View**: Configure image, provider, and run pipeline with progress tracking

**Preview View**: Browse all outputs with interactive charts and visualizations

| Tab | Contents |
|-----|----------|
| Schema | Visual table cards with PK/FK indicators |
| SQL | DDL with syntax highlighting |
| Data | CSV file preview and download |
| Requirements | Stakeholder questions by level |
| PRD | Full product requirements |
| Analytics | Cohort retention charts |
| Dashboards | Interactive KPI cards and charts |
| Power BI | DAX measures and setup guide |
| Deploy | Deployment scripts checklist |

## Project Structure

```
er-analytics-generator/
├── packages/                    # Modular pipeline stages
│   ├── core/                    # AI providers, types, utilities
│   ├── er-parser/               # Stage 1: Vision parsing
│   ├── schema-processor/        # Stage 2: Schema validation
│   ├── sql-generator/           # Stage 3: DDL generation
│   ├── data-generator/          # Stage 4: Synthetic data
│   ├── requirements-generator/  # Stage 5: Requirements doc
│   ├── prd-generator/           # Stage 6: PRD
│   ├── analytics-engine/        # Stage 7: Cohort analysis
│   ├── dashboard-builder/       # Stage 8: React dashboards
│   ├── powerbi-exporter/        # Stage 9: Power BI
│   └── deploy-generator/        # Stage 10: Deploy scripts
├── apps/
│   └── desktop/                 # Electron/React preview app
├── scripts/                     # Helper scripts
├── outputs/                     # Generated artifacts
├── examples/                    # Example ER diagrams
├── docs/                        # Documentation
└── .factory/                    # Droid configurations
    ├── droids/                  # Custom droids for each stage
    ├── skills/                  # Skill definitions
    └── agents.md                # Project context
```

## Configuration

### Environment Variables

```bash
# AI Provider API Keys (at least one required)
GOOGLE_AI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key

# Default provider
DEFAULT_AI_PROVIDER=gemini  # or claude, openai

# Output directory
OUTPUT_DIR=./outputs
```

### Supported Image Formats

- PNG (recommended)
- JPEG/JPG
- GIF (auto-converted)
- BMP (auto-converted)
- TIFF (auto-converted)

## CLI Usage

```bash
# Parse with default provider
./scripts/parse.sh <image-path>

# Parse with specific provider
./scripts/parse.sh <image-path> --provider claude

# Parse with validation
./scripts/parse.sh <image-path> --validate

# Full pipeline
./scripts/pipeline.sh <image-path>

# Full pipeline with specific provider
./scripts/pipeline.sh <image-path> --provider openai
```

## Programmatic Usage

```typescript
import { parseERDiagram } from '@er-analytics/er-parser';
import { processSchema } from '@er-analytics/schema-processor';
import { generateSQL } from '@er-analytics/sql-generator';
import { generateData } from '@er-analytics/data-generator';

// Parse ER diagram
const result = await parseERDiagram('./diagram.png', {
  provider: { provider: 'gemini', apiKey: process.env.GOOGLE_AI_API_KEY }
});

// Process schema
const processed = processSchema(result.schema);

// Generate SQL
const sql = generateSQL(processed.schema, { dialect: 'postgresql' });

// Generate synthetic data
await generateData(processed.schema, processed.dependencyOrder, {}, {
  outputDir: './outputs/data',
  format: 'csv'
});
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @er-analytics/core build

# Run desktop app in dev mode
pnpm --filter @er-analytics/desktop dev
```

## Tech Stack

- **Runtime**: Node.js 18+
- **Package Manager**: pnpm (workspaces)
- **Language**: TypeScript
- **AI Providers**: Anthropic Claude, Google Gemini, OpenAI GPT-4
- **Frontend**: React, Recharts, Tailwind CSS
- **Desktop**: Electron (optional)
- **Data Generation**: Faker.js
- **Schema Validation**: Zod

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and build
5. Submit a pull request

## Documentation

- [Getting Started](docs/GETTING_STARTED.md)
- [Workflow Design](docs/workflow-design-doc_v7.md)
- [Skills Reference](.factory/skills/)

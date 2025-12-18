# ER Analytics Generator

## Project Overview
Transform ER diagram images into production-ready analytics platforms with multi-provider GenAI support (Claude, Gemini, OpenAI).

## Architecture
- **Monorepo**: pnpm workspaces with modular packages
- **AI Abstraction**: Factory pattern for provider switching
- **Pipeline**: 11-stage transformation process (see workflow-design-doc_v7.md)

## Package Structure
```
packages/
├── core/           # AI providers, types, utilities
├── er-parser/      # Stage 1: Vision API parsing
├── schema-processor/   # Stage 2: Schema validation/enhancement
├── sql-generator/      # Stage 3: DDL generation
├── data-generator/     # Stage 4: Synthetic data
├── requirements-generator/  # Stage 5: Requirements doc
├── prd-generator/      # Stage 6: PRD generation
├── analytics-engine/   # Stage 7: Cohort analysis
├── dashboard-builder/  # Stage 8: React dashboards
├── powerbi-exporter/   # Stage 9: Power BI resources
└── deploy-generator/   # Stage 10: Deployment scripts
```

## Key Types (packages/core/src/types/index.ts)
- `Schema`: Database schema with tables, columns, relationships
- `AIProvider`: Interface for vision parsing and text generation
- `VisionParseResult`: Parsed schema with confidence score
- `PipelineConfig`: Full pipeline configuration

## Development Commands
```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm parse <image>    # Parse ER diagram (CLI)
```

## Testing
- Unit tests: `pnpm test` in each package
- Example image: `examples/advertising_agencies_model.gif`

## Environment Variables
- `ANTHROPIC_API_KEY`: Claude API
- `GOOGLE_AI_API_KEY`: Gemini API
- `OPENAI_API_KEY`: OpenAI API
- `DEFAULT_AI_PROVIDER`: Default provider (claude|gemini|openai)

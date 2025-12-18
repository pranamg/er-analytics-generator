# Vision Parse Skill

## Purpose
Extract database schema from ER diagram images using Vision APIs (Claude, Gemini, OpenAI).

## When to Use
- User provides an ER diagram image (PNG, JPG, GIF, BMP, TIFF)
- User wants to extract database schema from visual diagram
- User needs to convert diagram to SQL or data model

## Quick Start

```bash
# Using helper script (recommended)
./scripts/parse.sh examples/advertising_agencies_model.gif

# With options
./scripts/parse.sh <image> --provider gemini --output outputs/schema.json --validate

# Run full pipeline
./scripts/pipeline.sh examples/advertising_agencies_model.gif
```

## Input
- **Image file**: Path to ER diagram (PNG, JPG, GIF, BMP, TIFF - auto-converted if needed)
- **Provider** (optional): AI provider to use (claude, gemini, openai). Default: gemini
- **Output path** (optional): Where to save the parsed schema JSON

## Process
1. Read image file and detect MIME type
2. Convert unsupported formats (GIF, BMP, TIFF) to PNG using sharp
3. Encode image to base64
4. Send to Vision API with schema extraction prompt
5. Parse JSON response
6. Validate schema structure using Zod
7. Return structured schema with confidence score

## Output
```json
{
  "schema": {
    "tables": [
      {
        "name": "TableName",
        "columns": [
          {
            "name": "column_name",
            "type": "DATA_TYPE",
            "primaryKey": true,
            "foreignKey": "OtherTable(id)"
          }
        ]
      }
    ]
  },
  "confidence": 0.90,
  "warnings": []
}
```

## Example Usage

### CLI
```bash
# Parse with default provider (gemini)
./scripts/parse.sh examples/advertising_agencies_model.gif

# Parse with specific provider
./scripts/parse.sh diagram.png --provider claude

# Parse with validation
./scripts/parse.sh diagram.png --validate --output ./output/schema.json
```

### Programmatic
```typescript
import { parseERDiagram } from '@er-analytics/er-parser';

// Using environment variables
const result = await parseERDiagram('./diagram.png');

// With explicit provider config
const result = await parseERDiagram('./diagram.png', {
  provider: { provider: 'gemini', apiKey: 'your-api-key' },
  outputPath: './output/schema.json',
  validate: true
});
```

## Supported Models

| Provider | Model | Notes |
|----------|-------|-------|
| Gemini | gemini-2.5-flash | Default, fast and capable |
| Claude | claude-sonnet-4-20250514 | High accuracy |
| OpenAI | gpt-4o | Good balance |

## Error Handling
- **Unsupported image format**: Auto-converted to PNG using sharp
- **API quota exceeded**: Wait and retry, or switch provider
- **Model overloaded**: Retry after delay
- **Invalid JSON response**: Attempt to extract JSON from markdown code blocks
- **Incomplete extraction**: Return partial results with warnings

## Environment Variables
```bash
GOOGLE_AI_API_KEY=your_gemini_key      # For Gemini
ANTHROPIC_API_KEY=your_claude_key      # For Claude
OPENAI_API_KEY=your_openai_key         # For OpenAI
DEFAULT_AI_PROVIDER=gemini             # Default provider
```

## Related Files
- `packages/er-parser/src/index.ts`: Main parser logic
- `packages/er-parser/src/cli.ts`: CLI implementation
- `packages/core/src/ai-providers/`: Provider implementations
- `packages/core/src/types/index.ts`: Schema types
- `scripts/parse.sh`: Helper script
- `scripts/pipeline.sh`: Full pipeline script

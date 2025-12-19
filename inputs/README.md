# Inputs Folder

This folder stores the source ER diagram images used in pipeline runs.

## How Images Are Added

Images are automatically copied here when:
1. You upload an image via the desktop app's "Browse" button
2. You run the pipeline script: `./scripts/pipeline.sh <image-path>`
3. You use the `/api/upload-and-run` or `/api/run-pipeline` endpoints

## Supported Formats

- PNG (recommended)
- JPEG/JPG
- GIF
- BMP (auto-converted)
- TIFF (auto-converted)

## Usage

The input images serve two purposes:
1. **Pipeline input**: Parsed by Vision AI to extract database schema
2. **Archive reference**: Included in ZIP exports as `00-inputs/` folder

## Cleanup

Input images accumulate over multiple pipeline runs. You can safely delete old images that are no longer needed:

```bash
# Keep only the most recent image
ls -t inputs/*.{gif,png,jpg,jpeg} 2>/dev/null | tail -n +2 | xargs rm -f
```

The original input images are also preserved in the archived outputs (`outputs/archive/`).

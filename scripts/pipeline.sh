#!/bin/bash
# Run full ER-to-Analytics pipeline

set -e

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
OUTPUT_DIR="$PROJECT_DIR/outputs"

# Parse arguments
IMAGE="$1"
if [ -z "$IMAGE" ]; then
    echo "Usage: pipeline.sh <image-path> [--provider claude|gemini|openai]"
    exit 1
fi

if [ "$2" = "--provider" ] && [ -n "$3" ]; then
    PROVIDER="$3"
fi

if [ ! -f "$IMAGE" ]; then
    echo "Error: Image file not found: $IMAGE"
    exit 1
fi

echo "=============================================="
echo "  ER-to-Analytics Pipeline"
echo "=============================================="
echo "Image: $IMAGE"
echo "Provider: $PROVIDER"
echo "Output: $OUTPUT_DIR"
echo "=============================================="
echo ""

cd "$PROJECT_DIR"

# Stage 0: Archive and clean previous outputs
echo "[Stage 0/10] Archiving previous outputs..."
node --input-type=module -e "
import { archiveOutputs, clearOutputDirectories } from './packages/core/dist/index.js';
const result = await archiveOutputs('$OUTPUT_DIR', '$IMAGE');
if (result) {
  console.log('  Archived', result.filesArchived, 'files to:', result.archivePath);
  clearOutputDirectories('$OUTPUT_DIR');
  console.log('  Cleared output directories');
} else {
  console.log('  No previous outputs to archive');
}
"
echo ""

# Create output directories
mkdir -p "$OUTPUT_DIR"/{data,docs,dashboards,powerbi,deploy,analytics}
mkdir -p "$PROJECT_DIR/inputs"

# Copy input image to inputs folder for export
cp "$IMAGE" "$PROJECT_DIR/inputs/"
echo "Input image copied to: $PROJECT_DIR/inputs/$(basename "$IMAGE")"
echo ""

# Stage 1: Parse ER Diagram
echo "[Stage 1/10] Parsing ER diagram..."
node packages/er-parser/dist/cli.js "$IMAGE" -p "$PROVIDER" -o "$OUTPUT_DIR/schema.json" -v
echo ""

# Stage 2: Process Schema
echo "[Stage 2/10] Processing schema..."
node --input-type=module -e "
import fs from 'fs';
import { processSchema } from './packages/schema-processor/dist/index.js';
const schema = JSON.parse(fs.readFileSync('$OUTPUT_DIR/schema.json', 'utf-8'));
const result = processSchema(schema);
fs.writeFileSync('$OUTPUT_DIR/schema_processed.json', JSON.stringify(result, null, 2));
console.log('  Tables:', result.metadata.tableCount);
console.log('  Relationships:', result.metadata.relationships);
console.log('  Complexity:', result.metadata.complexity);
console.log('  Dependency order:', result.dependencyOrder.join(' -> '));
"
echo ""

# Stage 3: Generate SQL
echo "[Stage 3/10] Generating SQL DDL..."
node --input-type=module -e "
import fs from 'fs';
import { generateSQL } from './packages/sql-generator/dist/index.js';
const schema = JSON.parse(fs.readFileSync('$OUTPUT_DIR/schema.json', 'utf-8'));
const sql = generateSQL(schema, { includeIndexes: true });
fs.writeFileSync('$OUTPUT_DIR/schema.sql', sql);
console.log('  SQL saved to: $OUTPUT_DIR/schema.sql');
"
echo ""

# Stage 4: Generate Synthetic Data
echo "[Stage 4/10] Generating synthetic data..."
node --input-type=module -e "
import fs from 'fs';
import { generateData } from './packages/data-generator/dist/index.js';
const processed = JSON.parse(fs.readFileSync('$OUTPUT_DIR/schema_processed.json', 'utf-8'));
await generateData(processed.schema, processed.dependencyOrder, {}, { outputDir: '$OUTPUT_DIR/data', format: 'csv' });
console.log('  CSV files saved to: $OUTPUT_DIR/data/');
"
echo ""

# Stage 5: Generate Requirements
echo "[Stage 5/10] Generating requirements document..."
node --input-type=module -e "
import fs from 'fs';
import { generateRequirements, formatRequirementsAsText } from './packages/requirements-generator/dist/index.js';
const schema = JSON.parse(fs.readFileSync('$OUTPUT_DIR/schema.json', 'utf-8'));
const requirements = generateRequirements(schema);
fs.writeFileSync('$OUTPUT_DIR/docs/requirements.json', JSON.stringify(requirements, null, 2));
fs.writeFileSync('$OUTPUT_DIR/docs/requirements.txt', formatRequirementsAsText(requirements));
console.log('  Requirements saved to: $OUTPUT_DIR/docs/');
"
echo ""

# Stage 6: Generate PRD
echo "[Stage 6/10] Generating PRD..."
node --input-type=module -e "
import fs from 'fs';
import { generatePRD, formatPRDAsText } from './packages/prd-generator/dist/index.js';
import { generateRequirements } from './packages/requirements-generator/dist/index.js';
const schema = JSON.parse(fs.readFileSync('$OUTPUT_DIR/schema.json', 'utf-8'));
const requirements = generateRequirements(schema);
const prd = generatePRD(schema, requirements);
fs.writeFileSync('$OUTPUT_DIR/docs/PRD.json', JSON.stringify(prd, null, 2));
fs.writeFileSync('$OUTPUT_DIR/docs/PRD.txt', formatPRDAsText(prd));
console.log('  PRD saved to: $OUTPUT_DIR/docs/');
"
echo ""

# Stage 7: Run Analytics Engine
echo "[Stage 7/10] Running analytics engine..."
node --input-type=module -e "
import fs from 'fs';
import { performCohortAnalysis, saveAnalyticsResults } from './packages/analytics-engine/dist/index.js';

// Generate sample entities and activities for analytics
const entities = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: 'Entity ' + (i + 1),
  signup_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
}));

const activities = Array.from({ length: 200 }, (_, i) => ({
  entity_id: Math.floor(Math.random() * 50) + 1,
  date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  amount: Math.floor(Math.random() * 50000) + 1000,
}));

const analyticsResult = performCohortAnalysis(entities, activities);
await saveAnalyticsResults(analyticsResult, '$OUTPUT_DIR/analytics/');
console.log('  Analytics saved to: $OUTPUT_DIR/analytics/');
console.log('  - Cohorts:', analyticsResult.cohortAnalysis.cohorts.length);
console.log('  - Churn risk entities:', analyticsResult.churnRisk.filter(c => c.riskScore > 0.5).length);
"
echo ""

# Stage 8: Generate Dashboard Components
echo "[Stage 8/10] Generating dashboard components..."
node --input-type=module -e "
import fs from 'fs';
import { getDefaultDashboardConfigs, generateDashboardComponent } from './packages/dashboard-builder/dist/index.js';
const configs = getDefaultDashboardConfigs();
configs.forEach(config => {
  const code = generateDashboardComponent(config);
  fs.writeFileSync('$OUTPUT_DIR/dashboards/' + config.name + 'Dashboard.tsx', code);
});
console.log('  Dashboard components saved to: $OUTPUT_DIR/dashboards/');
"
echo ""

# Stage 9: Generate Power BI Resources
echo "[Stage 9/10] Generating Power BI resources..."
node --input-type=module -e "
import fs from 'fs';
import { savePowerBIResources } from './packages/powerbi-exporter/dist/index.js';
const schema = JSON.parse(fs.readFileSync('$OUTPUT_DIR/schema.json', 'utf-8'));
savePowerBIResources(schema, '$OUTPUT_DIR/powerbi/');
console.log('  Power BI resources saved to: $OUTPUT_DIR/powerbi/');
"
echo ""

# Stage 10: Generate Deployment Scripts
echo "[Stage 10/10] Generating deployment scripts..."
node --input-type=module -e "
import fs from 'fs';
import { saveDeploymentScripts } from './packages/deploy-generator/dist/index.js';
const schema = JSON.parse(fs.readFileSync('$OUTPUT_DIR/schema.json', 'utf-8'));
saveDeploymentScripts(schema, { dbType: 'postgresql', dbName: 'analytics_db' }, '$OUTPUT_DIR/deploy/');
console.log('  Deployment scripts saved to: $OUTPUT_DIR/deploy/');
"
echo ""

echo "=============================================="
echo "  Pipeline Complete!"
echo "=============================================="
echo ""
echo "Generated outputs:"
echo "  - Schema:      $OUTPUT_DIR/schema.json"
echo "  - SQL DDL:     $OUTPUT_DIR/schema.sql"
echo "  - Data:        $OUTPUT_DIR/data/*.csv"
echo "  - Docs:        $OUTPUT_DIR/docs/"
echo "  - Dashboards:  $OUTPUT_DIR/dashboards/"
echo "  - Power BI:    $OUTPUT_DIR/powerbi/"
echo "  - Deploy:      $OUTPUT_DIR/deploy/"
echo ""

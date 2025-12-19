import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import archiver from 'archiver';
import multer from 'multer';
import { config } from 'dotenv';
import { archiveOutputs, clearOutputDirectories } from '@er-analytics/core';

const app = express();
const PORT = 3001;

// Find project root
function findProjectRoot(): string {
  // Start from cwd (more reliable with tsx)
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'outputs')) && fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'outputs');
const INPUT_DIR = path.join(PROJECT_ROOT, 'inputs');

// Load environment variables from project root
const envPath = path.join(PROJECT_ROOT, '.env');
config({ path: envPath });
console.log('Loading .env from:', envPath);
console.log('GOOGLE_AI_API_KEY loaded:', process.env.GOOGLE_AI_API_KEY ? 'Yes (length: ' + process.env.GOOGLE_AI_API_KEY.length + ')' : 'No');

// Ensure inputs directory exists
if (!fs.existsSync(INPUT_DIR)) {
  fs.mkdirSync(INPUT_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, INPUT_DIR);
  },
  filename: (req, file, cb) => {
    // Use original filename
    cb(null, file.originalname);
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

console.log('=== ER Analytics Generator Server ===');
console.log('PROJECT_ROOT:', PROJECT_ROOT);
console.log('OUTPUT_DIR:', OUTPUT_DIR);
console.log('INPUT_DIR:', INPUT_DIR);

app.use(cors());
app.use(express.json());

// Check if cached schema exists
app.get('/api/check-schema', (req, res) => {
  const schemaPath = path.join(OUTPUT_DIR, 'schema.json');
  const processedPath = path.join(OUTPUT_DIR, 'schema_processed.json');
  
  res.json({
    hasSchema: fs.existsSync(schemaPath),
    hasProcessedSchema: fs.existsSync(processedPath),
    schemaPath: schemaPath,
  });
});

// Upload image file and run pipeline
app.post('/api/upload-and-run', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image file uploaded' });
  }

  const imagePath = path.join(INPUT_DIR, req.file.filename);
  const provider = (req.body?.provider as string) || 'gemini';
  
  console.log(`Uploaded file: ${req.file.filename}, running pipeline with provider: ${provider}`);

  const results: { stage: number; name: string; success: boolean; error?: string }[] = [];

  try {
    // Stage 0: Archive previous outputs
    const archiveResult = await archiveOutputs(OUTPUT_DIR, imagePath);
    if (archiveResult) {
      console.log(`Archived ${archiveResult.filesArchived} files to ${archiveResult.archivePath}`);
    }
    clearOutputDirectories(OUTPUT_DIR);
    results.push({ stage: 0, name: 'Archive & Prepare', success: true });

    // Save run metadata for download naming
    const inputBasename = path.basename(req.file.filename, path.extname(req.file.filename))
      .replace(/_model$/i, '') // Remove _model suffix
      .replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize
    const runMetadata = {
      inputFile: req.file.filename,
      inputBasename,
      timestamp: new Date().toISOString(),
      provider,
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, '.run_metadata.json'), JSON.stringify(runMetadata, null, 2));

    // Ensure output directories exist
    const subDirs = ['data', 'docs', 'dashboards', 'powerbi', 'deploy', 'analytics'];
    for (const subDir of subDirs) {
      const dirPath = path.join(OUTPUT_DIR, subDir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Stage 1: Parse ER Diagram
    try {
      const { parseERDiagram } = await import('@er-analytics/er-parser');
      const apiKeyEnvMap: Record<string, string> = {
        'claude': 'ANTHROPIC_API_KEY',
        'gemini': 'GOOGLE_AI_API_KEY', 
        'openai': 'OPENAI_API_KEY',
      };
      const envVarName = apiKeyEnvMap[provider];
      const apiKey = process.env[envVarName] || '';
      console.log(`[Stage 1] Provider: ${provider}, EnvVar: ${envVarName}, API Key length: ${apiKey.length}`);
      
      if (!apiKey) {
        throw new Error(`API key not found for provider ${provider}. Please set ${envVarName} in .env file.`);
      }
      
      const parseResult = await parseERDiagram(imagePath, { 
        provider: { provider: provider as 'claude' | 'gemini' | 'openai', apiKey }
      });
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema.json'), JSON.stringify(parseResult.schema, null, 2));
      results.push({ stage: 1, name: 'Parse ER Diagram', success: true });
    } catch (e) {
      console.error('[Stage 1] Parse error:', e);
      results.push({ stage: 1, name: 'Parse ER Diagram', success: false, error: String(e) });
      return res.json({ success: false, results, error: 'Failed to parse ER diagram: ' + String(e) });
    }

    // Load the schema for remaining stages
    const schema = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'schema.json'), 'utf-8'));

    // Stage 2: Process Schema
    try {
      const { processSchema } = await import('@er-analytics/schema-processor');
      const processed = processSchema(schema);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_processed.json'), JSON.stringify(processed, null, 2));
      results.push({ stage: 2, name: 'Process Schema', success: true });
    } catch (e) {
      results.push({ stage: 2, name: 'Process Schema', success: false, error: String(e) });
    }

    // Stage 3: Generate SQL
    try {
      const { generateSQL, generateViewSQL } = await import('@er-analytics/sql-generator');
      const sql = generateSQL(schema, { dialect: 'postgresql', includeIndexes: true });
      const sqlMysql = generateSQL(schema, { dialect: 'mysql', includeIndexes: true });
      const views = generateViewSQL(schema);
      
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema.sql'), sql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_postgresql.sql'), sql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_mysql.sql'), sqlMysql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'views.sql'), views);
      results.push({ stage: 3, name: 'Generate SQL', success: true });
    } catch (e) {
      results.push({ stage: 3, name: 'Generate SQL', success: false, error: String(e) });
    }

    // Stage 4: Generate Data
    try {
      const { generateData } = await import('@er-analytics/data-generator');
      const processedSchema = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'schema_processed.json'), 'utf-8'));
      const dataDir = path.join(OUTPUT_DIR, 'data');
      const dependencyOrder = processedSchema.dependencyOrder || schema.tables.map((t: { name: string }) => t.name);
      await generateData(processedSchema.schema || schema, dependencyOrder, {}, { outputDir: dataDir, format: 'csv' });
      results.push({ stage: 4, name: 'Generate Data', success: true });
    } catch (e) {
      results.push({ stage: 4, name: 'Generate Data', success: false, error: String(e) });
    }

    // Stage 5: Generate Requirements
    try {
      const { generateRequirements, formatRequirementsAsText } = await import('@er-analytics/requirements-generator');
      const requirements = generateRequirements(schema);
      const docsDir = path.join(OUTPUT_DIR, 'docs');
      fs.writeFileSync(path.join(docsDir, 'requirements.json'), JSON.stringify(requirements, null, 2));
      fs.writeFileSync(path.join(docsDir, 'requirements.txt'), formatRequirementsAsText(requirements));
      results.push({ stage: 5, name: 'Generate Requirements', success: true });
    } catch (e) {
      results.push({ stage: 5, name: 'Generate Requirements', success: false, error: String(e) });
    }

    // Stage 6: Generate PRD
    try {
      const { generateRequirements } = await import('@er-analytics/requirements-generator');
      const { generatePRD, formatPRDAsText, formatPRDAsHTML } = await import('@er-analytics/prd-generator');
      const requirements = generateRequirements(schema);
      const prd = generatePRD(schema, requirements);
      const docsDir = path.join(OUTPUT_DIR, 'docs');
      fs.writeFileSync(path.join(docsDir, 'PRD.json'), JSON.stringify(prd, null, 2));
      fs.writeFileSync(path.join(docsDir, 'PRD.txt'), formatPRDAsText(prd));
      fs.writeFileSync(path.join(docsDir, 'PRD.html'), formatPRDAsHTML(prd));
      results.push({ stage: 6, name: 'Generate PRD', success: true });
    } catch (e) {
      results.push({ stage: 6, name: 'Generate PRD', success: false, error: String(e) });
    }

    // Stage 7: Run Analytics
    try {
      const { performCohortAnalysis, saveAnalyticsResults } = await import('@er-analytics/analytics-engine');
      const entities = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Entity ${i + 1}`,
        signup_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));
      const activities = Array.from({ length: 200 }, (_, i) => ({
        entity_id: Math.floor(Math.random() * 50) + 1,
        date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 50000) + 1000,
      }));
      const analyticsResult = performCohortAnalysis(entities, activities);
      const analyticsDir = path.join(OUTPUT_DIR, 'analytics');
      await saveAnalyticsResults(analyticsResult, analyticsDir);
      results.push({ stage: 7, name: 'Run Analytics', success: true });
    } catch (e) {
      results.push({ stage: 7, name: 'Run Analytics', success: false, error: String(e) });
    }

    // Stage 8: Build Dashboards
    try {
      const { saveAllDashboards } = await import('@er-analytics/dashboard-builder');
      const dashboardsDir = path.join(OUTPUT_DIR, 'dashboards');
      await saveAllDashboards(dashboardsDir);
      results.push({ stage: 8, name: 'Build Dashboards', success: true });
    } catch (e) {
      results.push({ stage: 8, name: 'Build Dashboards', success: false, error: String(e) });
    }

    // Stage 9: Export Power BI
    try {
      const { savePowerBIResources } = await import('@er-analytics/powerbi-exporter');
      const powerbiDir = path.join(OUTPUT_DIR, 'powerbi');
      await savePowerBIResources(schema, powerbiDir);
      results.push({ stage: 9, name: 'Export Power BI', success: true });
    } catch (e) {
      results.push({ stage: 9, name: 'Export Power BI', success: false, error: String(e) });
    }

    // Stage 10: Generate Deploy Scripts
    try {
      const { saveDeploymentScripts } = await import('@er-analytics/deploy-generator');
      const deployDir = path.join(OUTPUT_DIR, 'deploy');
      await saveDeploymentScripts(schema, {
        dbType: 'postgresql',
        dbName: 'analytics_db',
        dbUser: 'postgres',
      }, deployDir);
      results.push({ stage: 10, name: 'Generate Deploy Scripts', success: true });
    } catch (e) {
      results.push({ stage: 10, name: 'Generate Deploy Scripts', success: false, error: String(e) });
    }

    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      results,
      summary: `Completed ${successCount}/${results.length} stages successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error), results });
  }
});

// List available input images
app.get('/api/inputs', (req, res) => {
  try {
    const files = fs.readdirSync(INPUT_DIR)
      .filter(f => f !== '.gitkeep' && /\.(gif|png|jpg|jpeg|webp)$/i.test(f));
    res.json({ files, inputDir: INPUT_DIR });
  } catch {
    res.json({ files: [], inputDir: INPUT_DIR });
  }
});

// Helper to count CSV rows
function countCSVRows(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    return Math.max(0, lines.length - 1); // Subtract header row
  } catch {
    return 0;
  }
}

// Read all outputs
app.get('/api/outputs', (req, res) => {
  try {
    const outputs: Record<string, unknown> = {};
    
    // Read root files
    const rootFiles = ['schema.json', 'schema_processed.json', 'schema.sql'];
    for (const file of rootFiles) {
      const filePath = path.join(OUTPUT_DIR, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        outputs[file] = file.endsWith('.json') ? JSON.parse(content) : content;
      }
    }
    
    // Read subdirectories
    const subDirs = ['data', 'docs', 'dashboards', 'deploy', 'powerbi', 'analytics'];
    for (const subDir of subDirs) {
      const dirPath = path.join(OUTPUT_DIR, subDir);
      if (fs.existsSync(dirPath)) {
        outputs[subDir] = {};
        const files = fs.readdirSync(dirPath).filter(f => f !== '.gitkeep');
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          if (file.endsWith('.json')) {
            (outputs[subDir] as Record<string, unknown>)[file] = JSON.parse(content);
          } else if (file.endsWith('.csv')) {
            // For CSV files, include content and row count
            (outputs[subDir] as Record<string, unknown>)[file] = {
              content,
              rowCount: countCSVRows(filePath),
            };
          } else {
            (outputs[subDir] as Record<string, unknown>)[file] = content;
          }
        }
      }
    }
    
    res.json(outputs);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Archive existing outputs endpoint
app.post('/api/archive', async (req, res) => {
  try {
    const inputImagePath = req.body?.imagePath || null;
    const result = await archiveOutputs(OUTPUT_DIR, inputImagePath);
    
    if (result) {
      clearOutputDirectories(OUTPUT_DIR);
      res.json({ 
        success: true, 
        archived: true, 
        archivePath: result.archivePath, 
        filesArchived: result.filesArchived 
      });
    } else {
      res.json({ success: true, archived: false, message: 'No files to archive' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Regenerate from cached schema
app.post('/api/regenerate', async (req, res) => {
  const schemaPath = path.join(OUTPUT_DIR, 'schema.json');
  
  if (!fs.existsSync(schemaPath)) {
    return res.status(400).json({ success: false, error: 'No cached schema.json found' });
  }

  try {
    // First, save the schema temporarily
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    
    // Archive previous outputs (preserving the schema.json)
    const archiveResult = await archiveOutputs(OUTPUT_DIR, null);
    if (archiveResult) {
      console.log(`Archived ${archiveResult.filesArchived} files to ${archiveResult.archivePath}`);
    }
    
    // Clear output directories (but keep schema.json for regeneration)
    clearOutputDirectories(OUTPUT_DIR);
    
    // Restore schema.json since we need it for regeneration
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    
    const results: { stage: number; name: string; success: boolean; error?: string }[] = [];

    // Stage 2: Process Schema
    try {
      const { processSchema } = await import('@er-analytics/schema-processor');
      const processed = processSchema(schema);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_processed.json'), JSON.stringify(processed, null, 2));
      results.push({ stage: 2, name: 'Process Schema', success: true });
    } catch (e) {
      results.push({ stage: 2, name: 'Process Schema', success: false, error: String(e) });
    }

    // Stage 3: Generate SQL
    try {
      const { generateSQL, generateViewSQL } = await import('@er-analytics/sql-generator');
      const sql = generateSQL(schema, { dialect: 'postgresql', includeIndexes: true });
      const sqlMysql = generateSQL(schema, { dialect: 'mysql', includeIndexes: true });
      const views = generateViewSQL(schema);
      
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema.sql'), sql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_postgresql.sql'), sql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_mysql.sql'), sqlMysql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'views.sql'), views);
      results.push({ stage: 3, name: 'Generate SQL', success: true });
    } catch (e) {
      results.push({ stage: 3, name: 'Generate SQL', success: false, error: String(e) });
    }

    // Stage 4: Generate Data
    try {
      const { generateData } = await import('@er-analytics/data-generator');
      const dataDir = path.join(OUTPUT_DIR, 'data');
      const dependencyOrder = schema.dependencyOrder || schema.tables.map((t: { name: string }) => t.name);
      await generateData(schema, dependencyOrder, {}, { outputDir: dataDir, format: 'csv' });
      results.push({ stage: 4, name: 'Generate Data', success: true });
    } catch (e) {
      results.push({ stage: 4, name: 'Generate Data', success: false, error: String(e) });
    }

    // Stage 5: Generate Requirements
    try {
      const { generateRequirements, formatRequirementsAsText } = await import('@er-analytics/requirements-generator');
      const requirements = generateRequirements(schema);
      const docsDir = path.join(OUTPUT_DIR, 'docs');
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'requirements.json'), JSON.stringify(requirements, null, 2));
      fs.writeFileSync(path.join(docsDir, 'requirements.txt'), formatRequirementsAsText(requirements));
      results.push({ stage: 5, name: 'Generate Requirements', success: true });
    } catch (e) {
      results.push({ stage: 5, name: 'Generate Requirements', success: false, error: String(e) });
    }

    // Stage 6: Generate PRD
    try {
      const { generateRequirements } = await import('@er-analytics/requirements-generator');
      const { generatePRD, formatPRDAsText, formatPRDAsHTML } = await import('@er-analytics/prd-generator');
      const requirements = generateRequirements(schema);
      const prd = generatePRD(schema, requirements);
      const docsDir = path.join(OUTPUT_DIR, 'docs');
      fs.writeFileSync(path.join(docsDir, 'PRD.json'), JSON.stringify(prd, null, 2));
      fs.writeFileSync(path.join(docsDir, 'PRD.txt'), formatPRDAsText(prd));
      fs.writeFileSync(path.join(docsDir, 'PRD.html'), formatPRDAsHTML(prd));
      results.push({ stage: 6, name: 'Generate PRD', success: true });
    } catch (e) {
      results.push({ stage: 6, name: 'Generate PRD', success: false, error: String(e) });
    }

    // Stage 7: Run Analytics
    try {
      const { performCohortAnalysis, saveAnalyticsResults } = await import('@er-analytics/analytics-engine');
      const entities = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Entity ${i + 1}`,
        signup_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));
      const activities = Array.from({ length: 100 }, (_, i) => ({
        entity_id: Math.floor(Math.random() * 20) + 1,
        date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 50000) + 1000,
      }));
      const analyticsResult = performCohortAnalysis(entities, activities);
      const analyticsDir = path.join(OUTPUT_DIR, 'analytics');
      await saveAnalyticsResults(analyticsResult, analyticsDir);
      results.push({ stage: 7, name: 'Run Analytics', success: true });
    } catch (e) {
      results.push({ stage: 7, name: 'Run Analytics', success: false, error: String(e) });
    }

    // Stage 8: Build Dashboards
    try {
      const { saveAllDashboards } = await import('@er-analytics/dashboard-builder');
      const dashboardsDir = path.join(OUTPUT_DIR, 'dashboards');
      await saveAllDashboards(dashboardsDir);
      results.push({ stage: 8, name: 'Build Dashboards', success: true });
    } catch (e) {
      results.push({ stage: 8, name: 'Build Dashboards', success: false, error: String(e) });
    }

    // Stage 9: Export Power BI
    try {
      const { savePowerBIResources } = await import('@er-analytics/powerbi-exporter');
      const powerbiDir = path.join(OUTPUT_DIR, 'powerbi');
      await savePowerBIResources(schema, powerbiDir);
      results.push({ stage: 9, name: 'Export Power BI', success: true });
    } catch (e) {
      results.push({ stage: 9, name: 'Export Power BI', success: false, error: String(e) });
    }

    // Stage 10: Generate Deploy Scripts
    try {
      const { saveDeploymentScripts } = await import('@er-analytics/deploy-generator');
      const deployDir = path.join(OUTPUT_DIR, 'deploy');
      await saveDeploymentScripts(schema, {
        dbType: 'postgresql',
        dbName: 'analytics_db',
        dbUser: 'postgres',
      }, deployDir);
      results.push({ stage: 10, name: 'Generate Deploy Scripts', success: true });
    } catch (e) {
      results.push({ stage: 10, name: 'Generate Deploy Scripts', success: false, error: String(e) });
    }

    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      results,
      summary: `Completed ${successCount}/${results.length} stages successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Run full pipeline with image parsing (Stage 1)
app.post('/api/run-pipeline', async (req, res) => {
  const { imagePath, provider = 'gemini' } = req.body;
  
  if (!imagePath) {
    return res.status(400).json({ success: false, error: 'imagePath is required' });
  }

  const INPUT_DIR = path.join(PROJECT_ROOT, 'inputs');
  const resolvedImagePath = path.isAbsolute(imagePath) 
    ? imagePath 
    : path.join(PROJECT_ROOT, imagePath);
  
  if (!fs.existsSync(resolvedImagePath)) {
    return res.status(400).json({ success: false, error: `Image file not found: ${resolvedImagePath}` });
  }

  const results: { stage: number; name: string; success: boolean; error?: string }[] = [];

  try {
    // Stage 0: Archive previous outputs
    const archiveResult = await archiveOutputs(OUTPUT_DIR, resolvedImagePath);
    if (archiveResult) {
      console.log(`Archived ${archiveResult.filesArchived} files to ${archiveResult.archivePath}`);
    }
    clearOutputDirectories(OUTPUT_DIR);
    
    // Copy input image to inputs folder
    if (!fs.existsSync(INPUT_DIR)) {
      fs.mkdirSync(INPUT_DIR, { recursive: true });
    }
    const inputImageDest = path.join(INPUT_DIR, path.basename(resolvedImagePath));
    fs.copyFileSync(resolvedImagePath, inputImageDest);
    
    // Save run metadata for download naming
    const inputFilename = path.basename(resolvedImagePath);
    const inputBasename = path.basename(inputFilename, path.extname(inputFilename))
      .replace(/_model$/i, '') // Remove _model suffix
      .replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize
    const runMetadata = {
      inputFile: inputFilename,
      inputBasename,
      timestamp: new Date().toISOString(),
      provider,
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, '.run_metadata.json'), JSON.stringify(runMetadata, null, 2));
    
    results.push({ stage: 0, name: 'Archive & Prepare', success: true });

    // Ensure output directories exist
    const subDirs = ['data', 'docs', 'dashboards', 'powerbi', 'deploy', 'analytics'];
    for (const subDir of subDirs) {
      const dirPath = path.join(OUTPUT_DIR, subDir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Stage 1: Parse ER Diagram
    try {
      const { parseERDiagram } = await import('@er-analytics/er-parser');
      // Use environment variables for API keys, just specify the provider name
      const apiKeyEnvMap: Record<string, string> = {
        'claude': 'ANTHROPIC_API_KEY',
        'gemini': 'GOOGLE_AI_API_KEY', 
        'openai': 'OPENAI_API_KEY',
      };
      const apiKey = process.env[apiKeyEnvMap[provider]] || '';
      const parseResult = await parseERDiagram(resolvedImagePath, { 
        provider: { provider: provider as 'claude' | 'gemini' | 'openai', apiKey }
      });
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema.json'), JSON.stringify(parseResult.schema, null, 2));
      results.push({ stage: 1, name: 'Parse ER Diagram', success: true });
    } catch (e) {
      results.push({ stage: 1, name: 'Parse ER Diagram', success: false, error: String(e) });
      return res.json({ success: false, results, error: 'Failed to parse ER diagram' });
    }

    // Load the schema for remaining stages
    const schema = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'schema.json'), 'utf-8'));

    // Stage 2: Process Schema
    try {
      const { processSchema } = await import('@er-analytics/schema-processor');
      const processed = processSchema(schema);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_processed.json'), JSON.stringify(processed, null, 2));
      results.push({ stage: 2, name: 'Process Schema', success: true });
    } catch (e) {
      results.push({ stage: 2, name: 'Process Schema', success: false, error: String(e) });
    }

    // Stage 3: Generate SQL
    try {
      const { generateSQL, generateViewSQL } = await import('@er-analytics/sql-generator');
      const sql = generateSQL(schema, { dialect: 'postgresql', includeIndexes: true });
      const sqlMysql = generateSQL(schema, { dialect: 'mysql', includeIndexes: true });
      const views = generateViewSQL(schema);
      
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema.sql'), sql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_postgresql.sql'), sql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_mysql.sql'), sqlMysql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'views.sql'), views);
      results.push({ stage: 3, name: 'Generate SQL', success: true });
    } catch (e) {
      results.push({ stage: 3, name: 'Generate SQL', success: false, error: String(e) });
    }

    // Stage 4: Generate Data
    try {
      const { generateData } = await import('@er-analytics/data-generator');
      const processedSchema = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'schema_processed.json'), 'utf-8'));
      const dataDir = path.join(OUTPUT_DIR, 'data');
      const dependencyOrder = processedSchema.dependencyOrder || schema.tables.map((t: { name: string }) => t.name);
      await generateData(processedSchema.schema || schema, dependencyOrder, {}, { outputDir: dataDir, format: 'csv' });
      results.push({ stage: 4, name: 'Generate Data', success: true });
    } catch (e) {
      results.push({ stage: 4, name: 'Generate Data', success: false, error: String(e) });
    }

    // Stage 5: Generate Requirements
    try {
      const { generateRequirements, formatRequirementsAsText } = await import('@er-analytics/requirements-generator');
      const requirements = generateRequirements(schema);
      const docsDir = path.join(OUTPUT_DIR, 'docs');
      fs.writeFileSync(path.join(docsDir, 'requirements.json'), JSON.stringify(requirements, null, 2));
      fs.writeFileSync(path.join(docsDir, 'requirements.txt'), formatRequirementsAsText(requirements));
      results.push({ stage: 5, name: 'Generate Requirements', success: true });
    } catch (e) {
      results.push({ stage: 5, name: 'Generate Requirements', success: false, error: String(e) });
    }

    // Stage 6: Generate PRD
    try {
      const { generateRequirements } = await import('@er-analytics/requirements-generator');
      const { generatePRD, formatPRDAsText, formatPRDAsHTML } = await import('@er-analytics/prd-generator');
      const requirements = generateRequirements(schema);
      const prd = generatePRD(schema, requirements);
      const docsDir = path.join(OUTPUT_DIR, 'docs');
      fs.writeFileSync(path.join(docsDir, 'PRD.json'), JSON.stringify(prd, null, 2));
      fs.writeFileSync(path.join(docsDir, 'PRD.txt'), formatPRDAsText(prd));
      fs.writeFileSync(path.join(docsDir, 'PRD.html'), formatPRDAsHTML(prd));
      results.push({ stage: 6, name: 'Generate PRD', success: true });
    } catch (e) {
      results.push({ stage: 6, name: 'Generate PRD', success: false, error: String(e) });
    }

    // Stage 7: Run Analytics
    try {
      const { performCohortAnalysis, saveAnalyticsResults } = await import('@er-analytics/analytics-engine');
      const entities = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Entity ${i + 1}`,
        signup_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));
      const activities = Array.from({ length: 200 }, (_, i) => ({
        entity_id: Math.floor(Math.random() * 50) + 1,
        date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 50000) + 1000,
      }));
      const analyticsResult = performCohortAnalysis(entities, activities);
      const analyticsDir = path.join(OUTPUT_DIR, 'analytics');
      await saveAnalyticsResults(analyticsResult, analyticsDir);
      results.push({ stage: 7, name: 'Run Analytics', success: true });
    } catch (e) {
      results.push({ stage: 7, name: 'Run Analytics', success: false, error: String(e) });
    }

    // Stage 8: Build Dashboards
    try {
      const { saveAllDashboards } = await import('@er-analytics/dashboard-builder');
      const dashboardsDir = path.join(OUTPUT_DIR, 'dashboards');
      await saveAllDashboards(dashboardsDir);
      results.push({ stage: 8, name: 'Build Dashboards', success: true });
    } catch (e) {
      results.push({ stage: 8, name: 'Build Dashboards', success: false, error: String(e) });
    }

    // Stage 9: Export Power BI
    try {
      const { savePowerBIResources } = await import('@er-analytics/powerbi-exporter');
      const powerbiDir = path.join(OUTPUT_DIR, 'powerbi');
      await savePowerBIResources(schema, powerbiDir);
      results.push({ stage: 9, name: 'Export Power BI', success: true });
    } catch (e) {
      results.push({ stage: 9, name: 'Export Power BI', success: false, error: String(e) });
    }

    // Stage 10: Generate Deploy Scripts
    try {
      const { saveDeploymentScripts } = await import('@er-analytics/deploy-generator');
      const deployDir = path.join(OUTPUT_DIR, 'deploy');
      await saveDeploymentScripts(schema, {
        dbType: 'postgresql',
        dbName: 'analytics_db',
        dbUser: 'postgres',
      }, deployDir);
      results.push({ stage: 10, name: 'Generate Deploy Scripts', success: true });
    } catch (e) {
      results.push({ stage: 10, name: 'Generate Deploy Scripts', success: false, error: String(e) });
    }

    const successCount = results.filter(r => r.success).length;
    res.json({ 
      success: true, 
      results,
      summary: `Completed ${successCount}/${results.length} stages successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error), results });
  }
});

// Download file (supports paths like docs/requirements.json)
app.get('/api/download/file/*', (req, res) => {
  const relativePath = req.params[0]; // Gets everything after /api/download/file/
  const filePath = path.join(OUTPUT_DIR, relativePath);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: `File not found: ${relativePath}` });
  }
});

// Helper to get output prefix from run metadata
function getOutputPrefix(): string {
  const metadataPath = path.join(OUTPUT_DIR, '.run_metadata.json');
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      if (metadata.inputBasename) {
        return metadata.inputBasename;
      }
    } catch {
      // Fall through to default
    }
  }
  return 'er-analytics';
}

// Download folder as zip
app.get('/api/download/folder/:folder', (req, res) => {
  const folderPath = path.join(OUTPUT_DIR, req.params.folder);
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const prefix = getOutputPrefix();
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=${prefix}_${req.params.folder}.zip`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(folderPath, false);
  archive.finalize();
});

// Download all as zip
app.get('/api/download/all', (req, res) => {
  const prefix = getOutputPrefix();
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=${prefix}_output.zip`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  
  // Add numbered folders per design doc
  const folderMapping: Record<string, string> = {
    'schema.json': '01-schema/schema.json',
    'schema_processed.json': '01-schema/schema_processed.json',
    'schema.sql': '02-database/schema.sql',
    'schema_postgresql.sql': '02-database/schema_postgresql.sql',
    'schema_mysql.sql': '02-database/schema_mysql.sql',
    'views.sql': '02-database/views.sql',
  };

  // Add root files
  for (const [src, dest] of Object.entries(folderMapping)) {
    const filePath = path.join(OUTPUT_DIR, src);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: dest });
    }
  }

  // Add subdirectories with numbered prefixes
  const subDirMapping: Record<string, string> = {
    'data': '03-data',
    'docs': '04-docs',
    'analytics': '05-analytics',
    'dashboards': '06-dashboards',
    'powerbi': '07-powerbi',
    'deploy': '08-deploy',
  };

  for (const [src, dest] of Object.entries(subDirMapping)) {
    const dirPath = path.join(OUTPUT_DIR, src);
    if (fs.existsSync(dirPath)) {
      archive.directory(dirPath, dest);
    }
  }

  // Add inputs folder with source ER diagram
  const inputsDir = path.join(PROJECT_ROOT, 'inputs');
  if (fs.existsSync(inputsDir)) {
    archive.directory(inputsDir, '00-inputs');
  }

  archive.finalize();
});

// Save business context
app.post('/api/business-context', (req, res) => {
  try {
    const context = req.body;
    const docsDir = path.join(OUTPUT_DIR, 'docs');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    
    fs.writeFileSync(path.join(docsDir, 'business_context.json'), JSON.stringify(context, null, 2));
    
    // Also save as markdown
    const md = `# Business Context\n\n## Industry\n${context.industry || 'N/A'}\n\n## Company Size\n${context.companySize || 'N/A'}\n\n## Region\n${context.region || 'N/A'}\n\n## Market Size\n${context.marketSize || 'N/A'}\n\n## Growth Rate\n${context.growthRate || 'N/A'}\n\n## Market Trends\n${context.marketTrends || 'N/A'}\n`;
    fs.writeFileSync(path.join(docsDir, 'business_context.md'), md);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Open outputs folder (returns path for user to open manually)
app.get('/api/outputs-path', (req, res) => {
  res.json({ path: OUTPUT_DIR });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/check-schema`);
  console.log(`  GET  /api/outputs`);
  console.log(`  POST /api/regenerate`);
  console.log(`  GET  /api/download/all`);
});

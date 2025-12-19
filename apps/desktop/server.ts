import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import archiver from 'archiver';

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

console.log('=== ER Analytics Generator Server ===');
console.log('PROJECT_ROOT:', PROJECT_ROOT);
console.log('OUTPUT_DIR:', OUTPUT_DIR);

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
          (outputs[subDir] as Record<string, unknown>)[file] = file.endsWith('.json') ? JSON.parse(content) : content;
        }
      }
    }
    
    res.json(outputs);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Regenerate from cached schema
app.post('/api/regenerate', async (req, res) => {
  const schemaPath = path.join(OUTPUT_DIR, 'schema.json');
  
  if (!fs.existsSync(schemaPath)) {
    return res.status(400).json({ success: false, error: 'No cached schema.json found' });
  }

  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
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

// Download folder as zip
app.get('/api/download/folder/:folder', (req, res) => {
  const folderPath = path.join(OUTPUT_DIR, req.params.folder);
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=${req.params.folder}.zip`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(folderPath, false);
  archive.finalize();
});

// Download all as zip
app.get('/api/download/all', (req, res) => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=er-analytics-output.zip');

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

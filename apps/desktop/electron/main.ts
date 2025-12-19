import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

// Find project root (where outputs folder exists)
function findProjectRoot(): string {
  // Try multiple starting points
  const startDirs = [
    process.cwd(),
    __dirname, // dist/electron
    path.join(__dirname, '..'), // dist
    path.join(__dirname, '../..'), // apps/desktop
    path.join(__dirname, '../../..'), // apps
    path.join(__dirname, '../../../..'), // project root
  ];
  
  for (const startDir of startDirs) {
    let dir = startDir;
    for (let i = 0; i < 6; i++) {
      if (fs.existsSync(path.join(dir, 'outputs')) && fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
        return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'outputs');

console.log('=== ER Analytics Generator ===');
console.log('CWD:', process.cwd());
console.log('PROJECT_ROOT:', PROJECT_ROOT);
console.log('OUTPUT_DIR:', OUTPUT_DIR);
console.log('Schema exists:', fs.existsSync(path.join(OUTPUT_DIR, 'schema.json')));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for file operations
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] },
    ],
  });
  return result.filePaths[0];
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.filePaths[0];
});

ipcMain.handle('read-output-file', async (_, filename: string) => {
  try {
    const filePath = path.join(OUTPUT_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('list-output-files', async (_, subdir: string) => {
  try {
    const dirPath = path.join(OUTPUT_DIR, subdir);
    if (!fs.existsSync(dirPath)) {
      return { success: true, files: [] };
    }
    const files = fs.readdirSync(dirPath)
      .filter(f => f !== '.gitkeep')
      .map(f => {
        const filePath = path.join(dirPath, f);
        const stat = fs.statSync(filePath);
        let lineCount = 0;
        if (f.endsWith('.csv')) {
          const content = fs.readFileSync(filePath, 'utf-8');
          lineCount = content.split('\n').filter(l => l.trim()).length;
        }
        return {
          name: f,
          size: stat.size,
          lineCount,
        };
      });
    return { success: true, files };
  } catch (error) {
    return { success: false, error: String(error), files: [] };
  }
});

ipcMain.handle('read-all-outputs', async () => {
  try {
    const result: Record<string, unknown> = {};
    
    const schemaPath = path.join(OUTPUT_DIR, 'schema.json');
    if (fs.existsSync(schemaPath)) {
      result.schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    }
    
    const sqlPath = path.join(OUTPUT_DIR, 'schema.sql');
    if (fs.existsSync(sqlPath)) {
      result.sql = fs.readFileSync(sqlPath, 'utf-8');
    }
    
    const processedPath = path.join(OUTPUT_DIR, 'schema_processed.json');
    if (fs.existsSync(processedPath)) {
      result.processedSchema = JSON.parse(fs.readFileSync(processedPath, 'utf-8'));
    }
    
    const reqPath = path.join(OUTPUT_DIR, 'docs/requirements.json');
    if (fs.existsSync(reqPath)) {
      result.requirements = JSON.parse(fs.readFileSync(reqPath, 'utf-8'));
    }
    
    const prdPath = path.join(OUTPUT_DIR, 'docs/PRD.json');
    if (fs.existsSync(prdPath)) {
      result.prd = JSON.parse(fs.readFileSync(prdPath, 'utf-8'));
    }
    
    const analyticsPath = path.join(OUTPUT_DIR, 'analytics/analytics.json');
    if (fs.existsSync(analyticsPath)) {
      result.analytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
    }
    
    const dataDir = path.join(OUTPUT_DIR, 'data');
    if (fs.existsSync(dataDir)) {
      result.dataFiles = fs.readdirSync(dataDir)
        .filter(f => f.endsWith('.csv'))
        .map(f => {
          const content = fs.readFileSync(path.join(dataDir, f), 'utf-8');
          const lines = content.split('\n').filter(l => l.trim());
          return { name: f, rowCount: Math.max(0, lines.length - 1) };
        });
    }
    
    const dashDir = path.join(OUTPUT_DIR, 'dashboards');
    if (fs.existsSync(dashDir)) {
      result.dashboards = fs.readdirSync(dashDir)
        .filter(f => f.endsWith('.tsx'))
        .map(f => ({ name: f.replace('.tsx', ''), file: f }));
    }
    
    const pbiDir = path.join(OUTPUT_DIR, 'powerbi');
    if (fs.existsSync(pbiDir)) {
      const pbiFiles: Record<string, string> = {};
      for (const f of fs.readdirSync(pbiDir)) {
        pbiFiles[f] = fs.readFileSync(path.join(pbiDir, f), 'utf-8');
      }
      result.powerbi = pbiFiles;
    }
    
    const deployDir = path.join(OUTPUT_DIR, 'deploy');
    if (fs.existsSync(deployDir)) {
      result.deployScripts = fs.readdirSync(deployDir)
        .filter(f => f.endsWith('.sh'))
        .map(f => ({ name: f, desc: getScriptDescription(f) }));
    }
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('open-output-folder', async () => {
  shell.openPath(OUTPUT_DIR);
});

ipcMain.handle('archive-outputs', async (_, inputImagePath: string | null) => {
  try {
    const archiveDir = path.join(OUTPUT_DIR, 'archive');
    
    if (!fs.existsSync(OUTPUT_DIR)) {
      return { success: true, archived: false, message: 'No outputs to archive' };
    }
    
    const hasFiles = checkForOutputFiles(OUTPUT_DIR);
    if (!hasFiles) {
      return { success: true, archived: false, message: 'No outputs to archive' };
    }
    
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    
    const timestamp = formatTimestamp(new Date());
    const imageName = inputImagePath 
      ? path.basename(inputImagePath, path.extname(inputImagePath))
      : 'output';
    const archiveName = `${sanitizeFilename(imageName)}_${timestamp}.zip`;
    const archivePath = path.join(archiveDir, archiveName);
    
    const tempDir = path.join(OUTPUT_DIR, '.archive_temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    let filesArchived = 0;
    const subDirs = ['data', 'dashboards', 'deploy', 'docs', 'powerbi', 'analytics'];
    for (const subDir of subDirs) {
      const srcDir = path.join(OUTPUT_DIR, subDir);
      if (fs.existsSync(srcDir)) {
        const destDir = path.join(tempDir, subDir);
        fs.mkdirSync(destDir, { recursive: true });
        filesArchived += copyDirContents(srcDir, destDir);
      }
    }
    
    const rootFiles = ['schema.json', 'schema.sql', 'schema_processed.json'];
    for (const file of rootFiles) {
      const srcFile = path.join(OUTPUT_DIR, file);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(tempDir, file));
        filesArchived++;
      }
    }
    
    if (inputImagePath && fs.existsSync(inputImagePath)) {
      const inputCopy = path.join(tempDir, 'input_' + path.basename(inputImagePath));
      fs.copyFileSync(inputImagePath, inputCopy);
      filesArchived++;
    }
    
    const { execSync } = require('child_process');
    try {
      execSync(`zip -r "${archivePath}" .`, { cwd: tempDir, stdio: 'pipe' });
    } catch {
      const tarPath = archivePath.replace('.zip', '.tar.gz');
      execSync(`tar -czvf "${tarPath}" -C "${tempDir}" .`, { stdio: 'pipe' });
    }
    
    fs.rmSync(tempDir, { recursive: true });
    
    for (const subDir of subDirs) {
      const dirPath = path.join(OUTPUT_DIR, subDir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file !== '.gitkeep') {
            fs.rmSync(path.join(dirPath, file), { recursive: true });
          }
        }
      }
    }
    for (const file of rootFiles) {
      const filePath = path.join(OUTPUT_DIR, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    return { success: true, archived: true, archivePath, filesArchived, timestamp };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Regenerate pipeline from cached schema (skips Vision API)
ipcMain.handle('regenerate-from-schema', async (event) => {
  const schemaPath = path.join(OUTPUT_DIR, 'schema.json');
  
  if (!fs.existsSync(schemaPath)) {
    return { success: false, error: 'No cached schema.json found. Run full pipeline first.' };
  }

  const sendProgress = (stage: number, status: string, message: string) => {
    if (mainWindow) {
      mainWindow.webContents.send('pipeline-progress', { stage, status, message });
    }
  };

  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const results: { stage: number; name: string; success: boolean; files?: string[] }[] = [];

    // Stage 2: Process Schema
    sendProgress(2, 'running', 'Processing schema...');
    try {
      const { processSchema } = await import('@er-analytics/schema-processor');
      const processed = processSchema(schema);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_processed.json'), JSON.stringify(processed, null, 2));
      results.push({ stage: 2, name: 'Process Schema', success: true, files: ['schema_processed.json'] });
      sendProgress(2, 'completed', 'Schema processed');
    } catch (e) {
      results.push({ stage: 2, name: 'Process Schema', success: false });
      sendProgress(2, 'failed', String(e));
    }

    // Stage 3: Generate SQL
    sendProgress(3, 'running', 'Generating SQL...');
    try {
      const { generateSQL, generateViewSQL } = await import('@er-analytics/sql-generator');
      const sql = generateSQL(schema, { dialect: 'postgresql', includeIndexes: true });
      const sqlPostgres = generateSQL(schema, { dialect: 'postgresql', includeIndexes: true });
      const sqlMysql = generateSQL(schema, { dialect: 'mysql', includeIndexes: true });
      const views = generateViewSQL(schema);
      
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema.sql'), sql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_postgresql.sql'), sqlPostgres);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'schema_mysql.sql'), sqlMysql);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'views.sql'), views);
      results.push({ stage: 3, name: 'Generate SQL', success: true, files: ['schema.sql', 'schema_postgresql.sql', 'schema_mysql.sql', 'views.sql'] });
      sendProgress(3, 'completed', 'SQL generated');
    } catch (e) {
      results.push({ stage: 3, name: 'Generate SQL', success: false });
      sendProgress(3, 'failed', String(e));
    }

    // Stage 4: Generate Data
    sendProgress(4, 'running', 'Generating synthetic data...');
    try {
      const { generateData } = await import('@er-analytics/data-generator');
      const dataDir = path.join(OUTPUT_DIR, 'data');
      const dependencyOrder = schema.dependencyOrder || schema.tables.map((t: { name: string }) => t.name);
      await generateData(schema, dependencyOrder, {}, { outputDir: dataDir, format: 'csv' });
      results.push({ stage: 4, name: 'Generate Data', success: true });
      sendProgress(4, 'completed', 'Data generated');
    } catch (e) {
      results.push({ stage: 4, name: 'Generate Data', success: false });
      sendProgress(4, 'failed', String(e));
    }

    // Stage 5: Generate Requirements
    sendProgress(5, 'running', 'Generating requirements...');
    try {
      const { generateRequirements, formatRequirementsAsText } = await import('@er-analytics/requirements-generator');
      const requirements = generateRequirements(schema);
      const docsDir = path.join(OUTPUT_DIR, 'docs');
      if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'requirements.json'), JSON.stringify(requirements, null, 2));
      fs.writeFileSync(path.join(docsDir, 'requirements.txt'), formatRequirementsAsText(requirements));
      results.push({ stage: 5, name: 'Generate Requirements', success: true });
      sendProgress(5, 'completed', 'Requirements generated');
    } catch (e) {
      results.push({ stage: 5, name: 'Generate Requirements', success: false });
      sendProgress(5, 'failed', String(e));
    }

    // Stage 6: Generate PRD
    sendProgress(6, 'running', 'Generating PRD...');
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
      sendProgress(6, 'completed', 'PRD generated');
    } catch (e) {
      results.push({ stage: 6, name: 'Generate PRD', success: false });
      sendProgress(6, 'failed', String(e));
    }

    // Stage 7: Run Analytics
    sendProgress(7, 'running', 'Running analytics...');
    try {
      const { performCohortAnalysis, saveAnalyticsResults } = await import('@er-analytics/analytics-engine');
      // Create sample entities and activities from schema
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
      sendProgress(7, 'completed', 'Analytics completed');
    } catch (e) {
      results.push({ stage: 7, name: 'Run Analytics', success: false });
      sendProgress(7, 'failed', String(e));
    }

    // Stage 8: Build Dashboards
    sendProgress(8, 'running', 'Building dashboards...');
    try {
      const { saveAllDashboards } = await import('@er-analytics/dashboard-builder');
      const dashboardsDir = path.join(OUTPUT_DIR, 'dashboards');
      await saveAllDashboards(dashboardsDir);
      results.push({ stage: 8, name: 'Build Dashboards', success: true });
      sendProgress(8, 'completed', 'Dashboards built');
    } catch (e) {
      results.push({ stage: 8, name: 'Build Dashboards', success: false });
      sendProgress(8, 'failed', String(e));
    }

    // Stage 9: Export Power BI
    sendProgress(9, 'running', 'Exporting Power BI resources...');
    try {
      const { savePowerBIResources } = await import('@er-analytics/powerbi-exporter');
      const powerbiDir = path.join(OUTPUT_DIR, 'powerbi');
      await savePowerBIResources(schema, powerbiDir);
      results.push({ stage: 9, name: 'Export Power BI', success: true });
      sendProgress(9, 'completed', 'Power BI exported');
    } catch (e) {
      results.push({ stage: 9, name: 'Export Power BI', success: false });
      sendProgress(9, 'failed', String(e));
    }

    // Stage 10: Generate Deploy Scripts
    sendProgress(10, 'running', 'Generating deployment scripts...');
    try {
      const { saveDeploymentScripts } = await import('@er-analytics/deploy-generator');
      const deployDir = path.join(OUTPUT_DIR, 'deploy');
      await saveDeploymentScripts(schema, {
        dbType: 'postgresql',
        dbName: 'analytics_db',
        dbUser: 'postgres',
      }, deployDir);
      results.push({ stage: 10, name: 'Generate Deploy Scripts', success: true });
      sendProgress(10, 'completed', 'Deploy scripts generated');
    } catch (e) {
      results.push({ stage: 10, name: 'Generate Deploy Scripts', success: false });
      sendProgress(10, 'failed', String(e));
    }

    const successCount = results.filter(r => r.success).length;
    return { 
      success: true, 
      results,
      summary: `Completed ${successCount}/${results.length} stages successfully`
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Check if cached schema exists
ipcMain.handle('check-cached-schema', async () => {
  const schemaPath = path.join(OUTPUT_DIR, 'schema.json');
  const processedPath = path.join(OUTPUT_DIR, 'schema_processed.json');
  
  console.log('Checking for cached schema at:', schemaPath);
  console.log('Schema exists:', fs.existsSync(schemaPath));
  console.log('OUTPUT_DIR:', OUTPUT_DIR);
  
  return {
    hasSchema: fs.existsSync(schemaPath),
    hasProcessedSchema: fs.existsSync(processedPath),
    schemaPath: schemaPath,
  };
});

function getScriptDescription(filename: string): string {
  const descriptions: Record<string, string> = {
    'deploy.sh': 'Main deployment',
    'setup_database.sh': 'DB creation',
    'import_data.sh': 'CSV import',
    'create_indexes.sh': 'Performance indexes',
    'setup_users.sh': 'User permissions',
    'health_check.sh': 'Verification',
    'rollback.sh': 'Emergency rollback',
  };
  return descriptions[filename] || 'Script';
}

function checkForOutputFiles(outputDir: string): boolean {
  const rootFiles = ['schema.json', 'schema.sql', 'schema_processed.json'];
  for (const file of rootFiles) {
    if (fs.existsSync(path.join(outputDir, file))) return true;
  }
  const subDirs = ['data', 'dashboards', 'deploy', 'docs', 'powerbi', 'analytics'];
  for (const subDir of subDirs) {
    const dirPath = path.join(outputDir, subDir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).filter(f => f !== '.gitkeep');
      if (files.length > 0) return true;
    }
  }
  return false;
}

function copyDirContents(src: string, dest: string): number {
  let count = 0;
  const files = fs.readdirSync(src);
  for (const file of files) {
    if (file === '.gitkeep') continue;
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      count += copyDirContents(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

function formatTimestamp(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}${s}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}

interface BusinessContext {
  industry: string;
  companySize: string;
  region: string;
  marketSize: string;
  growthRate: string;
  marketTrends: string;
  primaryKPIs: string;
  benchmarks: string;
  painPoints: string;
  techStack: string;
}

ipcMain.handle('save-business-context', async (_, context: BusinessContext) => {
  try {
    const docsDir = path.join(OUTPUT_DIR, 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Save as JSON
    const jsonContent = {
      generatedAt: new Date().toISOString(),
      industry: {
        name: context.industry,
        companySize: context.companySize,
        region: context.region,
      },
      marketAnalysis: {
        totalAddressableMarket: context.marketSize,
        annualGrowthRate: context.growthRate,
        keyTrends: context.marketTrends.split('\n').filter(Boolean),
      },
      keyMetrics: {
        primaryKPIs: context.primaryKPIs.split('\n').filter(Boolean),
        industryBenchmarks: context.benchmarks.split('\n').filter(Boolean),
      },
      painPoints: context.painPoints.split('\n').filter(Boolean),
      technologyStack: context.techStack.split('\n').filter(Boolean),
    };

    fs.writeFileSync(
      path.join(docsDir, 'business_context.json'),
      JSON.stringify(jsonContent, null, 2)
    );

    // Save as Markdown
    const mdContent = [
      '# Business Context',
      '',
      `**Generated:** ${new Date().toLocaleString()}`,
      '',
      '## Industry Information',
      '',
      `- **Industry:** ${context.industry || 'Not specified'}`,
      `- **Company Size:** ${context.companySize || 'Not specified'}`,
      `- **Region:** ${context.region || 'Not specified'}`,
      '',
      '## Market Analysis',
      '',
      `- **Total Addressable Market:** ${context.marketSize || 'Not specified'}`,
      `- **Annual Growth Rate:** ${context.growthRate || 'Not specified'}`,
      '',
      '### Key Market Trends',
      '',
      ...(context.marketTrends ? context.marketTrends.split('\n').filter(Boolean).map(t => `- ${t}`) : ['- Not specified']),
      '',
      '## Key Performance Metrics',
      '',
      '### Primary KPIs',
      '',
      ...(context.primaryKPIs ? context.primaryKPIs.split('\n').filter(Boolean).map(k => `- ${k}`) : ['- Not specified']),
      '',
      '### Industry Benchmarks',
      '',
      ...(context.benchmarks ? context.benchmarks.split('\n').filter(Boolean).map(b => `- ${b}`) : ['- Not specified']),
      '',
      '## Common Pain Points',
      '',
      ...(context.painPoints ? context.painPoints.split('\n').filter(Boolean).map(p => `- ${p}`) : ['- Not specified']),
      '',
      '## Recommended Technology Stack',
      '',
      ...(context.techStack ? context.techStack.split('\n').filter(Boolean).map(t => `- ${t}`) : ['- Not specified']),
    ].join('\n');

    fs.writeFileSync(path.join(docsDir, 'business_context.md'), mdContent);

    return { success: true, files: ['business_context.json', 'business_context.md'] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('download-file', async (_, filename: string) => {
  try {
    const sourcePath = path.join(OUTPUT_DIR, filename);
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'File not found' };
    }
    
    const result = await dialog.showSaveDialog({
      defaultPath: path.basename(filename),
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' };
    }
    
    fs.copyFileSync(sourcePath, result.filePath);
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('download-folder', async (_, subdir: string) => {
  try {
    const sourceDir = path.join(OUTPUT_DIR, subdir);
    if (!fs.existsSync(sourceDir)) {
      return { success: false, error: 'Folder not found' };
    }
    
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: `Select destination for ${subdir} files`,
    });
    
    if (result.canceled || !result.filePaths[0]) {
      return { success: false, error: 'Cancelled' };
    }
    
    const destDir = path.join(result.filePaths[0], subdir);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    const files = fs.readdirSync(sourceDir).filter(f => f !== '.gitkeep');
    for (const file of files) {
      fs.copyFileSync(path.join(sourceDir, file), path.join(destDir, file));
    }
    
    return { success: true, filePath: destDir, fileCount: files.length };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('download-all-as-zip', async () => {
  try {
    const hasFiles = checkForOutputFiles(OUTPUT_DIR);
    if (!hasFiles) {
      return { success: false, error: 'No output files to download' };
    }
    
    const timestamp = formatTimestamp(new Date());
    const defaultName = `er_analytics_output_${timestamp}.zip`;
    
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    });
    
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelled' };
    }
    
    const tempDir = path.join(OUTPUT_DIR, '.download_temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    let filesCount = 0;
    
    // Create numbered folder structure per workflow-design-doc_v7.md
    const folderMapping: { [key: string]: { dest: string; files?: string[] } } = {
      '01-schema': { dest: '01-schema', files: ['schema.json', 'schema_processed.json'] },
      '02-database': { dest: '02-database', files: ['schema.sql'] },
      '03-data': { dest: '03-data' },
      '04-documentation': { dest: '04-documentation' },
      '05-analytics': { dest: '05-analytics' },
      '06-dashboards': { dest: '06-dashboards' },
      '07-powerbi': { dest: '07-powerbi' },
      '08-deployment': { dest: '08-deployment' },
      '09-reports': { dest: '09-reports' },
      '10-preview': { dest: '10-preview' },
    };
    
    // 01-schema: Copy root schema files and extract metadata
    const schemaDir = path.join(tempDir, '01-schema');
    fs.mkdirSync(schemaDir, { recursive: true });
    for (const file of ['schema.json', 'schema_processed.json']) {
      const srcFile = path.join(OUTPUT_DIR, file);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(schemaDir, file));
        filesCount++;
      }
    }
    // Extract and save schema_metadata.json from processed schema
    const processedSchemaPath = path.join(OUTPUT_DIR, 'schema_processed.json');
    if (fs.existsSync(processedSchemaPath)) {
      try {
        const processed = JSON.parse(fs.readFileSync(processedSchemaPath, 'utf-8'));
        if (processed.metadata) {
          fs.writeFileSync(
            path.join(schemaDir, 'schema_metadata.json'),
            JSON.stringify(processed.metadata, null, 2)
          );
          filesCount++;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // 02-database: Copy SQL files (all variants per design doc)
    const dbDir = path.join(tempDir, '02-database');
    fs.mkdirSync(dbDir, { recursive: true });
    const sqlFiles = ['schema.sql', 'schema_postgresql.sql', 'schema_mysql.sql', 'views.sql'];
    for (const sqlFileName of sqlFiles) {
      const srcSqlFile = path.join(OUTPUT_DIR, sqlFileName);
      if (fs.existsSync(srcSqlFile)) {
        fs.copyFileSync(srcSqlFile, path.join(dbDir, sqlFileName));
        filesCount++;
      }
    }
    
    // 03-data: Copy data folder contents
    const dataDir = path.join(OUTPUT_DIR, 'data');
    if (fs.existsSync(dataDir)) {
      const destDataDir = path.join(tempDir, '03-data');
      fs.mkdirSync(destDataDir, { recursive: true });
      filesCount += copyDirContents(dataDir, destDataDir);
    }
    
    // 04-documentation: Copy docs folder contents
    const docsDir = path.join(OUTPUT_DIR, 'docs');
    if (fs.existsSync(docsDir)) {
      const destDocsDir = path.join(tempDir, '04-documentation');
      fs.mkdirSync(destDocsDir, { recursive: true });
      filesCount += copyDirContents(docsDir, destDocsDir);
    }
    
    // 05-analytics: Copy analytics folder contents
    const analyticsDir = path.join(OUTPUT_DIR, 'analytics');
    if (fs.existsSync(analyticsDir)) {
      const destAnalyticsDir = path.join(tempDir, '05-analytics');
      fs.mkdirSync(destAnalyticsDir, { recursive: true });
      filesCount += copyDirContents(analyticsDir, destAnalyticsDir);
    }
    
    // 06-dashboards: Copy dashboards folder contents
    const dashboardsDir = path.join(OUTPUT_DIR, 'dashboards');
    if (fs.existsSync(dashboardsDir)) {
      const destDashboardsDir = path.join(tempDir, '06-dashboards');
      fs.mkdirSync(destDashboardsDir, { recursive: true });
      filesCount += copyDirContents(dashboardsDir, destDashboardsDir);
    }
    
    // 07-powerbi: Copy powerbi folder contents
    const powerbiDir = path.join(OUTPUT_DIR, 'powerbi');
    if (fs.existsSync(powerbiDir)) {
      const destPowerbiDir = path.join(tempDir, '07-powerbi');
      fs.mkdirSync(destPowerbiDir, { recursive: true });
      filesCount += copyDirContents(powerbiDir, destPowerbiDir);
    }
    
    // 08-deployment: Copy deploy folder contents
    const deployDir = path.join(OUTPUT_DIR, 'deploy');
    if (fs.existsSync(deployDir)) {
      const destDeployDir = path.join(tempDir, '08-deployment');
      fs.mkdirSync(destDeployDir, { recursive: true });
      filesCount += copyDirContents(deployDir, destDeployDir);
    }
    
    // 09-reports: Copy reports folder or generate execution summary
    const reportsDir = path.join(tempDir, '09-reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    
    // Copy existing reports if available
    const srcReportsDir = path.join(OUTPUT_DIR, 'reports');
    if (fs.existsSync(srcReportsDir)) {
      filesCount += copyDirContents(srcReportsDir, reportsDir);
    }
    
    // Always generate/update execution summary
    const executionSummary = {
      title: 'Pipeline Execution Summary',
      generatedAt: new Date().toISOString(),
      schema: {
        tables: 0,
        columns: 0,
        relationships: 0,
      },
      outputsIncluded: {
        schema: fs.existsSync(path.join(OUTPUT_DIR, 'schema.json')),
        database: fs.existsSync(path.join(OUTPUT_DIR, 'schema.sql')),
        data: fs.existsSync(dataDir),
        documentation: fs.existsSync(docsDir),
        analytics: fs.existsSync(analyticsDir),
        dashboards: fs.existsSync(dashboardsDir),
        powerbi: fs.existsSync(powerbiDir),
        deployment: fs.existsSync(deployDir),
      },
      totalFiles: filesCount,
    };
    
    // Try to read schema for metadata
    const schemaPath = path.join(OUTPUT_DIR, 'schema.json');
    if (fs.existsSync(schemaPath)) {
      try {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
        if (schema.tables) {
          executionSummary.schema.tables = schema.tables.length;
          executionSummary.schema.columns = schema.tables.reduce((sum: number, t: any) => sum + (t.columns?.length || 0), 0);
          executionSummary.schema.relationships = schema.tables.reduce((sum: number, t: any) => sum + (t.columns?.filter((c: any) => c.foreignKey)?.length || 0), 0);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    fs.writeFileSync(
      path.join(reportsDir, 'execution_summary.json'),
      JSON.stringify(executionSummary, null, 2)
    );
    
    // Generate markdown version
    const mdContent = [
      '# Pipeline Execution Summary',
      '',
      `**Generated:** ${new Date(executionSummary.generatedAt).toLocaleString()}`,
      '',
      '## Schema Analysis',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Tables | ${executionSummary.schema.tables} |`,
      `| Columns | ${executionSummary.schema.columns} |`,
      `| Relationships | ${executionSummary.schema.relationships} |`,
      '',
      '## Outputs Included',
      '',
      `- Schema: ${executionSummary.outputsIncluded.schema ? 'Yes' : 'No'}`,
      `- Database: ${executionSummary.outputsIncluded.database ? 'Yes' : 'No'}`,
      `- Data: ${executionSummary.outputsIncluded.data ? 'Yes' : 'No'}`,
      `- Documentation: ${executionSummary.outputsIncluded.documentation ? 'Yes' : 'No'}`,
      `- Analytics: ${executionSummary.outputsIncluded.analytics ? 'Yes' : 'No'}`,
      `- Dashboards: ${executionSummary.outputsIncluded.dashboards ? 'Yes' : 'No'}`,
      `- Power BI: ${executionSummary.outputsIncluded.powerbi ? 'Yes' : 'No'}`,
      `- Deployment: ${executionSummary.outputsIncluded.deployment ? 'Yes' : 'No'}`,
      '',
      `**Total Files:** ${executionSummary.totalFiles}`,
    ].join('\n');
    
    fs.writeFileSync(path.join(reportsDir, 'execution_summary.md'), mdContent);
    filesCount += 2;
    
    // 10-preview: Copy Preview.tsx from source
    const previewDir = path.join(tempDir, '10-preview');
    fs.mkdirSync(previewDir, { recursive: true });
    const previewSrc = path.join(__dirname, '..', 'src', 'Preview.tsx');
    if (fs.existsSync(previewSrc)) {
      fs.copyFileSync(previewSrc, path.join(previewDir, 'Preview.tsx'));
      filesCount++;
    }
    
    const { execSync } = require('child_process');
    const zipPath = result.filePath;
    
    try {
      execSync(`zip -r "${zipPath}" .`, { cwd: tempDir, stdio: 'pipe' });
    } catch {
      const tarPath = zipPath.replace('.zip', '.tar.gz');
      execSync(`tar -czvf "${tarPath}" -C "${tempDir}" .`, { stdio: 'pipe' });
    }
    
    fs.rmSync(tempDir, { recursive: true });
    
    shell.showItemInFolder(zipPath);
    
    return { success: true, filePath: zipPath, fileCount: filesCount };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

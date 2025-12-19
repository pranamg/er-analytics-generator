import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Schema, Table } from '../types/index.js';

export interface PipelineStageResult {
  stage: number;
  name: string;
  status: 'completed' | 'failed' | 'skipped';
  duration?: number;
  outputFiles?: string[];
  error?: string;
}

export interface ExecutionSummary {
  title: string;
  generatedAt: string;
  duration: number;
  schema: {
    tables: number;
    columns: number;
    relationships: number;
    complexity: string;
  };
  stages: PipelineStageResult[];
  outputs: {
    folder: string;
    files: { name: string; size: number }[];
    totalSize: number;
  };
  success: boolean;
}

export function generateExecutionSummary(
  schema: Schema,
  stages: PipelineStageResult[],
  outputDir: string,
  startTime: Date
): ExecutionSummary {
  const totalColumns = schema.tables.reduce((sum: number, t: Table) => sum + t.columns.length, 0);
  const relationships = schema.tables.reduce((sum: number, t: Table) => sum + t.columns.filter(c => c.foreignKey).length, 0);
  
  let complexity = 'Simple';
  if (schema.tables.length > 10 || relationships > 10) complexity = 'Moderate';
  if (schema.tables.length > 20 || relationships > 20) complexity = 'Complex';

  const files = getOutputFiles(outputDir);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const duration = Date.now() - startTime.getTime();

  return {
    title: 'Pipeline Execution Summary',
    generatedAt: new Date().toISOString(),
    duration,
    schema: {
      tables: schema.tables.length,
      columns: totalColumns,
      relationships,
      complexity,
    },
    stages,
    outputs: {
      folder: outputDir,
      files,
      totalSize,
    },
    success: stages.every(s => s.status !== 'failed'),
  };
}

function getOutputFiles(dir: string, basePath: string = ''): { name: string; size: number }[] {
  const files: { name: string; size: number }[] = [];
  
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;
    
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.')) {
        files.push(...getOutputFiles(fullPath, relativePath));
      }
    } else {
      const stats = fs.statSync(fullPath);
      files.push({ name: relativePath, size: stats.size });
    }
  }
  
  return files;
}

export function formatExecutionSummaryAsMarkdown(summary: ExecutionSummary): string {
  const lines: string[] = [
    `# ${summary.title}`,
    '',
    `**Generated:** ${new Date(summary.generatedAt).toLocaleString()}`,
    `**Duration:** ${(summary.duration / 1000).toFixed(2)} seconds`,
    `**Status:** ${summary.success ? 'SUCCESS' : 'FAILED'}`,
    '',
    '---',
    '',
    '## Schema Analysis',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Tables | ${summary.schema.tables} |`,
    `| Columns | ${summary.schema.columns} |`,
    `| Relationships | ${summary.schema.relationships} |`,
    `| Complexity | ${summary.schema.complexity} |`,
    '',
    '---',
    '',
    '## Pipeline Stages',
    '',
    '| Stage | Name | Status | Duration |',
    '|-------|------|--------|----------|',
  ];

  for (const stage of summary.stages) {
    const statusIcon = stage.status === 'completed' ? 'PASS' : stage.status === 'failed' ? 'FAIL' : 'SKIP';
    const duration = stage.duration ? `${stage.duration}ms` : '-';
    lines.push(`| ${stage.stage} | ${stage.name} | ${statusIcon} | ${duration} |`);
  }

  lines.push('', '---', '', '## Output Files', '');

  const filesByFolder = new Map<string, { name: string; size: number }[]>();
  for (const file of summary.outputs.files) {
    const folder = path.dirname(file.name) || '.';
    if (!filesByFolder.has(folder)) {
      filesByFolder.set(folder, []);
    }
    filesByFolder.get(folder)!.push(file);
  }

  for (const [folder, files] of filesByFolder) {
    lines.push(`### ${folder === '.' ? 'Root' : folder}/`);
    lines.push('');
    for (const file of files) {
      const sizeStr = formatFileSize(file.size);
      lines.push(`- \`${path.basename(file.name)}\` (${sizeStr})`);
    }
    lines.push('');
  }

  lines.push('---', '');
  lines.push(`**Total Files:** ${summary.outputs.files.length}`);
  lines.push(`**Total Size:** ${formatFileSize(summary.outputs.totalSize)}`);

  return lines.join('\n');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function saveExecutionSummary(
  summary: ExecutionSummary,
  outputDir: string
): Promise<void> {
  const reportsDir = path.join(outputDir, 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(reportsDir, 'execution_summary.json'),
    JSON.stringify(summary, null, 2)
  );

  fs.writeFileSync(
    path.join(reportsDir, 'execution_summary.md'),
    formatExecutionSummaryAsMarkdown(summary)
  );
}

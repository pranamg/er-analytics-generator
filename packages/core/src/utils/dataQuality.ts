import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DataQualityMetrics {
  fileName: string;
  rowCount: number;
  columnCount: number;
  nullCounts: Record<string, number>;
  uniqueCounts: Record<string, number>;
  dataTypes: Record<string, string>;
  issues: string[];
}

export interface DataQualityReport {
  generatedAt: string;
  dataDirectory: string;
  files: DataQualityMetrics[];
  summary: {
    totalFiles: number;
    totalRows: number;
    totalIssues: number;
    overallScore: number;
  };
}

export function analyzeCSVFile(filePath: string): DataQualityMetrics {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const fileName = path.basename(filePath);
  
  if (lines.length === 0) {
    return {
      fileName,
      rowCount: 0,
      columnCount: 0,
      nullCounts: {},
      uniqueCounts: {},
      dataTypes: {},
      issues: ['File is empty'],
    };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1);
  const issues: string[] = [];

  const columnData: Record<string, string[]> = {};
  for (const header of headers) {
    columnData[header] = [];
  }

  for (let i = 0; i < rows.length; i++) {
    const values = parseCSVLine(rows[i]);
    if (values.length !== headers.length) {
      issues.push(`Row ${i + 2}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
    }
    for (let j = 0; j < headers.length; j++) {
      columnData[headers[j]].push(values[j] || '');
    }
  }

  const nullCounts: Record<string, number> = {};
  const uniqueCounts: Record<string, number> = {};
  const dataTypes: Record<string, string> = {};

  for (const header of headers) {
    const values = columnData[header];
    nullCounts[header] = values.filter(v => !v || v.trim() === '' || v.toLowerCase() === 'null').length;
    uniqueCounts[header] = new Set(values.filter(v => v && v.trim() !== '')).size;
    dataTypes[header] = inferDataType(values);

    // Check for high null rate
    const nullRate = nullCounts[header] / values.length;
    if (nullRate > 0.5) {
      issues.push(`Column '${header}' has high null rate (${(nullRate * 100).toFixed(1)}%)`);
    }

    // Check for low cardinality on ID columns
    if (header.toLowerCase().includes('id') && uniqueCounts[header] < values.length * 0.5) {
      issues.push(`Column '${header}' has low cardinality for an ID column`);
    }
  }

  return {
    fileName,
    rowCount: rows.length,
    columnCount: headers.length,
    nullCounts,
    uniqueCounts,
    dataTypes,
    issues,
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function inferDataType(values: string[]): string {
  const nonEmpty = values.filter(v => v && v.trim() !== '');
  if (nonEmpty.length === 0) return 'unknown';

  const sample = nonEmpty.slice(0, 100);

  const allIntegers = sample.every(v => /^-?\d+$/.test(v));
  if (allIntegers) return 'integer';

  const allNumbers = sample.every(v => /^-?\d+(\.\d+)?$/.test(v));
  if (allNumbers) return 'decimal';

  const allDates = sample.every(v => /^\d{4}-\d{2}-\d{2}/.test(v));
  if (allDates) return 'date';

  const allBooleans = sample.every(v => /^(true|false|yes|no|1|0)$/i.test(v));
  if (allBooleans) return 'boolean';

  return 'string';
}

export function generateDataQualityReport(dataDir: string): DataQualityReport {
  const files: DataQualityMetrics[] = [];
  let totalRows = 0;
  let totalIssues = 0;

  if (fs.existsSync(dataDir)) {
    const csvFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));
    
    for (const csvFile of csvFiles) {
      const metrics = analyzeCSVFile(path.join(dataDir, csvFile));
      files.push(metrics);
      totalRows += metrics.rowCount;
      totalIssues += metrics.issues.length;
    }
  }

  // Calculate overall score (100 - penalty for issues)
  const issuePenalty = Math.min(totalIssues * 5, 50);
  const overallScore = Math.max(0, 100 - issuePenalty);

  return {
    generatedAt: new Date().toISOString(),
    dataDirectory: dataDir,
    files,
    summary: {
      totalFiles: files.length,
      totalRows,
      totalIssues,
      overallScore,
    },
  };
}

export function formatDataQualityReportAsMarkdown(report: DataQualityReport): string {
  const lines: string[] = [
    '# Data Quality Report',
    '',
    `**Generated:** ${new Date(report.generatedAt).toLocaleString()}`,
    `**Data Directory:** ${report.dataDirectory}`,
    '',
    '---',
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Files | ${report.summary.totalFiles} |`,
    `| Total Rows | ${report.summary.totalRows.toLocaleString()} |`,
    `| Total Issues | ${report.summary.totalIssues} |`,
    `| Quality Score | ${report.summary.overallScore}/100 |`,
    '',
  ];

  if (report.summary.overallScore >= 90) {
    lines.push('**Status:** Excellent data quality');
  } else if (report.summary.overallScore >= 70) {
    lines.push('**Status:** Good data quality with minor issues');
  } else if (report.summary.overallScore >= 50) {
    lines.push('**Status:** Acceptable quality, review recommended');
  } else {
    lines.push('**Status:** Poor quality, action required');
  }

  lines.push('', '---', '', '## File Analysis', '');

  for (const file of report.files) {
    lines.push(`### ${file.fileName}`);
    lines.push('');
    lines.push(`- **Rows:** ${file.rowCount.toLocaleString()}`);
    lines.push(`- **Columns:** ${file.columnCount}`);
    lines.push('');

    if (file.issues.length > 0) {
      lines.push('**Issues:**');
      for (const issue of file.issues) {
        lines.push(`- ${issue}`);
      }
      lines.push('');
    } else {
      lines.push('**No issues detected.**');
      lines.push('');
    }

    lines.push('**Column Types:**');
    lines.push('');
    lines.push('| Column | Type | Nulls | Unique |');
    lines.push('|--------|------|-------|--------|');
    for (const col of Object.keys(file.dataTypes)) {
      lines.push(`| ${col} | ${file.dataTypes[col]} | ${file.nullCounts[col]} | ${file.uniqueCounts[col]} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function saveDataQualityReport(
  dataDir: string,
  outputDir: string
): Promise<void> {
  const report = generateDataQualityReport(dataDir);
  
  const reportsDir = path.join(outputDir, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(reportsDir, 'data_quality_report.json'),
    JSON.stringify(report, null, 2)
  );

  fs.writeFileSync(
    path.join(reportsDir, 'data_quality_report.md'),
    formatDataQualityReportAsMarkdown(report)
  );
}

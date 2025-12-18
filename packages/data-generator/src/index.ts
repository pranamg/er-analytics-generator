import { faker } from '@faker-js/faker';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Schema, Table, Column, DataGenerationConfig } from '@er-analytics/core';

export interface GeneratedData {
  [tableName: string]: Record<string, unknown>[];
}

export interface DataGeneratorOptions {
  outputDir?: string;
  format?: 'json' | 'csv';
  seed?: number;
}

export async function generateData(
  schema: Schema,
  dependencyOrder: string[],
  config: Partial<DataGenerationConfig> = {},
  options: DataGeneratorOptions = {}
): Promise<GeneratedData> {
  if (config.seed) {
    faker.seed(config.seed);
  }

  const data: GeneratedData = {};
  const defaultRowCounts: Record<string, number> = {
    ref_: 5,
    default: 10,
  };

  for (const tableName of dependencyOrder) {
    const table = schema.tables.find(t => t.name === tableName);
    if (!table) continue;

    const rowCount = config.rowCounts?.[tableName] ?? 
      (tableName.toLowerCase().startsWith('ref_') ? 5 : 10);

    data[tableName] = generateTableData(table, rowCount, data);
  }

  if (options.outputDir) {
    await saveData(data, options.outputDir, options.format || 'csv');
  }

  return data;
}

function generateTableData(
  table: Table,
  rowCount: number,
  existingData: GeneratedData
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, unknown> = {};

    for (const column of table.columns) {
      row[column.name] = generateColumnValue(column, i + 1, existingData);
    }

    rows.push(row);
  }

  return rows;
}

function generateColumnValue(
  column: Column,
  index: number,
  existingData: GeneratedData
): unknown {
  if (column.primaryKey && !column.foreignKey) {
    return index;
  }

  if (column.foreignKey) {
    const match = column.foreignKey.match(/^(\w+)\((\w+)\)$/);
    if (match) {
      const [, refTable, refColumn] = match;
      const refData = existingData[refTable];
      if (refData && refData.length > 0) {
        const randomRow = refData[Math.floor(Math.random() * refData.length)];
        return randomRow[refColumn];
      }
    }
    return index;
  }

  const type = column.type.toUpperCase();
  const name = column.name.toLowerCase();

  if (name.includes('date') || name.includes('time')) {
    return generateDate(name);
  }

  if (name.includes('email')) {
    return faker.internet.email();
  }

  if (name.includes('phone')) {
    return faker.phone.number();
  }

  if (name.includes('name') || name.includes('details')) {
    if (name.includes('company') || name.includes('agency') || name.includes('client')) {
      return faker.company.name();
    }
    if (name.includes('staff') || name.includes('user')) {
      return faker.person.fullName();
    }
    return faker.lorem.words(3);
  }

  if (name.includes('amount') || name.includes('price') || name.includes('cost')) {
    return parseFloat((Math.random() * 50000 + 5000).toFixed(2));
  }

  if (name.includes('description') || name.includes('purpose') || name.includes('other')) {
    return faker.lorem.sentence();
  }

  if (name.includes('code')) {
    return faker.string.alphanumeric(5).toUpperCase();
  }

  if (name.includes('_yn') || name.includes('active') || name.includes('enabled')) {
    return Math.random() > 0.3 ? 'Y' : 'N';
  }

  if (type.includes('INT') || type.includes('NUMBER')) {
    return Math.floor(Math.random() * 100) + 1;
  }

  if (type.includes('DECIMAL') || type.includes('FLOAT') || type.includes('DOUBLE')) {
    return parseFloat((Math.random() * 1000).toFixed(2));
  }

  if (type.includes('CHAR') || type.includes('VARCHAR') || type.includes('TEXT')) {
    return faker.lorem.words(2);
  }

  if (type.includes('BOOL')) {
    return Math.random() > 0.5;
  }

  return faker.lorem.word();
}

function generateDate(columnName: string): string {
  const now = new Date();
  const monthsAgo = Math.floor(Math.random() * 12);
  const date = new Date(now);
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(Math.floor(Math.random() * 28) + 1);

  if (columnName.includes('time')) {
    return date.toISOString();
  }
  return date.toISOString().split('T')[0];
}

async function saveData(
  data: GeneratedData,
  outputDir: string,
  format: 'json' | 'csv'
): Promise<void> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const [tableName, rows] of Object.entries(data)) {
    const filename = `${tableName}.${format}`;
    const filepath = path.join(outputDir, filename);

    if (format === 'json') {
      fs.writeFileSync(filepath, JSON.stringify(rows, null, 2));
    } else {
      const csv = convertToCSV(rows);
      fs.writeFileSync(filepath, csv);
    }
  }
}

function convertToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val ?? '');
      }).join(',')
    ),
  ];

  return lines.join('\n');
}

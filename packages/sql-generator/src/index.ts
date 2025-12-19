import type { Schema, Table, Column } from '@er-analytics/core';

export type DatabaseDialect = 'postgresql' | 'mysql' | 'sqlite';

export interface SQLGeneratorOptions {
  dialect?: DatabaseDialect;
  includeViews?: boolean;
  includeIndexes?: boolean;
  includeComments?: boolean;
}

export function generateSQL(schema: Schema, options: SQLGeneratorOptions = {}): string {
  const dialect = options.dialect || 'postgresql';
  const lines: string[] = [];

  lines.push(`-- Database Schema`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Dialect: ${dialect}`);
  lines.push(`-- Tables: ${schema.tables.length}`);
  lines.push('');

  for (const table of schema.tables) {
    lines.push(generateCreateTable(table, dialect));
    lines.push('');
  }

  lines.push('-- Foreign Key Constraints');
  lines.push('');
  for (const table of schema.tables) {
    const fkStatements = generateForeignKeys(table, dialect);
    if (fkStatements) {
      lines.push(fkStatements);
      lines.push('');
    }
  }

  if (options.includeIndexes) {
    lines.push('-- Indexes');
    lines.push('');
    for (const table of schema.tables) {
      lines.push(generateIndexes(table));
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateCreateTable(table: Table, dialect: DatabaseDialect): string {
  const lines: string[] = [];
  lines.push(`CREATE TABLE ${table.name} (`);

  const pkColumns = table.columns.filter(c => c.primaryKey);
  const columnDefs = table.columns.map((col, idx) => {
    const parts: string[] = [];
    parts.push(`    ${col.name}`);
    parts.push(mapDataType(col.type, dialect));
    
    if (col.primaryKey && pkColumns.length === 1) {
      parts.push('PRIMARY KEY');
    }
    
    if (!col.nullable && !col.primaryKey) {
      parts.push('NOT NULL');
    }

    const isLast = idx === table.columns.length - 1 && pkColumns.length <= 1;
    return parts.join(' ') + (isLast ? '' : ',');
  });

  lines.push(...columnDefs);

  if (pkColumns.length > 1) {
    const pkNames = pkColumns.map(c => c.name).join(', ');
    lines.push(`    PRIMARY KEY (${pkNames})`);
  }

  lines.push(');');
  return lines.join('\n');
}

function generateForeignKeys(table: Table, dialect: DatabaseDialect): string {
  const fkColumns = table.columns.filter(c => c.foreignKey);
  if (fkColumns.length === 0) return '';

  const statements = fkColumns.map(col => {
    const match = col.foreignKey!.match(/^(\w+)\((\w+)\)$/);
    if (!match) return '';
    const [, refTable, refColumn] = match;
    
    return `ALTER TABLE ${table.name}\n    ADD FOREIGN KEY (${col.name}) REFERENCES ${refTable}(${refColumn});`;
  });

  return statements.filter(Boolean).join('\n\n');
}

function generateIndexes(table: Table): string {
  const indexColumns = table.columns.filter(c => c.foreignKey || c.name.includes('date'));
  
  return indexColumns
    .map(col => `CREATE INDEX idx_${table.name.toLowerCase()}_${col.name} ON ${table.name}(${col.name});`)
    .join('\n');
}

function mapDataType(type: string, dialect: DatabaseDialect): string {
  const normalized = type.toUpperCase();
  
  if (dialect === 'postgresql') {
    if (normalized === 'INT' && type.includes('AUTO')) return 'SERIAL';
    return type;
  }
  
  if (dialect === 'mysql') {
    if (normalized.includes('SERIAL')) return 'INT AUTO_INCREMENT';
    return type;
  }
  
  return type;
}

export function generateViewSQL(schema: Schema): string {
  const lines: string[] = [
    '-- Database Views',
    `-- Generated: ${new Date().toISOString()}`,
    '',
  ];
  
  const clientTable = schema.tables.find(t => 
    t.name.toLowerCase().includes('client') || t.name.toLowerCase().includes('customer')
  );
  
  const invoiceTable = schema.tables.find(t =>
    t.name.toLowerCase().includes('invoice')
  );

  const meetingTable = schema.tables.find(t =>
    t.name.toLowerCase().includes('meeting')
  );

  const paymentTable = schema.tables.find(t =>
    t.name.toLowerCase().includes('payment')
  );

  if (clientTable) {
    lines.push('-- Client summary view');
    lines.push(`CREATE OR REPLACE VIEW client_summary AS`);
    lines.push(`SELECT * FROM ${clientTable.name};`);
    lines.push('');
  }
  
  if (invoiceTable && clientTable) {
    lines.push('-- Invoice summary with client info');
    lines.push(`CREATE OR REPLACE VIEW invoice_summary AS`);
    lines.push(`SELECT i.*, c.* FROM ${invoiceTable.name} i`);
    lines.push(`LEFT JOIN ${clientTable.name} c ON i.client_id = c.client_id;`);
    lines.push('');
  }

  if (meetingTable) {
    lines.push('-- Recent meetings view');
    lines.push(`CREATE OR REPLACE VIEW recent_meetings AS`);
    lines.push(`SELECT * FROM ${meetingTable.name}`);
    lines.push(`ORDER BY start_date_time DESC LIMIT 100;`);
    lines.push('');
  }

  if (paymentTable && invoiceTable) {
    lines.push('-- Payment status view');
    lines.push(`CREATE OR REPLACE VIEW payment_status AS`);
    lines.push(`SELECT i.*, COALESCE(SUM(p.amount), 0) as total_paid,`);
    lines.push(`       i.amount - COALESCE(SUM(p.amount), 0) as balance_due`);
    lines.push(`FROM ${invoiceTable.name} i`);
    lines.push(`LEFT JOIN ${paymentTable.name} p ON i.invoice_id = p.invoice_id`);
    lines.push(`GROUP BY i.invoice_id;`);
    lines.push('');
  }

  // Revenue summary view
  if (clientTable && invoiceTable) {
    lines.push('-- Revenue by client view');
    lines.push(`CREATE OR REPLACE VIEW revenue_by_client AS`);
    lines.push(`SELECT c.client_id, c.client_name,`);
    lines.push(`       COUNT(i.invoice_id) as invoice_count,`);
    lines.push(`       SUM(i.amount) as total_revenue`);
    lines.push(`FROM ${clientTable.name} c`);
    lines.push(`LEFT JOIN ${invoiceTable.name} i ON c.client_id = i.client_id`);
    lines.push(`GROUP BY c.client_id, c.client_name;`);
    lines.push('');
  }

  return lines.join('\n');
}

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface SQLOutputFiles {
  'schema.sql': string;
  'schema_postgresql.sql': string;
  'schema_mysql.sql': string;
  'views.sql': string;
}

export function generateAllSQLFiles(schema: Schema): SQLOutputFiles {
  return {
    'schema.sql': generateSQL(schema, { dialect: 'postgresql', includeIndexes: true }),
    'schema_postgresql.sql': generateSQL(schema, { dialect: 'postgresql', includeIndexes: true }),
    'schema_mysql.sql': generateSQL(schema, { dialect: 'mysql', includeIndexes: true }),
    'views.sql': generateViewSQL(schema),
  };
}

export async function saveAllSQLFiles(schema: Schema, outputDir: string): Promise<void> {
  const files = generateAllSQLFiles(schema);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(outputDir, filename), content);
  }
}

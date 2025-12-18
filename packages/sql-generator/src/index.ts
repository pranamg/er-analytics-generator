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
  const lines: string[] = ['-- Useful Views', ''];
  
  const clientTable = schema.tables.find(t => 
    t.name.toLowerCase().includes('client') || t.name.toLowerCase().includes('customer')
  );
  
  if (clientTable) {
    lines.push(`CREATE VIEW client_summary AS`);
    lines.push(`SELECT * FROM ${clientTable.name};`);
    lines.push('');
  }
  
  return lines.join('\n');
}

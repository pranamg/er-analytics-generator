import type { Schema, Table, Column } from '@er-analytics/core';

export interface ProcessedSchema {
  schema: Schema;
  metadata: {
    tableCount: number;
    totalColumns: number;
    relationships: number;
    complexity: 'simple' | 'medium' | 'complex';
  };
  dependencyOrder: string[];
  validationErrors: string[];
}

export function processSchema(schema: Schema): ProcessedSchema {
  const validationErrors = validateSchema(schema);
  const metadata = calculateMetadata(schema);
  const dependencyOrder = calculateDependencyOrder(schema);

  return {
    schema: enhanceSchema(schema),
    metadata,
    dependencyOrder,
    validationErrors,
  };
}

function validateSchema(schema: Schema): string[] {
  const errors: string[] = [];
  const tableNames = new Set(schema.tables.map(t => t.name));

  for (const table of schema.tables) {
    for (const column of table.columns) {
      if (column.foreignKey) {
        const match = column.foreignKey.match(/^(\w+)\((\w+)\)$/);
        if (match) {
          const [, refTable] = match;
          if (!tableNames.has(refTable)) {
            errors.push(`Table ${table.name}: FK references unknown table ${refTable}`);
          }
        }
      }
    }
  }

  return errors;
}

function calculateMetadata(schema: Schema): ProcessedSchema['metadata'] {
  const totalColumns = schema.tables.reduce((sum, t) => sum + t.columns.length, 0);
  const relationships = schema.tables.reduce(
    (sum, t) => sum + t.columns.filter(c => c.foreignKey).length,
    0
  );

  let complexity: 'simple' | 'medium' | 'complex' = 'simple';
  if (schema.tables.length > 20 || relationships > 30) {
    complexity = 'complex';
  } else if (schema.tables.length > 10 || relationships > 15) {
    complexity = 'medium';
  }

  return {
    tableCount: schema.tables.length,
    totalColumns,
    relationships,
    complexity,
  };
}

function calculateDependencyOrder(schema: Schema): string[] {
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const table of schema.tables) {
    graph.set(table.name, new Set());
    inDegree.set(table.name, 0);
  }

  for (const table of schema.tables) {
    for (const column of table.columns) {
      if (column.foreignKey) {
        const match = column.foreignKey.match(/^(\w+)\(/);
        if (match) {
          const refTable = match[1];
          if (graph.has(refTable)) {
            graph.get(refTable)!.add(table.name);
            inDegree.set(table.name, (inDegree.get(table.name) || 0) + 1);
          }
        }
      }
    }
  }

  const queue: string[] = [];
  const result: string[] = [];

  for (const [table, degree] of inDegree) {
    if (degree === 0) queue.push(table);
  }

  while (queue.length > 0) {
    const table = queue.shift()!;
    result.push(table);

    for (const dependent of graph.get(table) || []) {
      inDegree.set(dependent, (inDegree.get(dependent) || 0) - 1);
      if (inDegree.get(dependent) === 0) {
        queue.push(dependent);
      }
    }
  }

  return result;
}

function enhanceSchema(schema: Schema): Schema {
  return {
    ...schema,
    tables: schema.tables.map(table => ({
      ...table,
      columns: table.columns.map(column => ({
        ...column,
        nullable: column.nullable ?? !column.primaryKey,
      })),
    })),
  };
}

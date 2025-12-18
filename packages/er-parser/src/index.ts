import * as fs from 'node:fs';
import * as path from 'node:path';
import mime from 'mime-types';
import sharp from 'sharp';
import { 
  createProvider, 
  getProviderFromEnv,
  type AIProvider,
  type AIProviderConfig,
  type VisionParseResult,
  type Schema 
} from '@er-analytics/core';

export interface ParseOptions {
  provider?: AIProviderConfig;
  outputPath?: string;
  validate?: boolean;
}

async function convertToSupportedFormat(inputBuffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const unsupportedFormats = ['image/gif', 'image/bmp', 'image/tiff'];
  
  if (unsupportedFormats.includes(mimeType.toLowerCase())) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pngBuffer = await (sharp as any)(inputBuffer).png().toBuffer();
    return { buffer: pngBuffer, mimeType: 'image/png' };
  }
  
  return { buffer: inputBuffer, mimeType };
}

export async function parseERDiagram(
  imagePath: string,
  options: ParseOptions = {}
): Promise<VisionParseResult> {
  const absolutePath = path.resolve(imagePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Image file not found: ${absolutePath}`);
  }

  const rawBuffer = fs.readFileSync(absolutePath);
  let mimeType = mime.lookup(absolutePath) || 'image/png';
  
  const converted = await convertToSupportedFormat(rawBuffer, mimeType);
  const imageBuffer = converted.buffer;
  mimeType = converted.mimeType;
  
  const provider = options.provider 
    ? createProvider(options.provider)
    : getProviderFromEnv();

  const result = await provider.parseERDiagram(imageBuffer, mimeType);

  if (options.outputPath) {
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(
      options.outputPath,
      JSON.stringify(result.schema, null, 2)
    );
  }

  return result;
}

export async function parseERDiagramFromBuffer(
  imageBuffer: Buffer,
  mimeType: string,
  options: ParseOptions = {}
): Promise<VisionParseResult> {
  const provider = options.provider 
    ? createProvider(options.provider)
    : getProviderFromEnv();

  return provider.parseERDiagram(imageBuffer, mimeType);
}

export function validateSchema(schema: Schema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const tableNames = new Set<string>();

  for (const table of schema.tables) {
    if (tableNames.has(table.name)) {
      errors.push(`Duplicate table name: ${table.name}`);
    }
    tableNames.add(table.name);

    const columnNames = new Set<string>();
    let hasPrimaryKey = false;

    for (const column of table.columns) {
      if (columnNames.has(column.name)) {
        errors.push(`Duplicate column name in ${table.name}: ${column.name}`);
      }
      columnNames.add(column.name);

      if (column.primaryKey) {
        hasPrimaryKey = true;
      }

      if (column.foreignKey) {
        const match = column.foreignKey.match(/^(\w+)\((\w+)\)$/);
        if (!match) {
          errors.push(`Invalid foreign key format in ${table.name}.${column.name}: ${column.foreignKey}`);
        } else {
          const [, refTable] = match;
          if (!tableNames.has(refTable) && !schema.tables.some(t => t.name === refTable)) {
            errors.push(`Foreign key references unknown table: ${refTable}`);
          }
        }
      }
    }

    if (!hasPrimaryKey) {
      errors.push(`Table ${table.name} has no primary key`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export { type Schema, type VisionParseResult } from '@er-analytics/core';

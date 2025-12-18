import { z } from 'zod';

// Column Schema
export const ColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  primaryKey: z.boolean().optional().default(false),
  foreignKey: z.string().nullable().optional(),
  nullable: z.boolean().optional().default(true),
  defaultValue: z.string().nullable().optional(),
});

export type Column = z.infer<typeof ColumnSchema>;

// Table Schema
export const TableSchema = z.object({
  name: z.string(),
  columns: z.array(ColumnSchema),
  description: z.string().optional(),
});

export type Table = z.infer<typeof TableSchema>;

// Full Database Schema
export const DatabaseSchema = z.object({
  tables: z.array(TableSchema),
  metadata: z.object({
    tableCount: z.number(),
    totalColumns: z.number(),
    relationships: z.number(),
    complexity: z.enum(['simple', 'medium', 'complex']),
  }).optional(),
  dependencyOrder: z.array(z.string()).optional(),
});

export type Schema = z.infer<typeof DatabaseSchema>;

// AI Provider Types
export type AIProviderName = 'claude' | 'gemini' | 'openai';

export interface AIProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  model?: string;
}

export interface VisionParseResult {
  schema: Schema;
  confidence: number;
  warnings: string[];
}

export interface TextGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

// Pipeline Stage Types
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface StageResult<T = unknown> {
  stageName: string;
  status: StageStatus;
  data?: T;
  error?: string;
  duration?: number;
}

export interface PipelineConfig {
  inputImage: string;
  outputDir: string;
  provider: AIProviderName;
  stages?: string[];
  options?: Record<string, unknown>;
}

// Synthetic Data Types
export interface DataGenerationConfig {
  schema: Schema;
  rowCounts?: Record<string, number>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  seed?: number;
}

// Requirements Document Types
export interface Question {
  question: string;
  answerType: string;
  sqlComplexity: 'Simple' | 'Moderate' | 'Complex';
  tables: string[];
}

export interface StakeholderRequirements {
  role: string;
  level: 'Basic' | 'Intermediate' | 'Advanced';
  questions: Question[];
}

export interface RequirementsDocument {
  title: string;
  generatedFrom: string;
  stakeholders: StakeholderRequirements[];
}

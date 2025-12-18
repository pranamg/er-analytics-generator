#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from 'dotenv';
import { parseERDiagram, validateSchema } from './index.js';
import type { AIProviderName } from '@er-analytics/core';

config({ path: path.resolve(process.cwd(), '.env') });

program
  .name('er-parse')
  .description('Parse ER diagram images using Vision APIs')
  .version('0.1.0');

program
  .argument('<image>', 'Path to ER diagram image (PNG, JPG, GIF)')
  .option('-p, --provider <provider>', 'AI provider (claude|gemini|openai)', 'claude')
  .option('-o, --output <path>', 'Output path for parsed schema JSON')
  .option('-v, --validate', 'Validate the parsed schema', false)
  .option('--api-key <key>', 'API key (overrides environment variable)')
  .action(async (imagePath: string, options) => {
    const spinner = ora('Parsing ER diagram...').start();
    
    try {
      const provider = options.provider as AIProviderName;
      const apiKey = options.apiKey || getApiKeyForProvider(provider);
      
      if (!apiKey) {
        spinner.fail(chalk.red(`No API key found for provider: ${provider}`));
        console.log(chalk.yellow(`Set ${getEnvVarName(provider)} environment variable or use --api-key`));
        process.exit(1);
      }

      const outputPath = options.output || `./outputs/schema_${Date.now()}.json`;
      
      spinner.text = `Parsing with ${provider}...`;
      
      const result = await parseERDiagram(imagePath, {
        provider: { provider, apiKey },
        outputPath,
      });

      spinner.succeed(chalk.green('ER diagram parsed successfully!'));
      
      console.log(chalk.cyan('\n--- Schema Summary ---'));
      console.log(`Tables found: ${chalk.bold(result.schema.tables.length)}`);
      console.log(`Confidence: ${chalk.bold((result.confidence * 100).toFixed(1))}%`);
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\nWarnings:'));
        result.warnings.forEach(w => console.log(`  - ${w}`));
      }

      console.log(chalk.cyan('\n--- Tables ---'));
      result.schema.tables.forEach(table => {
        const pkCount = table.columns.filter(c => c.primaryKey).length;
        const fkCount = table.columns.filter(c => c.foreignKey).length;
        console.log(`  ${chalk.bold(table.name)}: ${table.columns.length} columns (${pkCount} PK, ${fkCount} FK)`);
      });

      if (options.validate) {
        console.log(chalk.cyan('\n--- Validation ---'));
        const validation = validateSchema(result.schema);
        if (validation.valid) {
          console.log(chalk.green('  Schema is valid!'));
        } else {
          console.log(chalk.red('  Schema has issues:'));
          validation.errors.forEach(e => console.log(chalk.red(`    - ${e}`)));
        }
      }

      console.log(chalk.green(`\nSchema saved to: ${outputPath}`));
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to parse ER diagram'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

function getApiKeyForProvider(provider: AIProviderName): string | undefined {
  const envVars: Record<AIProviderName, string> = {
    claude: 'ANTHROPIC_API_KEY',
    gemini: 'GOOGLE_AI_API_KEY',
    openai: 'OPENAI_API_KEY',
  };
  return process.env[envVars[provider]];
}

function getEnvVarName(provider: AIProviderName): string {
  const envVars: Record<AIProviderName, string> = {
    claude: 'ANTHROPIC_API_KEY',
    gemini: 'GOOGLE_AI_API_KEY',
    openai: 'OPENAI_API_KEY',
  };
  return envVars[provider];
}

program.parse();

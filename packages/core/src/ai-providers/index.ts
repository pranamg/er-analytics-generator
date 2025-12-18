import type { AIProviderName, AIProviderConfig, VisionParseResult, TextGenerationOptions, Schema } from '../types/index.js';
import { ClaudeProvider } from './claude.js';
import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';

export interface AIProvider {
  name: AIProviderName;
  parseERDiagram(imageBuffer: Buffer, mimeType: string): Promise<VisionParseResult>;
  generateText(prompt: string, options?: TextGenerationOptions): Promise<string>;
}

export function createProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(config.apiKey, config.model);
    case 'gemini':
      return new GeminiProvider(config.apiKey, config.model);
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

export function getProviderFromEnv(): AIProvider {
  const provider = (process.env.DEFAULT_AI_PROVIDER || 'claude') as AIProviderName;
  
  const apiKeyMap: Record<AIProviderName, string | undefined> = {
    claude: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GOOGLE_AI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };
  
  const apiKey = apiKeyMap[provider];
  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`);
  }
  
  return createProvider({ provider, apiKey });
}

export { ClaudeProvider } from './claude.js';
export { GeminiProvider } from './gemini.js';
export { OpenAIProvider } from './openai.js';

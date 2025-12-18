import OpenAI from 'openai';
import type { AIProvider } from './index.js';
import type { VisionParseResult, TextGenerationOptions } from '../types/index.js';
import { DatabaseSchema } from '../types/index.js';

const ER_PARSE_PROMPT = `Analyze this ER diagram image and extract the complete database schema as JSON.

For each table, identify:
1. Table name
2. All columns with their data types
3. Primary keys (mark with primaryKey: true)
4. Foreign keys (format: "ReferencedTable(referenced_column)")

Return ONLY valid JSON in this exact format:
{
  "tables": [
    {
      "name": "TableName",
      "columns": [
        {
          "name": "column_name",
          "type": "DATA_TYPE",
          "primaryKey": true,
          "foreignKey": null
        }
      ]
    }
  ]
}

Be thorough - extract ALL tables and ALL columns visible in the diagram.`;

export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o';
  }

  async parseERDiagram(imageBuffer: Buffer, mimeType: string): Promise<VisionParseResult> {
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
            {
              type: 'text',
              text: ER_PARSE_PROMPT,
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error('No response from OpenAI');
    }

    const jsonStr = this.extractJSON(text);
    const parsed = JSON.parse(jsonStr);
    
    const validated = DatabaseSchema.parse(parsed);
    
    return {
      schema: validated,
      confidence: 0.92,
      warnings: [],
    };
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature || 0.7,
      messages,
    });

    return response.choices[0]?.message?.content || '';
  }

  private extractJSON(text: string): string {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      return braceMatch[0];
    }
    
    return text.trim();
  }
}

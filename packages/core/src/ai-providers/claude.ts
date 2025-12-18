import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from './index.js';
import type { VisionParseResult, TextGenerationOptions, Schema } from '../types/index.js';
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
        },
        {
          "name": "foreign_column",
          "type": "INT",
          "primaryKey": false,
          "foreignKey": "OtherTable(id)"
        }
      ]
    }
  ]
}

Be thorough - extract ALL tables and ALL columns visible in the diagram.`;

export class ClaudeProvider implements AIProvider {
  name = 'claude' as const;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-sonnet-4-20250514';
  }

  async parseERDiagram(imageBuffer: Buffer, mimeType: string): Promise<VisionParseResult> {
    const base64Image = imageBuffer.toString('base64');
    const mediaType = this.normalizeMediaType(mimeType);
    
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: ER_PARSE_PROMPT,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const jsonStr = this.extractJSON(textContent.text);
    const parsed = JSON.parse(jsonStr);
    
    const validated = DatabaseSchema.parse(parsed);
    
    return {
      schema: validated,
      confidence: 0.95,
      warnings: [],
    };
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: prompt },
    ];

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens || 2048,
      system: options?.systemPrompt,
      messages,
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return textContent.text;
  }

  private normalizeMediaType(mimeType: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    const normalized = mimeType.toLowerCase();
    if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'image/jpeg';
    if (normalized.includes('png')) return 'image/png';
    if (normalized.includes('gif')) return 'image/gif';
    if (normalized.includes('webp')) return 'image/webp';
    return 'image/png';
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

import { GoogleGenerativeAI } from '@google/generative-ai';
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

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model || 'gemini-2.5-flash';
  }

  async parseERDiagram(imageBuffer: Buffer, mimeType: string): Promise<VisionParseResult> {
    const genModel = this.client.getGenerativeModel({ model: this.model });
    
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    const result = await genModel.generateContent([ER_PARSE_PROMPT, imagePart]);
    const response = result.response;
    const text = response.text();

    const jsonStr = this.extractJSON(text);
    const parsed = JSON.parse(jsonStr);
    
    const validated = DatabaseSchema.parse(parsed);
    
    return {
      schema: validated,
      confidence: 0.90,
      warnings: [],
    };
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    const genModel = this.client.getGenerativeModel({ 
      model: this.model,
      systemInstruction: options?.systemPrompt,
    });

    const result = await genModel.generateContent(prompt);
    return result.response.text();
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

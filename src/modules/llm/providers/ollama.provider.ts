import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LLMProvider, LLMConfig } from '../interfaces/llm-provider.interface';

@Injectable()
export class OllamaProvider implements LLMProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly config: LLMConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      provider: 'ollama',
      endpoint: this.configService.get<string>('LLM_ENDPOINT', 'http://localhost:11434'),
      model: this.configService.get<string>('LLM_MODEL', 'llama3'),
      temperature: parseFloat(this.configService.get<string>('LLM_TEMPERATURE', '0.3')),
      maxTokens: parseInt(this.configService.get<string>('LLM_MAX_TOKENS', '1000')),
    };
  }

  async generateAnswer(prompt: string, context: string[]): Promise<string> {
    try {
      const fullPrompt = this.buildPrompt(prompt, context);

      this.logger.debug(`Sending request to Ollama: ${this.config.endpoint}`);

      const response = await axios.post(
        `${this.config.endpoint}/api/generate`,
        {
          model: this.config.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
          },
        },
        {
          timeout: 60000,
        },
      );

      return response.data.response;
    } catch (error) {
      this.logger.error('Error calling Ollama API', error);
      throw new Error(`Failed to generate answer: ${error.message}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const embeddingModel = this.configService.get<string>(
        'EMBEDDING_MODEL',
        'sentence-transformers/all-MiniLM-L6-v2',
      );

      const response = await axios.post(
        `${this.config.endpoint}/api/embeddings`,
        {
          model: embeddingModel,
          prompt: text,
        },
        {
          timeout: 30000,
        },
      );

      return response.data.embedding;
    } catch (error) {
      this.logger.error('Error generating embeddings', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  private buildPrompt(question: string, context: string[]): string {
    const contextText = context.join('\n\n---\n\n');

    return `You are an AI assistant for Assurances BIAT, helping employees understand internal regulations and policies.

IMPORTANT INSTRUCTIONS:
1. Answer ONLY based on the provided context below
2. If the answer is not in the context, say "Je ne trouve pas cette information dans les documents disponibles. Veuillez contacter le service RH pour plus de détails."
3. Always cite the source by mentioning the document name, section, or article number when available
4. Be precise and professional
5. Answer in French

CONTEXT:
${contextText}

QUESTION:
${question}

ANSWER:`;
  }
}

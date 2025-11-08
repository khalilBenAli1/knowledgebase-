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
      numThreads: parseInt(this.configService.get<string>('LLM_NUM_THREADS', '4')),
      numGpu: parseInt(this.configService.get<string>('LLM_GPU_LAYERS', '0')),
      numCtx: parseInt(this.configService.get<string>('LLM_CONTEXT_SIZE', '2048')),
    };
  }

  async generateAnswer(prompt: string, context: string[]): Promise<string> {
    let fullPrompt = '';
    try {
      fullPrompt = this.buildPrompt(prompt, context);

      this.logger.debug(`Sending request to Ollama: ${this.config.endpoint}`);
      this.logger.debug(`Prompt length: ${fullPrompt.length} characters, Context chunks: ${context.length}`);

      const response = await axios.post(
        `${this.config.endpoint}/api/generate`,
        {
          model: this.config.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens,
            num_thread: this.config.numThreads,
            num_gpu: this.config.numGpu,
            num_ctx: this.config.numCtx,
          },
        },
        {
          timeout: 60000,
        },
      );

      return response.data.response;
    } catch (error) {
      console.error('=== OLLAMA API ERROR DETAILS ===');
      console.error('Message:', error.message);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Prompt length:', fullPrompt.length);
      console.error('Context chunks:', context.length);
      console.error('================================');
      this.logger.error('Error calling Ollama API', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
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

    return `Tu es l'assistant virtuel d'Assurances BIAT. Tu aides les employés avec les règlements internes et les formations.

STYLE:
- Réponds de manière DIRECTE et CONCISE
- Va droit au but, sans salutations ni formules de politesse
- Utilise 2-3 phrases maximum quand possible
- Si la réponse est simple, une seule phrase suffit
- Sois naturel et conversationnel, comme un collègue

RÈGLES:
1. Si les documents ne sont PAS pertinents à la question, dis: "Je n'ai pas cette information dans mes documents."

2. Si pertinent, réponds BRIÈVEMENT avec les points clés uniquement

3. Pour les formations:
   - Liste seulement les titres et dates essentielles
   - Pas de descriptions longues
   - Format: "Formation X - Date: Y"

4. Utilise des listes à puces pour plusieurs éléments

5. Réponds toujours en français

DOCUMENTS:
${contextText}

QUESTION: ${question}

RÉPONSE COURTE:`;
  }
}

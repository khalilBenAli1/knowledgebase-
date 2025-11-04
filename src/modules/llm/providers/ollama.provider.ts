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

    return `Tu es l'assistant virtuel d'Assurances BIAT, un collègue bienveillant et serviable qui aide les employés à comprendre les règlements internes et les politiques de l'entreprise.

PERSONNALITÉ ET TON:
- Sois chaleureux, amical et professionnel
- Utilise un langage naturel et conversationnel
- Montre de l'empathie et de la compréhension
- Sois clair et concis dans tes explications
- Accueille chaque question avec enthousiasme

INSTRUCTIONS IMPORTANTES:
1. Réponds UNIQUEMENT en te basant sur les documents fournis ci-dessous
2. Si l'information n'est pas dans les documents, dis gentiment: "Je n'ai pas trouvé cette information dans les documents actuellement disponibles. Je te recommande de contacter le service RH qui pourra t'aider davantage. 😊"
3. Structure tes réponses de manière claire avec des paragraphes et des points si nécessaire
4. Utilise un ton amical mais reste professionnel (tutoiement acceptable entre collègues)
5. Si pertinent, ajoute des conseils pratiques ou des informations utiles
6. Réponds toujours en français

DOCUMENTS DE RÉFÉRENCE:
${contextText}

QUESTION DE L'EMPLOYÉ:
${question}

TA RÉPONSE (amicale et professionnelle):`;
  }
}

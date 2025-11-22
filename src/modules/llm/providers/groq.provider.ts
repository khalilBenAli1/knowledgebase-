import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { LLMProvider, LLMConfig, ConversationMessage } from '../interfaces/llm-provider.interface';

@Injectable()
export class GroqProvider implements LLMProvider {
  private readonly logger = new Logger(GroqProvider.name);
  private readonly config: LLMConfig;
  private readonly apiKey: string;
  private readonly endpoint = 'https://api.groq.com/openai/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LLM_API_KEY', '');
    this.config = {
      provider: 'groq',
      endpoint: this.endpoint,
      model: this.configService.get<string>('LLM_MODEL', 'llama-3.3-70b-versatile'),
      temperature: parseFloat(this.configService.get<string>('LLM_TEMPERATURE', '0.5')),
      maxTokens: parseInt(this.configService.get<string>('LLM_MAX_TOKENS', '2000')),
    };
  }

  async generateAnswer(prompt: string, context: string[], conversationHistory?: ConversationMessage[]): Promise<string> {
    let fullPrompt = '';
    try {
      fullPrompt = this.buildPrompt(prompt, context, conversationHistory);

      this.logger.debug(`Sending request to Groq: ${this.config.endpoint}`);
      this.logger.debug(`Prompt length: ${fullPrompt.length} characters, Context chunks: ${context.length}`);

      const response = await axios.post(
        `${this.config.endpoint}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('=== GROQ API ERROR DETAILS ===');
      console.error('Message:', error.message);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Prompt length:', fullPrompt.length);
      console.error('Context chunks:', context.length);
      console.error('================================');
      this.logger.error('Error calling Groq API', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(`Failed to generate answer: ${error.message}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    // Groq doesn't provide embeddings API, so we'll still use Ollama for embeddings
    const embeddingModel = this.configService.get<string>(
      'EMBEDDING_MODEL',
      'nomic-embed-text',
    );
    const ollamaEndpoint = this.configService.get<string>(
      'LLM_ENDPOINT',
      'http://localhost:11434',
    );

    try {
      const response = await axios.post(
        `${ollamaEndpoint}/api/embeddings`,
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

  private buildPrompt(question: string, context: string[], conversationHistory?: ConversationMessage[]): string {
    // Number each document chunk for better reference
    const contextText = context
      .map((chunk, index) => `[DOCUMENT ${index + 1}]\n${chunk}`)
      .join('\n\n---\n\n');

    // Build conversation history section
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = '\nHISTORIQUE DE CONVERSATION:\n';
      conversationHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'UTILISATEUR' : 'ASSISTANT';
        conversationContext += `${role}: ${msg.content}\n`;
      });
      conversationContext += '\n';
    }

    return `Tu es l'assistant virtuel d'Assurances BIAT. Tu es un expert en règlements internes et politiques d'entreprise.

RÈGLES CRITIQUES:
1. **RÉPONDS DIRECTEMENT ET PRÉCISÉMENT**:
   - Lis la question attentivement et identifie EXACTEMENT ce qui est demandé
   - Si la question demande UNE information spécifique (ex: "horaire d'été"), donne UNIQUEMENT cette information
   - NE PAS donner d'informations non demandées (ex: horaires ramadan quand on demande l'été)
   - Sois COURT et DIRECT - 2-3 phrases maximum sauf si question complexe

2. **GESTION DES QUESTIONS**:
   - Question claire et spécifique → Réponse courte et directe (1-3 phrases)
   - Question vague ou ambiguë → Pose une question de clarification
   - Pas d'information trouvée → "Je n'ai pas cette information"
   - Plusieurs informations similaires → Demande précision ("Tu veux savoir pour quelle période?")

3. **COMPRÉHENSION SÉMANTIQUE**:
   - "Style vestimentaire" = "Code vestimentaire" = "Dress code"
   - "Congé" = "Vacances" = "Absence"
   - Cherche les CONCEPTS, pas juste les mots exacts
${conversationContext}
DOCUMENTS (${context.length}):
${contextText}

QUESTION: ${question}

RÉPONSE (courte et directe, réponds EXACTEMENT à ce qui est demandé):`;
  }
}

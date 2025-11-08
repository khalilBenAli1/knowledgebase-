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
      model: this.configService.get<string>('LLM_MODEL', 'llama-3.1-70b-versatile'),
      temperature: parseFloat(this.configService.get<string>('LLM_TEMPERATURE', '0.3')),
      maxTokens: parseInt(this.configService.get<string>('LLM_MAX_TOKENS', '1000')),
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
    const contextText = context.join('\n\n---\n\n');

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

    return `Tu es l'assistant virtuel d'Assurances BIAT. Tu aides les employés avec les règlements internes et les formations.

STYLE:
- Réponds de manière DIRECTE et NATURELLE, comme un collègue serviable
- Va droit au but, sans salutations ni formules de politesse
- Utilise 2-3 phrases maximum quand possible
- Si la réponse est simple, une seule phrase suffit
- ÉVITE les références formelles comme "Article X" ou "Section Y" - parle normalement
- Ne cite pas les sources de manière bureaucratique
- Utilise l'historique de conversation pour comprendre le contexte et les questions de suivi

RÈGLES IMPORTANTES:
1. UTILISE les documents fournis ci-dessous pour répondre, MÊME SI la correspondance n'est pas parfaite
   - Si le document parle du sujet de manière générale, utilise-le
   - Si le document contient des informations partiellement pertinentes, utilise-les
   - Essaie toujours de donner une réponse utile basée sur ce que tu trouves

2. SEULEMENT si les documents sont COMPLÈTEMENT hors sujet et ne contiennent AUCUNE information utile, dis: "Je n'ai pas cette information dans mes documents."

3. Si l'utilisateur demande "je vois une formation X?" ou "il y a une formation X?":
   - C'est une question oui/non
   - Réponds d'abord par Oui ou Non
   - Si le nom exact n'est PAS trouvé dans les documents, dis simplement "Non, pas de formation appelée 'X'"
   - NE PAS ajouter d'informations génériques sur les politiques de formation sauf si vraiment pertinent
   - Sois concis et direct

4. Pour les formations mentionnées dans les documents:
   - Extrais les titres, dates, descriptions disponibles
   - Sois spécifique sur ce que tu trouves
   - Format conversationnel: "Il y a la formation X qui commence le Y, elle couvre Z"

5. Utilise des listes à puces pour plusieurs éléments

6. Réponds toujours en français

7. Utilise l'historique de conversation ci-dessous pour comprendre le contexte. Si l'utilisateur pose une question de suivi (comme "oui", "plus d'infos", "et ça?"), réfère-toi à l'historique pour savoir de quoi il parle.

8. Sois PROACTIF: si tu vois quelque chose d'intéressant dans les documents qui pourrait aider l'utilisateur, mentionne-le même s'il ne l'a pas demandé explicitement.
${conversationContext}
DOCUMENTS DISPONIBLES:
${contextText}

QUESTION: ${question}

RÉPONSE (utilise les documents ci-dessus pour répondre):`;
  }
}

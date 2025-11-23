import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LLMConfig, LLMProvider, LLMGenerationOptions } from '../interfaces/llm-provider.interface';

@Injectable()
export class OpenAIProvider implements LLMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly config: LLMConfig;
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      provider: 'openai',
      endpoint: this.configService.get<string>('LLM_ENDPOINT', 'https://api.openai.com/v1'),
      model: this.configService.get<string>('LLM_MODEL', 'gpt-5-nano'),
      temperature: parseFloat(this.configService.get<string>('LLM_TEMPERATURE', '0.3')),
      maxTokens: parseInt(this.configService.get<string>('LLM_MAX_TOKENS', '1000')),
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.endpoint,
    });
  }

  async generateAnswer(question: string, context: string[], options?: LLMGenerationOptions): Promise<string> {
    try {
      const messages = this.buildMessages(question, context, {
        conversationSummary: options?.conversationSummary,
        conversationHistory: options?.conversationHistory,
      });

      this.logger.debug(`Calling OpenAI model ${this.config.model} at ${this.config.endpoint}`);

      const payload: Parameters<typeof this.client.chat.completions.create>[0] = {
        model: this.config.model,
        messages,
        max_completion_tokens: options?.maxTokens || this.config.maxTokens,
      };

      const response = await this.client.chat.completions.create(payload);
      if (!('choices' in response)) {
        throw new Error('Streaming responses are not supported in this context');
      }

      this.logger.debug(`OpenAI response received: ${response.choices?.length || 0} choices`);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        this.logger.error(`Empty response from OpenAI. Full response: ${JSON.stringify(response)}`);
        throw new Error('Empty response from OpenAI');
      }

      return content.trim();
    } catch (error) {
      this.logger.error('Error calling OpenAI Chat Completion API', {
        errorMessage: error.message,
        errorName: error.name,
        statusCode: error?.status || error?.statusCode,
        responseData: error?.response?.data || error?.error,
      });
      throw new Error(`Failed to generate answer: ${error.message}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const embeddingModel = this.configService.get<string>(
        'EMBEDDING_MODEL',
        'text-embedding-3-large',
      );

      const response = await this.client.embeddings.create({
        model: embeddingModel,
        input: text,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('Empty embedding returned by OpenAI');
      }

      return embedding;
    } catch (error) {
      this.logger.error('Error calling OpenAI Embeddings API', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  async summarizeConversation(previousSummary: string | null, question: string, answer: string): Promise<string> {
    try {
      const summaryPrompt = `Tu es chargé de maintenir un résumé concis d'une conversation entre un employé et l'assistant BIAT.

Résumé actuel (peut être vide):
${previousSummary || 'Aucun résumé disponible.'}

Nouveau tour:
Question: ${question}
Réponse: ${answer}

Mets à jour le résumé en français en listant uniquement les faits, demandes et réponses confirmées. Maximum 120 mots.`;

      this.logger.debug(`Calling OpenAI for summarization with model: ${this.config.model}`);

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: 'Tu compresses des conversations pour conserver le contexte factuel et les intentions utilisateur.' },
          { role: 'user', content: summaryPrompt },
        ],
        max_completion_tokens: 250,
      });

      if (!('choices' in response)) {
        throw new Error('Streaming responses are not supported in this context');
      }

      this.logger.debug(`OpenAI response: ${JSON.stringify(response.choices?.[0] || {})}`);

      const summary = response.choices[0]?.message?.content?.trim();
      if (!summary) {
        this.logger.error(`Empty summary from OpenAI. Full response: ${JSON.stringify(response)}`);
        throw new Error('Empty summary from OpenAI');
      }

      return summary;
    } catch (error) {
      this.logger.error('Error summarizing conversation with OpenAI', {
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
        statusCode: error?.status || error?.statusCode,
        responseData: error?.response?.data || error?.error,
      });
      throw new Error(`Failed to summarize conversation: ${error.message}`);
    }
  }

  private buildMessages(
    question: string,
    context: string[],
    options?: { conversationSummary?: string | null; conversationHistory?: { role: 'user' | 'assistant'; content: string }[] },
  ) {
    const contextText = context.length > 0 ? context.join('\n\n---\n\n') : 'Aucun contexte disponible.';

    const systemPrompt = `Tu es l'assistant virtuel d'Assurances BIAT qui aide les employés à comprendre les règlements internes, les politiques de l'entreprise et le catalogue des formations internes.

STYLE DE RÉPONSE:
- Commence directement par la réponse, sans salutations ni phrases d'introduction.
- Sois CONCIS et DIRECT : réponds en 2-3 phrases ou en liste courte (3-5 points maximum).
- Utilise un ton professionnel et naturel, avec des phrases courtes et claires.
- Limite ta réponse à l'essentiel de ce qui est demandé.

RÈGLES DE CONTENU:
1. Priorité à la CONCISION : ne cite que les informations directement utiles à la question.
2. Donne l'information clé en premier, évite les détails superflus ou le contexte inutile.
3. Prends en compte les fautes, abréviations, formulations orales ("c quoi", "c'est quoi", etc.) et les synonymes courants.
4. Si les passages fournis ne permettent pas de répondre avec certitude, indique brièvement que l'information n'est pas confirmée.
5. Lorsqu'une question concerne les formations, cite uniquement le titre et 1-2 détails clés (durée ou date).
6. Structure avec listes courtes (maximum 5 points) quand cela améliore la clarté.
7. Langue: toujours en français.

IMPORTANT: Réponds en maximum 100 mots sauf si la question nécessite explicitement plus de détails.`;

    const userContent = `QUESTION:
${question}

DOCUMENTS DE RÉFÉRENCE:
${contextText}

${options?.conversationSummary ? `RÉSUMÉ DE LA CONVERSATION PRÉCÉDENTE:\n${options.conversationSummary}\n\n` : ''}

RÉPONSE (directe, concise, maximum 100 mots):`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (options?.conversationSummary) {
      messages.push({
        role: 'system',
        content: `Résumé conversationnel à prendre en compte:\n${options.conversationSummary}`,
      });
    }

    if (options?.conversationHistory?.length) {
      options.conversationHistory.forEach((message) => {
        messages.push({
          role: message.role,
          content: message.content,
        });
      });
    }

    messages.push({ role: 'user', content: userContent });

    return messages;
  }
}

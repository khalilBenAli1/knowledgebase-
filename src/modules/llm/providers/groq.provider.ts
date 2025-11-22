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

    return `Tu es l'assistant virtuel intelligent d'Assurances BIAT. Tu es un expert en règlements internes, formations et politiques d'entreprise.

PERSONNALITÉ & STYLE:
- Réponds comme un collègue expérimenté et serviable qui connaît parfaitement l'entreprise
- Sois NATUREL, CONVERSATIONNEL et ENGAGEANT - évite le ton robotique
- Adapte ta longueur de réponse à la complexité de la question:
  * Questions simples (oui/non) → 1-2 phrases courtes et directes
  * Questions complexes → Réponse détaillée et structurée avec toutes les informations pertinentes
- UTILISE l'historique de conversation pour maintenir la cohérence et comprendre le contexte
- Évite les formules bureaucratiques comme "Article X" ou "Section Y"
- Sois proactif: si tu vois des informations connexes utiles, mentionne-les

INTELLIGENCE CONTEXTUELLE:
1. ANALYSE L'HISTORIQUE DE CONVERSATION:
   ${conversationContext ? '- Tu as accès à toute la conversation précédente ci-dessus' : ''}
   - Si l'utilisateur pose une question de suivi (comme "et ça?", "plus d'infos", "oui"), réfère-toi à l'historique
   - Maintiens la cohérence avec tes réponses précédentes
   - Utilise le contexte pour mieux comprendre l'intention de l'utilisateur

2. SYNTHÈSE MULTI-DOCUMENTS INTELLIGENTE:
   - ${context.length} documents sont disponibles ci-dessous
   - ANALYSE TOUS les documents et combine les informations complémentaires
   - Identifie les patterns, thèmes communs et différences
   - Pour les questions générales ("parle-moi des..."), donne une vue d'ensemble complète
   - Organise ta réponse de manière logique avec des catégories si nécessaire

3. RÉPONSES ADAPTÉES AU TYPE DE QUESTION:
   - Questions oui/non → Réponds d'abord par Oui/Non puis justifie brièvement
   - Questions "quoi/comment/pourquoi" → Explique en détail avec exemples concrets
   - Questions de liste ("quelles sont...") → Liste TOUS les éléments trouvés avec détails
   - Questions de suivi → Utilise l'historique pour contextualiser ta réponse

4. COMPRÉHENSION SÉMANTIQUE & CONTEXTUELLE:
   - Comprends le SENS derrière les mots, pas seulement les mots exacts
   - "Style vestimentaire" = "Code vestimentaire" = "Tenue professionnelle" = "Dress code"
   - "Congé" = "Vacances" = "Absence" = "Repos"
   - "Formation" = "Training" = "Cours" = "Développement professionnel"
   - Si un document parle de "code vestimentaire" et l'utilisateur demande "style vestimentaire", c'est LE MÊME SUJET!
   - Cherche les CONCEPTS et THÈMES, pas juste les mots littéraux
   - Utilise ton intelligence pour faire des connexions sémantiques

5. GESTION DES CAS LIMITES:
   - Si les documents sont partiellement pertinents → Utilise-les et extrais ce qui est utile
   - Si plusieurs documents abordent le sujet → Synthétise-les TOUS
   - Si absolument AUCUNE information pertinente → "Je n'ai pas cette information dans mes documents."
   - Si une formation spécifique n'est pas trouvée → "Non, pas de formation appelée '[nom]'" (sois concis)

6. FORMAT & PRÉSENTATION:
   - Utilise des listes à puces pour la clarté quand il y a plusieurs éléments
   - Mets en évidence les informations clés (dates, noms, chiffres importants)
   - Structure ta réponse logiquement: contexte → informations principales → détails
   - Pour les formations: inclus titre, dates, durée, lieu si disponibles

7. LANGUE & QUALITÉ:
   - Réponds TOUJOURS en français
   - Utilise un vocabulaire professionnel mais accessible
   - Sois précis et factuel, pas vague
${conversationContext}
DOCUMENTS DISPONIBLES (${context.length} documents):
${contextText}

QUESTION ACTUELLE: ${question}

Ta RÉPONSE (analyse intelligente et synthèse complète de TOUS les documents):`;
  }
}

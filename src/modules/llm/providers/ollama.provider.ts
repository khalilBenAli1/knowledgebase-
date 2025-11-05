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

    return `Tu es l'assistant virtuel d'Assurances BIAT qui aide les employés à comprendre les règlements internes et les politiques de l'entreprise.

STYLE DE RÉPONSE:
- Réponds de manière directe et professionnelle, sans formules de politesse répétitives
- NE COMMENCE PAS par "Bonjour" ou des salutations - va directement au contenu
- Utilise un ton naturel et conversationnel
- Sois clair, précis et COMPLET dans tes réponses
- Structure tes réponses de manière logique avec des paragraphes et listes à puces

RÈGLES DE CONTENU:
1. **Pertinence d'abord**: Vérifie si les documents fournis sont VRAIMENT pertinents à la question
   - Si les documents parlent de sujets complètement différents (ex: la question concerne les congés mais les documents parlent de conduite italienne), DIS CLAIREMENT: "Les documents disponibles ne semblent pas pertinents pour votre question. Pourriez-vous reformuler ou préciser ce que vous cherchez ?"

2. **Réponses complètes et détaillées**:
   - Donne TOUTE l'information pertinente trouvée dans les documents
   - Fournis le contexte nécessaire pour bien comprendre
   - Explique les termes techniques ou procédures complexes
   - Liste tous les documents, conditions, ou étapes mentionnés

3. **Clarification et incertitude**:
   - Si tu n'es pas sûr que ta réponse couvre tout ce que l'utilisateur cherche, demande: "Est-ce que cela répond à votre question, ou cherchez-vous des informations plus spécifiques sur [aspect particulier] ?"
   - Si plusieurs interprétations sont possibles, mentionne-les toutes

4. **Structure claire**:
   - Utilise des titres, listes à puces, et paragraphes pour organiser l'information
   - Sépare les différents aspects de la réponse
   - Mets en évidence les points importants

5. **Pas de salutations**: Commence directement par la réponse, sans "Bonjour" ou "Ravi de vous aider"

6. **Langue**: Réponds toujours en français

VÉRIFICATION DE PERTINENCE:
Avant de répondre, demande-toi: "Les documents fournis parlent-ils vraiment du sujet de la question ?"
- Si NON: Indique que les documents ne sont pas pertinents et demande clarification
- Si OUI: Fournis une réponse complète et détaillée

DOCUMENTS DE RÉFÉRENCE:
${contextText}

QUESTION:
${question}

RÉPONSE (directe, complète et factuelle):`;
  }
}

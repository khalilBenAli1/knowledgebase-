import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage, MessageRole } from '../../entities/chat-message.entity';
import { Formation } from '../../entities/formation.entity';
import { RagService } from '../rag/rag.service';
import { LLMService } from '../llm/llm.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../entities/audit-log.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession)
    private sessionsRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messagesRepository: Repository<ChatMessage>,
    @InjectRepository(Formation)
    private formationsRepository: Repository<Formation>,
    private ragService: RagService,
    private llmService: LLMService,
    private auditService: AuditService,
  ) {}

  async createSession(userId: string): Promise<ChatSession> {
    const session = this.sessionsRepository.create({
      userId,
      title: 'New Chat Session',
    });

    return this.sessionsRepository.save(session);
  }

  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return this.sessionsRepository.find({
      where: { userId },
      order: { startedAt: 'DESC' },
    });
  }

  async getAllSessions(): Promise<ChatSession[]> {
    return this.sessionsRepository.find({
      relations: ['user'],
      order: { startedAt: 'DESC' },
    });
  }

  async getSession(sessionId: string): Promise<ChatSession> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.messagesRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Detect if the message is a casual/polite message that doesn't need document search
   */
  private isCasualMessage(message: string): boolean {
    const casual = message.toLowerCase().trim();
    const casualPatterns = [
      /^(merci|thanks|thank you|thx|gracias)$/i,
      /^(ok|okay|d'accord|compris|bien)$/i,
      /^(bonjour|salut|hello|hi|bonsoir)$/i,
      /^(au revoir|bye|goodbye|ciao)$/i,
      /^(oui|non|yes|no)$/i,
      /^(super|génial|cool|parfait|excellent)$/i,
    ];

    return casualPatterns.some(pattern => pattern.test(casual));
  }

  /**
   * Detect if user is asking about formations
   */
  private isFormationQuery(message: string): boolean {
    const formationKeywords = [
      'formation',
      'formations',
      'training',
      'trainings',
      'cours',
      'stage',
      'stages',
      'apprentissage',
      'apprendre',
      'développement professionnel',
    ];

    const lowerMessage = message.toLowerCase();
    return formationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Search for relevant formations
   */
  private async searchFormations(query: string): Promise<Formation[]> {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 3);

    if (searchTerms.length === 0) {
      // Return all published formations if no specific search terms
      return this.formationsRepository.find({
        where: { published: true },
        order: { startDate: 'DESC' },
        take: 5,
      });
    }

    // Search in title and description
    const formations = await this.formationsRepository
      .createQueryBuilder('formation')
      .where('formation.published = :published', { published: true })
      .andWhere(
        '(LOWER(formation.title) LIKE :search OR LOWER(formation.description) LIKE :search)',
        { search: `%${searchTerms[0]}%` }
      )
      .orderBy('formation.startDate', 'DESC')
      .take(5)
      .getMany();

    return formations;
  }

  async chat(
    question: string,
    userId: string,
    sessionId?: string,
  ): Promise<ChatMessage> {
    let session: ChatSession;

    if (sessionId) {
      session = await this.getSession(sessionId);
    } else {
      session = await this.createSession(userId);
    }

    // Get conversation history for context (last 6 messages = 3 exchanges to save tokens during testing)
    const conversationHistory = sessionId
      ? (await this.getMessages(sessionId)).slice(-6)
      : [];

    const userMessage = this.messagesRepository.create({
      sessionId: session.id,
      userId,
      role: MessageRole.USER,
      content: question,
      sourceRefs: [],
    });

    await this.messagesRepository.save(userMessage);

    this.logger.log(`User ${userId} asked: ${question}`);

    let answer: string;
    let sources: any[] = [];
    let formations: Formation[] = [];

    // Handle casual messages without searching documents
    if (this.isCasualMessage(question)) {
      const casualResponses = {
        'merci': 'De rien ! Autre chose ?',
        'thanks': 'De rien ! Autre chose ?',
        'ok': 'Parfait ! Autre question ?',
        'bonjour': 'Bonjour ! Comment puis-je aider ?',
        'salut': 'Salut ! En quoi puis-je aider ?',
        'au revoir': 'À bientôt !',
        'oui': 'D\'accord.',
        'non': 'Très bien.',
        'super': 'Content d\'aider !',
      };

      const key = question.toLowerCase().trim();
      answer = casualResponses[key] || 'Je suis là pour répondre à vos questions.';

      this.logger.log(`Casual message detected, skipping document search`);
    }
    // Check if asking about formations
    else if (this.isFormationQuery(question)) {
      this.logger.log('Formation query detected - searching both DB and documents');

      // Search both the Formation DB AND the documents
      formations = await this.searchFormations(question);
      const { context, sources: retrievedSources } = await this.ragService.retrieveContext(question);

      this.logger.log(`Found ${formations.length} formations in DB and ${retrievedSources.length} relevant document chunks`);

      // If we have document context, use RAG to answer
      if (retrievedSources.length > 0 && context.length > 0) {
        sources = retrievedSources;

        // Convert conversation history to LLM format
        const historyForLLM = conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

        // Use LLM to answer based on documents
        answer = await this.llmService.generateAnswer(question, context, historyForLLM);

        // If we also have formations in DB, append them with descriptions
        if (formations.length > 0) {
          const formationList = formations.map((f, idx) => {
            const startDate = new Date(f.startDate).toLocaleDateString('fr-FR');
            const desc = f.description ? f.description.substring(0, 150) : '';
            return `${idx + 1}. **${f.title}** - ${startDate}\n   ${desc}${desc.length >= 150 ? '...' : ''}`;
          }).join('\n\n');

          answer += `\n\n**Formations disponibles dans le catalogue:**\n${formationList}`;

          // Add formation sources
          sources.push(...formations.map(f => ({
            type: 'formation',
            formationId: f.id,
            title: f.title,
            description: f.description.substring(0, 200),
            startDate: f.startDate,
            endDate: f.endDate,
            imageUrl: f.imageUrl,
          })));
        }
      }
      // Only formations in DB, no documents
      else if (formations.length > 0) {
        const formationList = formations.map((f, idx) => {
          const startDate = new Date(f.startDate).toLocaleDateString('fr-FR');
          const desc = f.description ? f.description.substring(0, 150) : '';
          return `${idx + 1}. **${f.title}** - ${startDate}\n   ${desc}${desc.length >= 150 ? '...' : ''}`;
        }).join('\n\n');

        answer = `Voici les formations disponibles:\n\n${formationList}\n\nBesoin de plus d'infos sur une formation spécifique ?`;

        sources = formations.map(f => ({
          type: 'formation',
          formationId: f.id,
          title: f.title,
          description: f.description.substring(0, 200),
          startDate: f.startDate,
          endDate: f.endDate,
          imageUrl: f.imageUrl,
        }));
      }
      // Nothing found
      else {
        answer = "Aucune formation trouvée dans le catalogue ni dans les documents.";
      }
    }
    // Regular RAG query
    else {
      // Build enhanced query using conversation history for better context
      let enhancedQuery = question;
      if (conversationHistory.length > 0) {
        // Get last few user questions to understand context
        const recentQuestions = conversationHistory
          .filter(msg => msg.role === MessageRole.USER)
          .slice(-3)
          .map(msg => msg.content);

        // If current question is very short (follow-up), append previous context
        if (question.length < 20 && recentQuestions.length > 0) {
          enhancedQuery = `${recentQuestions.join(' ')} ${question}`;
          this.logger.debug(`Enhanced query with context: "${enhancedQuery}"`);
        }
      }

      // Expand query with semantic variations for better matching
      const expandedQuery = this.expandQueryWithSynonyms(enhancedQuery);
      this.logger.debug(`Expanded query: "${expandedQuery}"`);

      const { context, sources: retrievedSources } = await this.ragService.retrieveContext(expandedQuery);
      sources = retrievedSources;

      this.logger.log(`Retrieved ${sources.length} relevant chunks`);

      if (sources.length === 0 || context.length === 0) {
        answer = "Je n'ai pas cette information dans mes documents.";
        this.logger.warn(`No context found for question: ${question}`);
      } else {
        // Convert conversation history to LLM format
        const historyForLLM = conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

        // Pass conversation history to LLM for better context awareness
        answer = await this.llmService.generateAnswer(question, context, historyForLLM);
      }
    }

    const assistantMessage = this.messagesRepository.create({
      sessionId: session.id,
      userId: null,
      role: MessageRole.ASSISTANT,
      content: answer,
      sourceRefs: sources,
    });

    await this.messagesRepository.save(assistantMessage);

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.CHAT_QUERY,
      targetType: 'ChatSession',
      targetId: session.id,
      payload: {
        question: question.substring(0, 200),
        sourcesCount: sources.length,
        hasFormations: formations.length > 0,
      },
    });

    if (!session.title || session.title === 'New Chat Session') {
      session.title = question.substring(0, 100);
      await this.sessionsRepository.save(session);
    }

    return assistantMessage;
  }

  /**
   * Expand query with semantic synonyms and related terms for better document matching
   */
  private expandQueryWithSynonyms(query: string): string {
    const lowerQuery = query.toLowerCase();

    // Define semantic mappings for common terms
    const semanticExpansions: Record<string, string[]> = {
      'style': ['code', 'tenue', 'apparence', 'dress code', 'habillement'],
      'code': ['style', 'règles', 'normes', 'dress code'],
      'vestimentaire': ['habillement', 'tenue', 'vêtements', 'dress'],
      'congé': ['congés', 'vacances', 'absence', 'leave', 'repos'],
      'formation': ['formations', 'training', 'cours', 'apprentissage', 'développement'],
      'salaire': ['rémunération', 'paie', 'traitement', 'compensation', 'salaires'],
      'horaire': ['horaires', 'temps de travail', 'planning', 'schedule'],
      'télétravail': ['remote', 'travail à distance', 'home office', 'work from home'],
      'réunion': ['réunions', 'meeting', 'rencontre', 'assemblée'],
      'absence': ['absences', 'congé', 'leave', 'repos'],
      'maladie': ['santé', 'arrêt maladie', 'sick leave', 'medical'],
      'prime': ['primes', 'bonus', 'gratification', 'incentive'],
    };

    // Extract key terms from query
    const words = lowerQuery.split(/\s+/);
    const expansions: string[] = [];

    // Add original query
    expansions.push(query);

    // Add semantic expansions for each word
    for (const word of words) {
      // Check if word is in our semantic map
      for (const [key, synonyms] of Object.entries(semanticExpansions)) {
        if (word.includes(key) || key.includes(word)) {
          // Add relevant synonyms
          synonyms.forEach(syn => {
            if (!lowerQuery.includes(syn)) {
              expansions.push(syn);
            }
          });
        }
      }
    }

    // Return expanded query (combine original with top synonyms)
    const uniqueExpansions = [...new Set(expansions)];
    return uniqueExpansions.slice(0, 5).join(' '); // Limit to avoid token explosion
  }

  async searchMessages(userId: string, query: string, sessionId?: string): Promise<ChatMessage[]> {
    const queryBuilder = this.messagesRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.session', 'session')
      .where('session.userId = :userId', { userId })
      .andWhere('message.content ILIKE :query', { query: `%${query}%` });

    if (sessionId) {
      queryBuilder.andWhere('message.sessionId = :sessionId', { sessionId });
    }

    return queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .limit(50)
      .getMany();
  }
}

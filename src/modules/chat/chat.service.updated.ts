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

    // Get conversation history for context (last 10 messages)
    const conversationHistory = sessionId
      ? (await this.getMessages(sessionId)).slice(-10)
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
      this.logger.log('Formation query detected');

      formations = await this.searchFormations(question);

      if (formations.length > 0) {
        // Build a concise answer about formations
        const formationList = formations.map((f, idx) => {
          const startDate = new Date(f.startDate).toLocaleDateString('fr-FR');
          return `${idx + 1}. **${f.title}** - ${startDate}`;
        }).join('\n');

        answer = `Voici les formations disponibles:\n\n${formationList}\n\nBesoin de plus d'infos sur une formation spécifique ?`;

        // Store formations in sourceRefs for frontend to display as cards
        sources = formations.map(f => ({
          type: 'formation',
          formationId: f.id,
          title: f.title,
          description: f.description.substring(0, 200),
          startDate: f.startDate,
          endDate: f.endDate,
          imageUrl: f.imageUrl,
        }));

      } else {
        answer = "Aucune formation trouvée pour le moment. Les nouvelles formations seront bientôt disponibles.";
      }
    }
    // Regular RAG query
    else {
      const { context, sources: retrievedSources } = await this.ragService.retrieveContext(question);
      sources = retrievedSources;

      this.logger.log(`Retrieved ${sources.length} relevant chunks`);

      if (sources.length === 0 || context.length === 0) {
        answer = "Je n'ai pas cette information dans mes documents.";
        this.logger.warn(`No context found for question: ${question}`);
      } else {
        // Pass conversation history to LLM for better context awareness
        answer = await this.llmService.generateAnswer(question, context);
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

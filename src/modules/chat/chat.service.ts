import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage, MessageRole } from '../../entities/chat-message.entity';
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

    // Handle casual messages without searching documents
    if (this.isCasualMessage(question)) {
      const casualResponses = {
        'merci': 'De rien ! N\'hésitez pas si vous avez d\'autres questions.',
        'thanks': 'De rien ! N\'hésitez pas si vous avez d\'autres questions.',
        'ok': 'Parfait ! Je reste à votre disposition pour toute autre question.',
        'bonjour': 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
        'salut': 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
        'au revoir': 'Au revoir ! N\'hésitez pas à revenir si vous avez besoin d\'aide.',
        'oui': 'D\'accord ! Autre chose ?',
        'non': 'Très bien. Autre chose ?',
        'super': 'Content de pouvoir vous aider !',
      };

      const key = question.toLowerCase().trim();
      answer = casualResponses[key] || 'Je reste à votre disposition pour toute question sur les documents.';

      this.logger.log(`Casual message detected, skipping document search`);
    } else {
      const { context, sources: retrievedSources } = await this.ragService.retrieveContext(question);
      sources = retrievedSources;

      this.logger.log(`Retrieved ${sources.length} relevant chunks`);

      if (sources.length === 0 || context.length === 0) {
        // No documents found - return a standard message instead of letting the LLM hallucinate
        answer = "Je ne trouve pas cette information dans les documents disponibles. Aucun document n'a encore été téléchargé dans le système. Veuillez contacter le service RH pour plus de détails.";
        this.logger.warn(`No context found for question: ${question}`);
      } else {
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

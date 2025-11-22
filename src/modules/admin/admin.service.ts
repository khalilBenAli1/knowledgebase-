import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { Document } from '../../entities/document.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { Event } from '../../entities/event.entity';
import { EventRegistration } from '../../entities/event-registration.entity';
import { FormationRequest, FormationRequestStatus } from '../../entities/formation-request.entity';
import { FeedbackService } from '../feedback/feedback.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(ChatSession)
    private sessionsRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messagesRepository: Repository<ChatMessage>,
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private chunksRepository: Repository<DocumentChunk>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(EventRegistration)
    private eventRegistrationsRepository: Repository<EventRegistration>,
    @InjectRepository(FormationRequest)
    private formationRequestsRepository: Repository<FormationRequest>,
    private feedbackService: FeedbackService,
    private configService: ConfigService,
  ) {}

  async getAnalytics(): Promise<any> {
    // Users statistics
    const totalUsers = await this.usersRepository.count();
    const activeUsers = await this.usersRepository.count({ where: { isActive: true } });
    const users = await this.usersRepository.find({ relations: ['role'] });

    // Group users by role
    const usersByRole = users.reduce((acc, user) => {
      const roleName = user.role?.name || 'Unknown';
      acc[roleName] = (acc[roleName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Documents statistics
    const totalDocuments = await this.documentsRepository.count();
    const publishedDocuments = await this.documentsRepository.count({
      where: { status: 'published' as any },
    });

    // Chat statistics
    const totalSessions = await this.sessionsRepository.count();
    const totalMessages = await this.messagesRepository.count();
    const feedbackStats = await this.feedbackService.getStatistics();

    // Events statistics
    const totalEvents = await this.eventsRepository.count();
    const publishedEvents = await this.eventsRepository.count({ where: { published: true } });
    const totalEventRegistrations = await this.eventRegistrationsRepository.count();
    const upcomingEvents = await this.eventsRepository.count({
      where: { published: true },
    });

    // Formation requests statistics
    const totalFormationRequests = await this.formationRequestsRepository.count();
    const pendingFormationRequests = await this.formationRequestsRepository.count({
      where: { status: FormationRequestStatus.PENDING },
    });
    const approvedFormationRequests = await this.formationRequestsRepository.count({
      where: { status: FormationRequestStatus.APPROVED },
    });
    const rejectedFormationRequests = await this.formationRequestsRepository.count({
      where: { status: FormationRequestStatus.DECLINED },
    });

    const recentMessages = await this.messagesRepository
      .createQueryBuilder('message')
      .select('DATE(message.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('message.createdAt > NOW() - INTERVAL \'30 days\'')
      .groupBy('DATE(message.createdAt)')
      .orderBy('date', 'DESC')
      .limit(30)
      .getRawMany();

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        byRole: usersByRole,
      },
      documents: {
        total: totalDocuments,
        published: publishedDocuments,
        draft: totalDocuments - publishedDocuments,
      },
      chat: {
        totalSessions,
        totalMessages,
        averageMessagesPerSession: totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0,
      },
      events: {
        total: totalEvents,
        published: publishedEvents,
        draft: totalEvents - publishedEvents,
        totalRegistrations: totalEventRegistrations,
        averageRegistrationsPerEvent: totalEvents > 0 ? Math.round(totalEventRegistrations / totalEvents) : 0,
      },
      formations: {
        total: totalFormationRequests,
        pending: pendingFormationRequests,
        approved: approvedFormationRequests,
        rejected: rejectedFormationRequests,
      },
      feedback: feedbackStats,
      activity: {
        last30Days: recentMessages,
      },
    };
  }

  async getMostAskedTopics(limit: number = 10): Promise<any[]> {
    return [];
  }

  // User Management Methods
  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllRoles(): Promise<Role[]> {
    return this.rolesRepository.find({
      order: { name: 'ASC' },
    });
  }

  async updateUserRole(userId: string, roleId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    user.role = role;
    return this.usersRepository.save(user);
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = isActive;
    return this.usersRepository.save(user);
  }

  async inviteUser(inviteDto: { email: string; name: string; roleId: string }): Promise<any> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: inviteDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Verify role exists
    const role = await this.rolesRepository.findOne({
      where: { id: inviteDto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create new user
    const user = this.usersRepository.create({
      email: inviteDto.email,
      name: inviteDto.name,
      passwordHash,
      role,
      isActive: true,
    });

    await this.usersRepository.save(user);

    // TODO: Send email with credentials
    // For now, return the temp password (in production, this should be emailed)
    return {
      message: 'User invited successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: role.name,
      },
      temporaryPassword: tempPassword, // In production, email this instead
    };
  }

  // Audit Logs with Pagination
  async getAuditLogs(
    page: number = 1,
    pageSize: number = 20,
    sortField: string = 'timestamp',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{ logs: AuditLog[]; totalPages: number; currentPage: number; total: number }> {
    const skip = (page - 1) * pageSize;

    const [logs, total] = await this.auditLogsRepository.findAndCount({
      relations: ['actor'],
      order: { [sortField]: sortOrder.toUpperCase() },
      take: pageSize,
      skip,
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      logs,
      totalPages,
      currentPage: page,
      total,
    };
  }

  // System Status (IT Admin)
  async getSystemStatus(): Promise<any> {
    try {
      // Database stats
      const totalUsers = await this.usersRepository.count();
      const activeUsers = await this.usersRepository.count({ where: { isActive: true } });
      const totalDocuments = await this.documentsRepository.count();
      const publishedDocuments = await this.documentsRepository.count({ where: { status: 'published' as any } });
      const totalChunks = await this.chunksRepository.count();
      const totalSessions = await this.sessionsRepository.count();
      const totalMessages = await this.messagesRepository.count();
      const totalAuditLogs = await this.auditLogsRepository.count();

      // OpenAI LLM status
      const llmProvider = 'openai';
      const llmUrl = this.configService.get('LLM_ENDPOINT', 'https://api.openai.com/v1');
      const llmModel = this.configService.get('LLM_MODEL', 'gpt-5-nano');
      const apiKey = this.configService.get('OPENAI_API_KEY');
      let llmStatus = 'offline';
      let llmModels: Array<{ name: string; size?: number; modified?: string }> = [];

      if (!apiKey) {
        llmStatus = 'missing_api_key';
      } else {
        try {
          const response = await fetch(`${llmUrl}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (response.ok) {
            const data = await response.json();
            llmStatus = 'online';
            llmModels = (data.data || []).map((model: any) => ({
              name: model.id,
              modified: model?.created ? new Date(model.created * 1000).toISOString() : undefined,
              size: model?.size,
            }));
          } else {
            llmStatus = `error_${response.status}`;
          }
        } catch (error) {
          llmStatus = 'offline';
        }
      }

      // Calculate average response time from recent messages
      const recentMessages = await this.messagesRepository
        .createQueryBuilder('message')
        .where('message.role = :role', { role: 'assistant' })
        .andWhere('message.createdAt > NOW() - INTERVAL \'1 hour\'')
        .limit(100)
        .getMany();

      return {
        database: {
          users: { total: totalUsers, active: activeUsers },
          documents: { total: totalDocuments, published: publishedDocuments },
          chunks: totalChunks,
          sessions: totalSessions,
          messages: totalMessages,
          auditLogs: totalAuditLogs,
        },
        llm: {
          provider: llmProvider,
          status: llmStatus,
          url: llmUrl,
          model: llmModel,
          models: llmModels,
        },
        performance: {
          recentMessagesCount: recentMessages.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get system status: ${error.message}`);
    }
  }
}

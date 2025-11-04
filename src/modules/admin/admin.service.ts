import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { Document } from '../../entities/document.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { AuditLog } from '../../entities/audit-log.entity';
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
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
    private feedbackService: FeedbackService,
  ) {}

  async getAnalytics(): Promise<any> {
    const totalUsers = await this.usersRepository.count();
    const totalDocuments = await this.documentsRepository.count();
    const publishedDocuments = await this.documentsRepository.count({
      where: { status: 'published' as any },
    });
    const totalSessions = await this.sessionsRepository.count();
    const totalMessages = await this.messagesRepository.count();
    const feedbackStats = await this.feedbackService.getStatistics();

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
      },
      documents: {
        total: totalDocuments,
        published: publishedDocuments,
      },
      chat: {
        totalSessions,
        totalMessages,
        averageMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
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
}

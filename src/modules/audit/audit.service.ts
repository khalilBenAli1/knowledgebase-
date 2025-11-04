import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';

export interface CreateAuditLogDto {
  actorId?: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  payload?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(data: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(data);
    return this.auditLogRepository.save(auditLog);
  }

  async findAll(limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      relations: ['actor'],
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findByActor(actorId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { actorId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async findByAction(action: AuditAction, limit: number = 50): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { action },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}

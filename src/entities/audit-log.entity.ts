import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum AuditAction {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  DOCUMENT_UPLOAD = 'document_upload',
  DOCUMENT_APPROVE = 'document_approve',
  DOCUMENT_PUBLISH = 'document_publish',
  DOCUMENT_UNPUBLISH = 'document_unpublish',
  DOCUMENT_DELETE = 'document_delete',
  DOCUMENT_PROCESSED = 'document_processed',
  CHAT_QUERY = 'chat_query',
  FEEDBACK_SUBMIT = 'feedback_submit',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  ROLE_UPDATE = 'role_update',
  SYSTEM_CONFIG_UPDATE = 'system_config_update',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  actorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ length: 100 })
  targetType: string;

  @Column({ nullable: true })
  targetId: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @Column({ nullable: true, length: 100 })
  ipAddress: string;

  @Column({ nullable: true, length: 500 })
  userAgent: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  FORMATION_REQUEST = 'formation_request',
  MANAGER_INVITATION = 'manager_invitation',
  MANAGER_ASSIGNED = 'manager_assigned',
  COLLABORATOR_ASSIGNED = 'collaborator_assigned',
  COLLABORATOR_REMOVED = 'collaborator_removed',
  FORMATION_APPROVED = 'formation_approved',
  FORMATION_DECLINED = 'formation_declined',
  ACTUALITY_COMMENT = 'actuality_comment',
  ACTUALITY_LIKE = 'actuality_like',
  SYSTEM = 'system',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actionUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

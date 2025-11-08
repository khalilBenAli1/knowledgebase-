import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Formation } from './formation.entity';

export enum FormationRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
}

@Entity('formation_requests')
export class FormationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  formationId: string;

  @ManyToOne(() => Formation, { eager: true })
  @JoinColumn({ name: 'formationId' })
  formation: Formation;

  @Column({ type: 'uuid' })
  requesterId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column({ type: 'uuid' })
  managerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'managerId' })
  manager: User;

  @Column({
    type: 'enum',
    enum: FormationRequestStatus,
    enumName: 'FormationRequestStatus', // Match migration enum name
    default: FormationRequestStatus.PENDING,
  })
  status: FormationRequestStatus;

  @Column({ type: 'text', nullable: true })
  requesterMessage: string | null;

  @Column({ type: 'text', nullable: true })
  managerResponse: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: User;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Formation } from './formation.entity';

export enum FormationRequestStatus {
  PENDING = 'pending',
  MANAGER_APPROVED = 'manager_approved',
  APPROVED = 'approved',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
}

@Entity('formation_requests')
export class FormationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  formationId: string | null;

  @ManyToOne(() => Formation, { eager: true, nullable: true })
  @JoinColumn({ name: 'formationId' })
  formation: Formation | null;

  // Custom formation request fields (when formationId is null)
  @Column({ type: 'varchar', length: 255, nullable: true })
  customFormationTitle: string | null;

  @Column({ type: 'text', nullable: true })
  customFormationDetails: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  customFormationLink: string | null;

  @Column({ type: 'timestamp', nullable: true })
  customFormationDate: Date | null;

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

  // HR review fields
  @Column({ type: 'text', nullable: true })
  hrResponse: string | null;

  @Column({ type: 'uuid', nullable: true })
  hrReviewedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'hrReviewedBy' })
  hrReviewer: User;

  @Column({ type: 'timestamp', nullable: true })
  hrReviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

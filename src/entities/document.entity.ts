import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PARSED = 'parsed',
  AWAITING_APPROVAL = 'awaiting_approval',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  name: string;

  @Column({ length: 500 })
  originalFilename: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'uuid' })
  uploaderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.UPLOADED,
  })
  status: DocumentStatus;

  @Column({ default: '1.0' })
  version: string;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ nullable: true, type: 'text' })
  category: string;

  @Column({ nullable: true, type: 'text' })
  department: string;

  @Column({ nullable: true })
  filePath: string;

  @Column({ nullable: true, type: 'uuid' })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true, type: 'text' })
  ocrText: string;

  @Column({ nullable: true, type: 'timestamp' })
  ocrProcessedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Actuality } from './actuality.entity';

@Entity('actuality_comments')
export class ActualityComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  actualityId: string;

  @ManyToOne(() => Actuality, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actualityId' })
  actuality: Actuality;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'uuid', nullable: true })
  parentCommentId: string | null;

  @ManyToOne(() => ActualityComment, { nullable: true })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment: ActualityComment | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

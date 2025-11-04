import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from './user.entity';

export enum FeedbackRating {
  USEFUL = 'useful',
  NOT_USEFUL = 'not_useful',
}

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  messageId: string;

  @ManyToOne(() => ChatMessage)
  @JoinColumn({ name: 'messageId' })
  message: ChatMessage;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: FeedbackRating,
  })
  rating: FeedbackRating;

  @Column({ nullable: true, type: 'text' })
  comment: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

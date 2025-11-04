import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { User } from './user.entity';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => ChatSession)
  @JoinColumn({ name: 'sessionId' })
  session: ChatSession;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: MessageRole,
  })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', default: [] })
  sourceRefs: Array<{
    documentId: string;
    documentName: string;
    page?: number;
    article?: string;
    heading?: string;
    chunkId?: string;
  }>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

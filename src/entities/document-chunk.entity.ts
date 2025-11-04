import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Document } from './document.entity';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column({ type: 'text' })
  chunkText: string;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'vector', nullable: true })
  @Index('idx_embedding_vector', { synchronize: false })
  embedding: number[];

  @Column({ nullable: true, type: 'int' })
  page: number;

  @Column({ nullable: true, type: 'text' })
  heading: string;

  @Column({ nullable: true, type: 'text' })
  articleRef: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

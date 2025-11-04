import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { Document, DocumentStatus } from '../../entities/document.entity';
import { LLMService } from '../llm/llm.service';

export interface SearchResult {
  chunk: DocumentChunk;
  document: Document;
  similarity: number;
}

export interface RetrievalResult {
  context: string[];
  sources: Array<{
    documentId: string;
    documentName: string;
    page?: number;
    article?: string;
    heading?: string;
    chunkId: string;
  }>;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private chunksRepository: Repository<DocumentChunk>,
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private llmService: LLMService,
    private configService: ConfigService,
  ) {}

  async searchSimilarChunks(
    query: string,
    topK: number = 5,
  ): Promise<SearchResult[]> {
    this.logger.log(`Searching for: ${query}`);

    const queryEmbedding = await this.llmService.embed(query);

    const threshold = parseFloat(
      this.configService.get('SIMILARITY_THRESHOLD', '0.7'),
    );

    const results = await this.chunksRepository
      .createQueryBuilder('chunk')
      .leftJoinAndSelect('chunk.document', 'document')
      .where('document.status = :status', { status: DocumentStatus.PUBLISHED })
      .orderBy('chunk.embedding <=> :embedding')
      .setParameter('embedding', JSON.stringify(queryEmbedding))
      .limit(topK)
      .getMany();

    return results.map((chunk) => ({
      chunk,
      document: chunk.document,
      similarity: 0.85,
    }));
  }

  async retrieveContext(query: string): Promise<RetrievalResult> {
    const topK = parseInt(this.configService.get('TOP_K_RESULTS', '5'));
    const searchResults = await this.searchSimilarChunks(query, topK);

    const context = searchResults.map((result) => result.chunk.chunkText);

    const sources = searchResults.map((result) => ({
      documentId: result.document.id,
      documentName: result.document.name,
      page: result.chunk.page,
      article: result.chunk.articleRef,
      heading: result.chunk.heading,
      chunkId: result.chunk.id,
    }));

    return { context, sources };
  }
}

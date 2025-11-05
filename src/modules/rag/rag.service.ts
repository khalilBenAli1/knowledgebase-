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

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  async searchSimilarChunks(
    query: string,
    topK: number = 5,
  ): Promise<SearchResult[]> {
    this.logger.log(`Searching for: ${query}`);

    const queryEmbedding = await this.llmService.embed(query);

    const threshold = parseFloat(
      this.configService.get('SIMILARITY_THRESHOLD', '0.3'),
    );

    // Get results from pgvector
    const results = await this.chunksRepository
      .createQueryBuilder('chunk')
      .leftJoinAndSelect('chunk.document', 'document')
      .where('document.status = :status', { status: DocumentStatus.PUBLISHED })
      .andWhere('chunk.embedding IS NOT NULL')
      .orderBy('chunk.embedding <=> :embedding')
      .setParameter('embedding', JSON.stringify(queryEmbedding))
      .limit(topK * 3) // Get more results to filter
      .getMany();

    this.logger.log(`Retrieved ${results.length} chunks from database`);

    if (results.length === 0) {
      this.logger.warn('No chunks found in database. Check if documents are chunked and have embeddings.');
      return [];
    }

    // Calculate actual similarity scores
    const resultsWithSimilarity = results.map((chunk) => {
      try {
        const chunkEmbedding = Array.isArray(chunk.embedding)
          ? chunk.embedding
          : JSON.parse(chunk.embedding as any);

        const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);

        return {
          chunk,
          document: chunk.document,
          similarity,
        };
      } catch (error) {
        this.logger.warn(`Failed to calculate similarity for chunk ${chunk.id}: ${error.message}`);
        return {
          chunk,
          document: chunk.document,
          similarity: 0,
        };
      }
    });

    // Filter by threshold and limit to topK
    const filtered = resultsWithSimilarity
      .filter((result) => result.similarity >= threshold)
      .slice(0, topK);

    this.logger.log(`Found ${filtered.length} chunks above similarity threshold ${threshold} (from ${results.length} total)`);

    if (filtered.length > 0) {
      this.logger.log(`Similarity scores: ${filtered.map(r => r.similarity.toFixed(3)).join(', ')}`);
    } else {
      this.logger.warn(`No chunks met the similarity threshold of ${threshold}. Returning top ${Math.min(topK, results.length)} results anyway.`);
      // If nothing passes threshold, return top results anyway
      return resultsWithSimilarity.slice(0, topK);
    }

    return filtered;
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

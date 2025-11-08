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

  /**
   * Preprocess and normalize query for better matching
   */
  private preprocessQuery(query: string): string {
    // Remove extra whitespace
    let processed = query.trim().replace(/\s+/g, ' ');

    // Convert to lowercase for consistency
    processed = processed.toLowerCase();

    // Expand common abbreviations (French)
    const abbreviations: Record<string, string> = {
      'rh': 'ressources humaines',
      'hr': 'human resources',
      'info': 'information',
      'doc': 'document',
      'docs': 'documents',
    };

    Object.entries(abbreviations).forEach(([abbr, full]) => {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      processed = processed.replace(regex, full);
    });

    this.logger.debug(`Preprocessed query: "${query}" -> "${processed}"`);
    return processed;
  }

  async searchSimilarChunks(
    query: string,
    topK: number = 5,
  ): Promise<SearchResult[]> {
    this.logger.log(`Searching for: "${query}"`);

    // Preprocess query
    const processedQuery = this.preprocessQuery(query);

    // Generate embedding
    this.logger.debug('Generating query embedding...');
    const queryEmbedding = await this.llmService.embed(processedQuery);
    this.logger.debug(`Query embedding generated: ${queryEmbedding.length} dimensions`);

    // Updated default threshold to 0.5 (better balance)
    const threshold = parseFloat(
      this.configService.get('SIMILARITY_THRESHOLD', '0.5'),
    );
    this.logger.log(`Using similarity threshold: ${threshold}`);

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

    // Calculate actual similarity scores with detailed logging
    const resultsWithSimilarity = results.map((chunk, index) => {
      try {
        const chunkEmbedding = Array.isArray(chunk.embedding)
          ? chunk.embedding
          : JSON.parse(chunk.embedding as any);

        const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);

        // Log details for top results
        if (index < 10) {
          this.logger.debug(
            `Chunk ${index + 1}: similarity=${similarity.toFixed(4)}, ` +
            `doc="${chunk.document?.name || 'unknown'}", ` +
            `text="${chunk.chunkText.substring(0, 80)}..."`
          );
        }

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

    // Apply metadata boosting before sorting
    const boostedResults = resultsWithSimilarity.map(result => {
      let boostedScore = result.similarity;

      // Boost recent documents (within last 30 days)
      if (result.document?.createdAt) {
        const daysSinceCreation = (Date.now() - new Date(result.document.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) {
          boostedScore *= 1.1; // 10% boost for recent docs
          this.logger.debug(`Boosted recent doc: ${result.document.name} (+10%)`);
        }
      }

      // Boost documents with certain keywords in name
      const docName = result.document?.name?.toLowerCase() || '';
      if (docName.includes('formation') || docName.includes('training')) {
        boostedScore *= 1.05; // 5% boost for formation docs
        this.logger.debug(`Boosted formation doc: ${result.document.name} (+5%)`);
      }
      if (docName.includes('règlement') || docName.includes('regulation') || docName.includes('policy')) {
        boostedScore *= 1.05; // 5% boost for regulation docs
        this.logger.debug(`Boosted regulation doc: ${result.document.name} (+5%)`);
      }

      return {
        ...result,
        similarity: boostedScore,
        originalSimilarity: result.similarity,
      };
    });

    // Sort by boosted similarity (descending)
    boostedResults.sort((a, b) => b.similarity - a.similarity);

    // Log all similarity scores for debugging
    const allScores = boostedResults.map(r =>
      `${r.similarity.toFixed(3)}${r.similarity !== r.originalSimilarity ? '*' : ''}`
    ).join(', ');
    this.logger.debug(`All similarity scores (boosted marked with *): [${allScores}]`);

    // Filter by threshold (using original similarity, not boosted)
    const filtered = boostedResults
      .filter((result) => (result.originalSimilarity || result.similarity) >= threshold)
      .slice(0, topK);

    this.logger.log(
      `Found ${filtered.length} chunks above threshold ${threshold} ` +
      `(from ${results.length} total, max=${boostedResults[0]?.similarity.toFixed(3) || 'N/A'})`
    );

    if (filtered.length > 0) {
      this.logger.log(`✓ Returning ${filtered.length} chunks with scores: ${filtered.map(r => r.similarity.toFixed(3)).join(', ')}`);
      return filtered;
    } else {
      this.logger.warn(
        `✗ No chunks met threshold ${threshold}. ` +
        `Best score was ${boostedResults[0]?.originalSimilarity?.toFixed(3) || boostedResults[0]?.similarity.toFixed(3)}. ` +
        `Returning top ${Math.min(topK, results.length)} results anyway.`
      );
      // If nothing passes threshold, return top results anyway
      return boostedResults.slice(0, topK);
    }
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

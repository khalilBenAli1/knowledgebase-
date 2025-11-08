import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Document, DocumentStatus } from '../../entities/document.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { DocumentsService } from '../documents/documents.service';
import { ParserService } from './parser.service';
import { LLMService } from '../llm/llm.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private chunksRepository: Repository<DocumentChunk>,
    @Inject(forwardRef(() => DocumentsService))
    private documentsService: DocumentsService,
    private parserService: ParserService,
    private llmService: LLMService,
    private configService: ConfigService,
  ) {}

  async processDocument(documentId: string): Promise<void> {
    this.logger.log(`Processing document ${documentId}`);

    const document = await this.documentsService.findById(documentId);

    if (!document.filePath) {
      throw new Error('Document has no file path');
    }

    try {
      // Pass OCR text if available so parser uses it instead of re-parsing
      const parsed = await this.parserService.parseFile(
        document.filePath,
        document.mimeType,
        document.ocrText,
      );

      const chunkSize = parseInt(this.configService.get('CHUNK_SIZE', '800'));
      const overlap = parseInt(this.configService.get('CHUNK_OVERLAP', '150'));
      const textChunks = this.parserService.chunkText(parsed.text, chunkSize, overlap);

      this.logger.log(`Created ${textChunks.length} chunks for document ${documentId}`);

      await this.chunksRepository.delete({ documentId });

      for (let i = 0; i < textChunks.length; i++) {
        const chunkText = textChunks[i];

        this.logger.debug(`Generating embedding for chunk ${i + 1}/${textChunks.length}`);
        const embedding = await this.llmService.embed(chunkText);

        const chunk = this.chunksRepository.create({
          documentId,
          chunkText,
          chunkIndex: i,
          embedding,
          metadata: {
            length: chunkText.length,
          },
        });

        await this.chunksRepository.save(chunk);
      }

      document.status = DocumentStatus.PARSED;
      await this.documentsRepository.save(document);

      this.logger.log(`Successfully processed document ${documentId}`);
    } catch (error) {
      this.logger.error(`Error processing document ${documentId}:`, error);
      throw error;
    }
  }

  async reindexDocument(documentId: string): Promise<void> {
    this.logger.log(`Re-indexing document ${documentId}`);
    await this.processDocument(documentId);
  }

  async getProcessingStatus(documentId: string): Promise<any> {
    const document = await this.documentsService.findById(documentId);
    const chunkCount = await this.chunksRepository.count({ where: { documentId } });

    return {
      documentId,
      status: document.status,
      chunkCount,
    };
  }
}

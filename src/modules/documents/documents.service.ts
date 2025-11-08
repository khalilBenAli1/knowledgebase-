import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from '../../entities/document.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../entities/audit-log.entity';
import { IngestionService } from '../ingestion/ingestion.service';
import { OcrService } from '../ocr/ocr.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private chunksRepository: Repository<DocumentChunk>,
    private auditService: AuditService,
    @Inject(forwardRef(() => IngestionService))
    private ingestionService: IngestionService,
    @Inject(forwardRef(() => OcrService))
    private ocrService: OcrService,
  ) {}

  async create(data: Partial<Document>): Promise<Document> {
    const document = this.documentsRepository.create(data);
    return this.documentsRepository.save(document);
  }

  async findAll(filters?: {
    status?: DocumentStatus;
    tags?: string[];
    category?: string;
  }): Promise<Document[]> {
    const query = this.documentsRepository.createQueryBuilder('document')
      .leftJoinAndSelect('document.uploader', 'uploader')
      .orderBy('document.createdAt', 'DESC');

    if (filters?.status) {
      query.andWhere('document.status = :status', { status: filters.status });
    }

    if (filters?.category) {
      query.andWhere('document.category = :category', { category: filters.category });
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.andWhere('document.tags && :tags', { tags: filters.tags });
    }

    return query.getMany();
  }

  async findById(id: string): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
      relations: ['uploader'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
  }

  async updateStatus(
    id: string,
    status: DocumentStatus,
    userId: string,
  ): Promise<Document> {
    const document = await this.findById(id);
    document.status = status;

    if (status === DocumentStatus.APPROVED) {
      document.approvedBy = userId;
      document.approvedAt = new Date();
    }

    return this.documentsRepository.save(document);
  }

  async approve(id: string, userId: string): Promise<Document> {
    const document = await this.findById(id);

    // Set approval details
    document.approvedBy = userId;
    document.approvedAt = new Date();
    // Automatically publish when approved
    document.status = DocumentStatus.PUBLISHED;

    const updatedDoc = await this.documentsRepository.save(document);

    // Log approval action
    await this.auditService.log({
      actorId: userId,
      action: AuditAction.DOCUMENT_APPROVE,
      targetType: 'Document',
      targetId: id,
      payload: { documentName: document.name },
    });

    // Log publish action
    await this.auditService.log({
      actorId: userId,
      action: AuditAction.DOCUMENT_PUBLISH,
      targetType: 'Document',
      targetId: id,
      payload: { documentName: document.name },
    });

    return updatedDoc;
  }

  async publish(id: string, userId: string): Promise<Document> {
    let document = await this.findById(id);

    try {
      // Step 1: Run OCR only for scanned PDFs (not .docx, only PDFs without text)
      const isPDF = document.mimeType.includes('pdf');
      const needsOCR = isPDF && !document.ocrText;

      if (needsOCR) {
        try {
          await this.ocrService.processDocument(id, userId, false);
          document = await this.findById(id); // Refresh to get OCR text
        } catch (ocrError) {
          // Log OCR error but continue - parsing can still work with original PDF text
          console.warn(`OCR failed for document ${id}, continuing with parsing:`, ocrError.message);
          await this.auditService.log({
            actorId: userId,
            action: AuditAction.DOCUMENT_PROCESSED,
            targetType: 'Document',
            targetId: id,
            payload: {
              documentName: document.name,
              ocrFailed: true,
              error: ocrError.message,
            },
          });
        }
      }

      // Step 2: Run ingestion/parsing if not already parsed
      if (document.status !== DocumentStatus.PARSED &&
          document.status !== DocumentStatus.APPROVED &&
          document.status !== DocumentStatus.PUBLISHED) {
        await this.ingestionService.processDocument(id);
        document = await this.findById(id); // Refresh to get updated status
      }

      // Step 3: Auto-approve if not already approved
      if (document.status !== DocumentStatus.APPROVED && document.status !== DocumentStatus.PUBLISHED) {
        document.approvedBy = userId;
        document.approvedAt = new Date();

        // Log auto-approval
        await this.auditService.log({
          actorId: userId,
          action: AuditAction.DOCUMENT_APPROVE,
          targetType: 'Document',
          targetId: id,
          payload: { documentName: document.name, autoApproved: true },
        });
      }

      // Step 4: Publish
      document.status = DocumentStatus.PUBLISHED;
      const updatedDoc = await this.documentsRepository.save(document);

      await this.auditService.log({
        actorId: userId,
        action: AuditAction.DOCUMENT_PUBLISH,
        targetType: 'Document',
        targetId: id,
        payload: { documentName: document.name },
      });

      return updatedDoc;
    } catch (error) {
      // Log error but don't fail completely
      await this.auditService.log({
        actorId: userId,
        action: AuditAction.DOCUMENT_PUBLISH,
        targetType: 'Document',
        targetId: id,
        payload: {
          documentName: document.name,
          error: error.message,
          failed: true
        },
      });
      throw error;
    }
  }

  async unpublish(id: string, userId: string): Promise<Document> {
    const document = await this.updateStatus(id, DocumentStatus.UNPUBLISHED, userId);

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.DOCUMENT_UNPUBLISH,
      targetType: 'Document',
      targetId: id,
      payload: { documentName: document.name },
    });

    return document;
  }

  async delete(id: string, userId: string): Promise<void> {
    const document = await this.findById(id);

    await this.chunksRepository.delete({ documentId: id });
    await this.documentsRepository.remove(document);

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.DOCUMENT_DELETE,
      targetType: 'Document',
      targetId: id,
      payload: { documentName: document.name },
    });
  }

  async getChunks(documentId: string): Promise<DocumentChunk[]> {
    return this.chunksRepository.find({
      where: { documentId },
      order: { chunkIndex: 'ASC' },
    });
  }
}

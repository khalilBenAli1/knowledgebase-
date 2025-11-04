import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from '../../entities/document.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../entities/audit-log.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private chunksRepository: Repository<DocumentChunk>,
    private auditService: AuditService,
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
    const document = await this.updateStatus(id, DocumentStatus.APPROVED, userId);

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.DOCUMENT_APPROVE,
      targetType: 'Document',
      targetId: id,
      payload: { documentName: document.name },
    });

    return document;
  }

  async publish(id: string, userId: string): Promise<Document> {
    const document = await this.findById(id);

    if (document.status !== DocumentStatus.APPROVED) {
      throw new BadRequestException('Document must be approved before publishing');
    }

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

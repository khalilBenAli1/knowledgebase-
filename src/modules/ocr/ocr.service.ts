import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Tesseract from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Document } from '../../entities/document.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../entities/audit-log.entity';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private auditService: AuditService,
  ) {}

  /**
   * Process a document for OCR text extraction
   */
  async processDocument(documentId: string, userId: string, forceReprocess: boolean = false): Promise<any> {
    this.logger.log(`Starting OCR processing for document ${documentId}`);

    // Find document
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    // Check if already processed (and not forcing re-process)
    if (!forceReprocess && document.ocrText && document.ocrText.length > 0 && !document.ocrText.startsWith('ERROR:')) {
      this.logger.log(`Document ${documentId} already has OCR text (${document.ocrText.length} chars). Skipping re-processing.`);
      return {
        success: true,
        documentId,
        alreadyProcessed: true,
        extractedTextLength: document.ocrText.length,
        extractedText: document.ocrText.substring(0, 500),
        message: 'Ce document a déjà été traité par OCR. Le texte existant a été retourné.',
      };
    }

    // Check if file exists
    const filePath = document.filePath;
    try {
      await fs.access(filePath);
    } catch (error) {
      this.logger.error(`File not found: ${filePath}`);
      throw new BadRequestException('Document file not found');
    }

    let extractedText = '';

    try {
      // Determine file type
      const fileExtension = path.extname(document.originalFilename).toLowerCase();

      if (fileExtension === '.pdf') {
        extractedText = await this.extractTextFromPDF(filePath);
      } else if (['.png', '.jpg', '.jpeg', '.tiff', '.bmp'].includes(fileExtension)) {
        extractedText = await this.extractTextFromImage(filePath);
      } else {
        throw new BadRequestException('Unsupported file type for OCR. Only PDF and images are supported.');
      }

      // Save extracted text to document
      document.ocrText = extractedText;
      document.ocrProcessedAt = new Date();
      await this.documentsRepository.save(document);

      // Log audit
      await this.auditService.log({
        actorId: userId,
        action: AuditAction.DOCUMENT_PROCESSED,
        targetType: 'Document',
        targetId: documentId,
        payload: {
          ocrTextLength: extractedText.length,
          fileType: fileExtension,
        },
      });

      this.logger.log(`OCR processing completed for document ${documentId}. Extracted ${extractedText.length} characters.`);

      return {
        success: true,
        documentId,
        extractedTextLength: extractedText.length,
        extractedText: extractedText.substring(0, 500), // Return first 500 chars as preview
      };
    } catch (error) {
      this.logger.error(`OCR processing failed for document ${documentId}:`, error);

      // Save error status
      document.ocrText = `ERROR: ${error.message}`;
      document.ocrProcessedAt = new Date();
      await this.documentsRepository.save(document);

      throw new BadRequestException(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF file
   */
  private async extractTextFromPDF(filePath: string): Promise<string> {
    this.logger.log(`Extracting text from PDF: ${filePath}`);

    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);

      // If PDF has embedded text, return it
      if (pdfData.text && pdfData.text.trim().length > 100) {
        this.logger.log('PDF contains embedded text, using that');
        return pdfData.text.trim();
      }

      // If no embedded text, perform OCR on PDF images
      this.logger.log('PDF has no embedded text, performing OCR...');

      // Note: For production, you may want to convert PDF pages to images first
      // and then run OCR on each page. This is a simplified version.
      return pdfData.text || 'No text could be extracted from this PDF.';
    } catch (error) {
      this.logger.error(`PDF text extraction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract text from image file using Tesseract OCR
   */
  private async extractTextFromImage(filePath: string): Promise<string> {
    this.logger.log(`Extracting text from image using OCR: ${filePath}`);

    try {
      const result = await Tesseract.recognize(filePath, 'fra+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR Progress: ${(m.progress * 100).toFixed(1)}%`);
          }
        },
      });

      const text = result.data.text.trim();
      this.logger.log(`OCR completed. Extracted ${text.length} characters.`);

      if (text.length === 0) {
        return 'No text could be extracted from this image.';
      }

      return text;
    } catch (error) {
      this.logger.error(`Image OCR failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get OCR text for a document
   */
  async getOcrText(documentId: string): Promise<any> {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
      select: ['id', 'name', 'ocrText', 'ocrProcessedAt'],
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    return {
      documentId: document.id,
      documentName: document.name,
      ocrText: document.ocrText,
      processedAt: document.ocrProcessedAt,
      hasOcrText: !!document.ocrText && document.ocrText.length > 0,
    };
  }

  /**
   * Search documents by OCR text
   */
  async searchByOcrText(query: string, limit: number = 10): Promise<Document[]> {
    if (!query || query.length < 3) {
      throw new BadRequestException('Search query must be at least 3 characters');
    }

    const documents = await this.documentsRepository
      .createQueryBuilder('document')
      .where('document.ocrText ILIKE :query', { query: `%${query}%` })
      .andWhere('document.ocrText IS NOT NULL')
      .orderBy('document.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return documents;
  }
}

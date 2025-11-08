import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../entities/document.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../entities/audit-log.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas, Image } from 'canvas';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private auditService: AuditService,
  ) {
    // Configure PDF.js worker for Node.js environment
    // Use the local worker file from node_modules
    const workerPath = require.resolve('pdfjs-dist/build/pdf.worker.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
  }

  async processDocument(documentId: string, actorId: string, force = false): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Skip if already processed (unless forced)
    if (document.ocrText && !force) {
      this.logger.log(`Document ${documentId} already has OCR text. Use force=true to reprocess.`);
      return document;
    }

    try {
      const filePath = path.resolve(document.filePath);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(`File not found: ${filePath}`);
      }

      this.logger.log(`Starting enhanced OCR processing for document ${documentId}`);

      let ocrText: string;

      if (document.mimeType.includes('pdf')) {
        ocrText = await this.processPDF(filePath);
      } else {
        ocrText = await this.processImage(filePath);
      }

      document.ocrText = ocrText;
      document.ocrProcessedAt = new Date();

      await this.documentsRepository.save(document);

      await this.auditService.log({
        actorId,
        action: AuditAction.DOCUMENT_PROCESSED,
        targetType: 'Document',
        targetId: documentId,
        payload: {
          ocrTextLength: ocrText.length,
          method: 'tesseract-enhanced',
        },
      });

      this.logger.log(`OCR processing completed for document ${documentId}. Extracted ${ocrText.length} characters.`);

      return document;
    } catch (error) {
      this.logger.error(`OCR processing failed for document ${documentId}`, error);
      throw error;
    }
  }

  private async processPDF(filePath: string): Promise<string> {
    this.logger.log(`Processing PDF: ${filePath}`);

    const dataBuffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(dataBuffer);
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    const totalPages = pdf.numPages;
    this.logger.log(`PDF has ${totalPages} pages`);

    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      this.logger.log(`Processing page ${pageNum}/${totalPages}`);

      const page = await pdf.getPage(pageNum);

      // Try to extract text first (for PDFs with text layer)
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str).join(' ');

      if (textItems.trim().length > 50) {
        // PDF has text layer, use it
        pageTexts.push(textItems);
        this.logger.log(`Page ${pageNum}: Extracted ${textItems.length} chars from text layer`);
      } else {
        // PDF is scanned, use OCR
        this.logger.log(`Page ${pageNum}: No text layer, using OCR`);

        // Render page to image at high resolution
        const viewport = page.getViewport({ scale: 3.0 }); // 3x scale for better quality
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        await page.render({
          canvasContext: context as any,
          viewport: viewport,
        }).promise;

        // Convert canvas to buffer
        const imageBuffer = canvas.toBuffer('image/png');

        // Save to temporary file for Tesseract
        const tempFilePath = path.join(process.cwd(), 'uploads', `temp-ocr-${Date.now()}-page-${pageNum}.png`);
        fs.writeFileSync(tempFilePath, imageBuffer);

        try {
          // Perform OCR using file path (Tesseract works better with file paths)
          const text = await this.performOCRFromFile(tempFilePath);
          pageTexts.push(text);
          this.logger.log(`Page ${pageNum}: Extracted ${text.length} chars via OCR`);
        } finally {
          // Clean up temporary file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      }
    }

    return pageTexts.join('\n\n--- Page Break ---\n\n');
  }

  private async processImage(filePath: string): Promise<string> {
    this.logger.log(`Processing image: ${filePath}`);

    const imageBuffer = fs.readFileSync(filePath);
    const processedImage = await this.preprocessImage(imageBuffer);

    // Save preprocessed image to temp file for Tesseract
    const tempFilePath = path.join(process.cwd(), 'uploads', `temp-ocr-${Date.now()}-preprocessed.png`);
    fs.writeFileSync(tempFilePath, processedImage);

    try {
      return await this.performOCRFromFile(tempFilePath);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    // Using sharp for image preprocessing
    const sharp = require('sharp');

    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      this.logger.debug(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

      // Preprocessing pipeline
      const processed = await sharp(imageBuffer)
        // 1. Auto-rotate based on EXIF orientation
        .rotate()

        // 2. Convert to grayscale (better for OCR)
        .greyscale()

        // 3. Resize if image is too small (upscale) or too large (downscale)
        .resize({
          width: metadata.width < 2000 ? 2000 : metadata.width > 4000 ? 4000 : metadata.width,
          fit: 'inside',
          withoutEnlargement: false,
        })

        // 4. Normalize (auto-adjust contrast and brightness)
        .normalize()

        // 5. Sharpen to enhance text edges
        .sharpen({
          sigma: 1,
          m1: 0.5,
          m2: 0.5,
        })

        // 6. Increase contrast
        .linear(1.2, -(128 * 1.2) + 128)

        // 7. Optional: threshold for very clear text (commented out by default)
        // .threshold(128)

        // 8. Remove noise with median filter
        .median(3)

        // Convert to PNG for best quality
        .png({
          compressionLevel: 0, // No compression for OCR
          quality: 100,
        })
        .toBuffer();

      this.logger.debug(`Preprocessed image ready for OCR`);
      return processed;

    } catch (error) {
      this.logger.error('Image preprocessing failed, using original', error);
      return imageBuffer;
    }
  }

  private async performOCR(imageBuffer: Buffer, skipPreprocessing = false): Promise<string> {
    this.logger.log('Starting Tesseract OCR...');

    try {
      // Use preprocessed image for better results (unless skipped for PDFs)
      const finalBuffer = skipPreprocessing ? imageBuffer : await this.preprocessImage(imageBuffer);

      const { data } = await Tesseract.recognize(
        finalBuffer,
        'fra+eng', // ← FRENCH + ENGLISH
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              const progress = Math.round(m.progress * 100);
              if (progress % 20 === 0) { // Log every 20%
                this.logger.debug(`OCR progress: ${progress}%`);
              }
            }
          },

          // Tesseract configuration for better accuracy
          tessedit_pageseg_mode: Tesseract.PSM.AUTO, // Auto page segmentation
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, // Use LSTM (best accuracy)
          preserve_interword_spaces: '1', // Keep spaces between words

          // Quality settings
          tessedit_do_invert: '1', // Auto-invert if needed
          textord_heavy_nr: '1', // Noise reduction

          // Language-specific
          load_system_dawg: '1',
          load_freq_dawg: '1',

          // Output settings
          tessedit_create_hocr: '0',
          tessedit_create_pdf: '0',
        } as any
      );

      const text = data.text.trim();
      const confidence = data.confidence;

      this.logger.log(`OCR completed. Confidence: ${confidence.toFixed(2)}%, Length: ${text.length} chars`);

      if (text.length < 10) {
        this.logger.warn('OCR returned very short text. Possible issues with image quality or language.');
      }

      return text;

    } catch (error) {
      this.logger.error('Tesseract OCR failed', error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  private async performOCRFromFile(filePath: string): Promise<string> {
    this.logger.log(`Starting Tesseract OCR from file: ${filePath}`);

    try {
      const { data } = await Tesseract.recognize(
        filePath, // Use file path directly - Tesseract handles this better
        'fra+eng', // French + English
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              const progress = Math.round(m.progress * 100);
              if (progress % 20 === 0) {
                this.logger.debug(`OCR progress: ${progress}%`);
              }
            }
          },

          // Tesseract configuration for better accuracy
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
          preserve_interword_spaces: '1',
          tessedit_do_invert: '1',
          textord_heavy_nr: '1',
          load_system_dawg: '1',
          load_freq_dawg: '1',
          tessedit_create_hocr: '0',
          tessedit_create_pdf: '0',
        } as any
      );

      const text = data.text.trim();
      const confidence = data.confidence;

      this.logger.log(`OCR completed. Confidence: ${confidence.toFixed(2)}%, Length: ${text.length} chars`);

      if (text.length < 10) {
        this.logger.warn('OCR returned very short text. Possible issues with image quality or language.');
      }

      return text;

    } catch (error) {
      this.logger.error('Tesseract OCR failed', error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  async getOcrText(documentId: string): Promise<string> {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    return document.ocrText || '';
  }

  async getOcrPreview(documentId: string, maxLength = 500): Promise<string> {
    const fullText = await this.getOcrText(documentId);

    if (fullText.length <= maxLength) {
      return fullText;
    }

    return fullText.substring(0, maxLength) + '...';
  }

  async searchByOcrText(query: string, limit: number = 50): Promise<Document[]> {
    return this.documentsRepository
      .createQueryBuilder('document')
      .where('document.ocrText ILIKE :query', { query: `%${query}%` })
      .andWhere('document.ocrText IS NOT NULL')
      .orderBy('document.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async extractFormationDataFromPdf(documentId: string, actorId: string): Promise<any[]> {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    // Process OCR if not already done
    if (!document.ocrText) {
      await this.processDocument(documentId, actorId);
      const updatedDoc = await this.documentsRepository.findOne({
        where: { id: documentId },
      });
      if (updatedDoc) {
        document.ocrText = updatedDoc.ocrText;
      }
    }

    if (!document.ocrText) {
      throw new Error('Failed to extract text from document');
    }

    const formations = this.parseFormations(document.ocrText);

    this.logger.log(`Extracted ${formations.length} formations from document ${documentId}`);

    return formations;
  }

  private parseFormations(text: string): any[] {
    const formations: any[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let currentFormation: any = null;
    let descriptionLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.looksLikeTitle(line)) {
        // Save previous formation
        if (currentFormation && descriptionLines.length > 0) {
          currentFormation.description = descriptionLines.join(' ').substring(0, 1000);
          formations.push(currentFormation);
        }

        // Start new formation
        currentFormation = {
          title: this.cleanTitle(line),
          description: '',
          startDate: null,
          endDate: null,
          duration: null,
        };
        descriptionLines = [];
      } else if (currentFormation) {
        const dates = this.extractDates(line);
        if (dates.startDate && !currentFormation.startDate) {
          currentFormation.startDate = dates.startDate;
          currentFormation.endDate = dates.endDate;
        }

        const duration = this.extractDuration(line);
        if (duration && !currentFormation.duration) {
          currentFormation.duration = duration;
        }

        if (this.looksLikeDescription(line)) {
          descriptionLines.push(line);
        }
      }
    }

    // Save last formation
    if (currentFormation && descriptionLines.length > 0) {
      currentFormation.description = descriptionLines.join(' ').substring(0, 1000);
      formations.push(currentFormation);
    }

    return formations;
  }

  private looksLikeTitle(line: string): boolean {
    if (line.length > 150 || line.length < 10) return false;

    const uppercaseRatio = (line.match(/[A-ZÀ-Ü]/g) || []).length / line.length;
    if (uppercaseRatio > 0.6) return true;

    if (/^\d+[\.\)]\s+/.test(line)) return true;

    const descWords = ['le', 'la', 'les', 'de', 'des', 'dans', 'pour', 'avec', 'permet', 'cette'];
    const hasDescWords = descWords.some(word => line.toLowerCase().includes(` ${word} `));

    return !hasDescWords && line.length < 80;
  }

  private cleanTitle(line: string): string {
    let cleaned = line.replace(/^\d+[\.\)]\s+/, '');
    cleaned = cleaned.replace(/^[:\-–—\s]+|[:\-–—\s]+$/g, '');
    cleaned = this.toTitleCase(cleaned);
    return cleaned.substring(0, 255);
  }

  private toTitleCase(str: string): string {
    if (str === str.toUpperCase()) {
      return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
    return str;
  }

  private looksLikeDescription(line: string): boolean {
    if (line.length < 20) return false;
    if (/^(date|durée|lieu|formateur|référence):/i.test(line)) return false;
    return true;
  }

  private extractDates(line: string): { startDate: string | null; endDate: string | null } {
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
      /(\d{1,2})-(\d{1,2})-(\d{4})/g,
      /(\d{4})-(\d{1,2})-(\d{1,2})/g,
    ];

    const dates: string[] = [];

    for (const pattern of datePatterns) {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        let date;
        if (match[0].startsWith('20')) {
          date = match[0];
        } else {
          const day = match[1].padStart(2, '0');
          const month = match[2].padStart(2, '0');
          const year = match[3];
          date = `${year}-${month}-${day}`;
        }
        dates.push(date);
      }
    }

    return {
      startDate: dates[0] || null,
      endDate: dates[1] || null,
    };
  }

  private extractDuration(line: string): string | null {
    const durationPattern = /(\d+)\s*(jour|jours|heure|heures|semaine|semaines|mois)/i;
    const match = line.match(durationPattern);

    if (match) {
      return `${match[1]} ${match[2].toLowerCase()}`;
    }

    return null;
  }
}

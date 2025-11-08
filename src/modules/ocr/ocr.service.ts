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
const PDFImage = require('pdf-image').PDFImage;

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
      this.logger.log(`File: ${filePath}, Type: ${document.mimeType}`);

      let ocrText: string;

      try {
        if (document.mimeType.includes('pdf')) {
          ocrText = await this.processPDF(filePath);
        } else {
          ocrText = await this.processImage(filePath);
        }

        if (!ocrText || ocrText.trim().length === 0) {
          ocrText = '[OCR completed but no text was extracted. The document may be blank or the image quality may be too poor.]';
          this.logger.warn(`OCR returned empty text for document ${documentId}`);
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
            success: true,
          },
        });

        this.logger.log(`OCR processing completed for document ${documentId}. Extracted ${ocrText.length} characters.`);

      } catch (ocrError) {
        // OCR failed, but save partial results if any
        const errorMessage = `OCR processing failed: ${ocrError.message}`;
        this.logger.error(errorMessage);

        document.ocrText = `[${errorMessage}]`;
        document.ocrProcessedAt = new Date();
        await this.documentsRepository.save(document);

        await this.auditService.log({
          actorId,
          action: AuditAction.DOCUMENT_PROCESSED,
          targetType: 'Document',
          targetId: documentId,
          payload: {
            error: ocrError.message,
            method: 'tesseract-enhanced',
            success: false,
          },
        });
      }

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

    // First, try to extract text layer (for PDFs with searchable text)
    try {
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      const totalPages = pdf.numPages;
      this.logger.log(`PDF has ${totalPages} pages`);

      const pageTexts: string[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const textItems = textContent.items.map((item: any) => item.str).join(' ');

          if (textItems.trim().length > 50) {
            pageTexts.push(textItems);
            this.logger.log(`Page ${pageNum}: Has text layer (${textItems.length} chars)`);
          } else {
            pageTexts.push('');
          }
        } catch (pageError) {
          this.logger.warn(`Failed to read page ${pageNum}: ${pageError.message}`);
          pageTexts.push('');
        }
      }

      // If all pages have text, we're done
      if (pageTexts.every(text => text.length > 50)) {
        this.logger.log('All pages have text layer, no OCR needed');
        return pageTexts.join('\n\n--- Page Break ---\n\n');
      }

      // Some pages are scanned - try to extract embedded images
      this.logger.log('Attempting to extract embedded images from PDF...');

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (pageTexts[pageNum - 1].length > 50) {
          continue; // Already has text
        }

        try {
          this.logger.log(`Extracting images from page ${pageNum}...`);
          const page = await pdf.getPage(pageNum);
          const operators = await page.getOperatorList();

          // Find image operations in the PDF
          for (let i = 0; i < operators.fnArray.length; i++) {
            if (operators.fnArray[i] === pdfjsLib.OPS.paintImageXObject ||
                operators.fnArray[i] === pdfjsLib.OPS.paintXObject) {

              const imageName = operators.argsArray[i][0];
              this.logger.log(`Found image: ${imageName} on page ${pageNum}`);

              try {
                // Get the image from page resources
                const image = await page.objs.get(imageName);

                if (image && image.data) {
                  this.logger.log(`Image data found: ${image.width}x${image.height}, ${image.data.length} bytes`);

                  // Convert image data to PNG buffer using Sharp
                  const sharp = require('sharp');
                  let imageBuffer: Buffer;

                  // Handle different image formats
                  if (image.kind === 1) { // Grayscale
                    imageBuffer = await sharp(Buffer.from(image.data), {
                      raw: {
                        width: image.width,
                        height: image.height,
                        channels: 1
                      }
                    }).png().toBuffer();
                  } else if (image.kind === 2) { // RGB
                    imageBuffer = await sharp(Buffer.from(image.data), {
                      raw: {
                        width: image.width,
                        height: image.height,
                        channels: 3
                      }
                    }).png().toBuffer();
                  } else if (image.kind === 3) { // RGBA
                    imageBuffer = await sharp(Buffer.from(image.data), {
                      raw: {
                        width: image.width,
                        height: image.height,
                        channels: 4
                      }
                    }).png().toBuffer();
                  } else {
                    this.logger.warn(`Unknown image format: kind=${image.kind}`);
                    continue;
                  }

                  this.logger.log(`Converted to PNG buffer: ${imageBuffer.length} bytes`);

                  // OCR the extracted image
                  const text = await this.performOCR(imageBuffer, true);
                  pageTexts[pageNum - 1] = text;
                  this.logger.log(`Page ${pageNum}: OCR extracted ${text.length} chars from embedded image`);
                  break; // Found and processed the main image for this page
                }
              } catch (imgError) {
                this.logger.error(`Failed to extract image ${imageName}:`, imgError.message);
              }
            }
          }
        } catch (pageError) {
          this.logger.error(`Failed to extract images from page ${pageNum}:`, pageError.message);
        }
      }

      // Return whatever we got
      const result = pageTexts.join('\n\n--- Page Break ---\n\n').trim();

      if (result.length > 100) {
        this.logger.log('Successfully extracted and OCR\'d text from PDF');
        return result;
      }

      // Still couldn't process
      throw new Error(
        'Could not extract images from this PDF.\n\n' +
        'SOLUTION: Please convert your PDF pages to images (PNG or JPG) and upload those instead.\n\n' +
        'How to convert:\n' +
        '1. Open PDF in any viewer\n' +
        '2. Take screenshots of each page (Windows + Shift + S)\n' +
        '3. Save as PNG files\n' +
        '4. Upload the PNG files'
      );

    } catch (pdfError) {
      this.logger.error('PDF processing failed:', pdfError.message);
      throw new Error(`PDF processing failed: ${pdfError.message}`);
    }
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

      // Create worker (v6 API)
      const worker = await Tesseract.createWorker(['fra', 'eng'], 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            if (progress % 20 === 0) {
              this.logger.debug(`OCR progress: ${progress}%`);
            }
          }
        },
      });

      const result = await worker.recognize(finalBuffer);
      await worker.terminate();

      const text = result.data.text.trim();
      const confidence = result.data.confidence;

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
      // Verify file exists and has content
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      this.logger.log(`File size: ${stats.size} bytes`);

      if (stats.size === 0) {
        throw new Error(`File is empty: ${filePath}`);
      }

      // Create Tesseract worker (v6 API)
      this.logger.log('Creating Tesseract worker...');
      const worker = await Tesseract.createWorker(['fra', 'eng'], 1, {
        logger: (m: any) => {
          this.logger.log(`Tesseract: ${m.status} ${m.progress ? Math.round(m.progress * 100) + '%' : ''}`);
        },
      });

      this.logger.log('Worker created, starting recognition...');

      // Recognize text
      const result = await worker.recognize(filePath);
      const text = result.data.text.trim();
      const confidence = result.data.confidence;

      this.logger.log(`OCR completed. Confidence: ${confidence.toFixed(2)}%, Length: ${text.length} chars`);

      // Clean up
      await worker.terminate();

      if (text.length < 10) {
        this.logger.warn('OCR returned very short text. Possible issues with image quality or language.');
      }

      return text;

    } catch (error) {
      this.logger.error(`Tesseract OCR error:`, error);
      this.logger.error(`Error message: ${error.message || 'No error message'}`);
      this.logger.error(`Error type: ${error.constructor?.name || 'Unknown'}`);
      this.logger.error(`Error stack: ${error.stack || 'No stack trace'}`);
      this.logger.error(`Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));

      // Try simple recognition as last resort
      try {
        this.logger.log('Trying simple Tesseract.recognize as fallback...');
        const result = await Tesseract.recognize(filePath, 'fra+eng');
        const text = result.data.text.trim();
        this.logger.log(`Fallback OCR succeeded. Length: ${text.length} chars`);
        return text;
      } catch (fallbackError) {
        this.logger.error('Fallback OCR also failed:', fallbackError.message);
        throw new Error(`OCR failed: ${error.message}. Fallback: ${fallbackError.message}`);
      }
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

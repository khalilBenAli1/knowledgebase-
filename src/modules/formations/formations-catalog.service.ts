import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation } from '../../entities/formation.entity';
import { Document } from '../../entities/document.entity';
import { OcrService } from '../ocr/ocr.service';
import * as fs from 'fs';
import * as path from 'path';

export interface ExtractedFormation {
  title: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  duration?: string;
  location?: string;
  maxParticipants?: number;
}

@Injectable()
export class FormationsCatalogService {
  private readonly logger = new Logger(FormationsCatalogService.name);

  constructor(
    @InjectRepository(Formation)
    private formationsRepository: Repository<Formation>,
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private ocrService: OcrService,
  ) {}

  async extractFormationsFromPDF(filePath: string, createdBy: string): Promise<ExtractedFormation[]> {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.pdf') {
      throw new BadRequestException('Only PDF files are supported for catalog extraction');
    }

    this.logger.log(`Extracting formations from PDF: ${filePath}`);

    // Use OCR service to extract text from PDF
    const text = await this.extractTextFromPDF(filePath);

    // Parse the extracted text to identify formations
    const formations = this.parseFormationsFromText(text);

    this.logger.log(`Extracted ${formations.length} formations from PDF`);
    return formations;
  }

  private async extractTextFromPDF(filePath: string): Promise<string> {
    this.logger.log('Using OCR service to extract text from PDF catalog');

    try {
      // Create a temporary document record for OCR processing
      const fileName = path.basename(filePath);
      const tempDoc = this.documentsRepository.create({
        name: fileName,
        originalFilename: fileName,
        filePath: filePath,
        mimeType: 'application/pdf',
        uploaderId: '00000000-0000-0000-0000-000000000000', // Temporary system UUID
        status: 'uploaded' as any,
        tags: [],
      });

      // Save to repository temporarily
      const savedDoc = await this.documentsRepository.save(tempDoc);

      // Process with OCR service
      const processedDoc = await this.ocrService.processDocument(savedDoc.id, 'system', false);

      // Clean up temporary document
      await this.documentsRepository.delete(savedDoc.id);

      return processedDoc.ocrText || '';
    } catch (error) {
      this.logger.error('Failed to extract text from PDF using OCR', error);
      throw new BadRequestException('Failed to process PDF file with OCR');
    }
  }

  private parseFormationsFromText(text: string): ExtractedFormation[] {
    const formations: ExtractedFormation[] = [];

    // Split by common section delimiters
    const sections = text.split(/\n\n+/);

    let currentFormation: Partial<ExtractedFormation> | null = null;

    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;

      // Detect formation title (usually in caps or starts with keywords)
      const titleMatch = trimmed.match(/^(?:FORMATION|Formation|TITRE|Titre|COURS|Cours)[\s:]*(.+?)$/im);
      if (titleMatch) {
        // Save previous formation if exists
        if (currentFormation && currentFormation.title) {
          formations.push(this.validateFormation(currentFormation));
        }
        // Start new formation
        currentFormation = {
          title: titleMatch[1].trim(),
        };
        continue;
      }

      if (!currentFormation) {
        // Try to extract title from first line if looks like a heading
        if (trimmed.length < 100 && trimmed.length > 5 && !trimmed.includes('.')) {
          currentFormation = {
            title: trimmed,
          };
        }
        continue;
      }

      // Extract description
      if (trimmed.match(/^(?:DESCRIPTION|Description|OBJECTIFS|Objectifs|CONTENU|Contenu)[\s:]/i)) {
        const descMatch = trimmed.match(/^(?:DESCRIPTION|Description|OBJECTIFS|Objectifs|CONTENU|Contenu)[\s:]*(.+)$/is);
        if (descMatch) {
          currentFormation.description = descMatch[1].trim();
        }
      } else if (!currentFormation.description && trimmed.length > 20) {
        // Use as description if it's substantial text
        currentFormation.description = trimmed;
      }

      // Extract dates
      const dateMatch = trimmed.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
      if (dateMatch && !currentFormation.startDate) {
        try {
          currentFormation.startDate = new Date(dateMatch[1]);
        } catch (e) {
          // Ignore invalid dates
        }
      }

      // Extract duration
      const durationMatch = trimmed.match(/(?:DURÉE|Durée|DUREE|Duree|Duration)[\s:]*(\d+\s*(?:jours?|heures?|semaines?|mois))/i);
      if (durationMatch) {
        currentFormation.duration = durationMatch[1].trim();
      }

      // Extract location
      const locationMatch = trimmed.match(/(?:LIEU|Lieu|Location|LOCALISATION|Localisation)[\s:]*(.+?)(?:\n|$)/i);
      if (locationMatch) {
        currentFormation.location = locationMatch[1].trim();
      }

      // Extract max participants
      const participantsMatch = trimmed.match(/(?:PARTICIPANTS|Participants|Places?)[\s:]*(\d+)/i);
      if (participantsMatch) {
        currentFormation.maxParticipants = parseInt(participantsMatch[1]);
      }
    }

    // Add last formation
    if (currentFormation && currentFormation.title) {
      formations.push(this.validateFormation(currentFormation));
    }

    return formations;
  }

  private validateFormation(formation: Partial<ExtractedFormation>): ExtractedFormation {
    return {
      title: formation.title || 'Formation sans titre',
      description: formation.description || 'Aucune description disponible',
      startDate: formation.startDate,
      endDate: formation.endDate,
      duration: formation.duration,
      location: formation.location,
      maxParticipants: formation.maxParticipants,
    };
  }

  async importFormations(
    extractedFormations: ExtractedFormation[],
    createdBy: string,
  ): Promise<Formation[]> {
    const imported: Formation[] = [];

    for (const extracted of extractedFormations) {
      // Check if formation with same title already exists
      const existing = await this.formationsRepository.findOne({
        where: { title: extracted.title },
      });

      if (existing) {
        this.logger.warn(`Formation "${extracted.title}" already exists, skipping`);
        continue;
      }

      const formation = this.formationsRepository.create({
        title: extracted.title,
        description: extracted.description,
        startDate: extracted.startDate,
        endDate: extracted.endDate,
        duration: extracted.duration,
        location: extracted.location,
        maxParticipants: extracted.maxParticipants,
        createdById: createdBy,
        published: false, // HR needs to review before publishing
      });

      const saved = await this.formationsRepository.save(formation);
      imported.push(saved);
      this.logger.log(`Imported formation: ${saved.title}`);
    }

    return imported;
  }

  async extractAndImport(filePath: string, createdBy: string): Promise<{ extracted: number; imported: number; formations: Formation[] }> {
    const extracted = await this.extractFormationsFromPDF(filePath, createdBy);
    const imported = await this.importFormations(extracted, createdBy);

    return {
      extracted: extracted.length,
      imported: imported.length,
      formations: imported,
    };
  }
}

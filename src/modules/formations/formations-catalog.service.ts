import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Formation } from '../../entities/formation.entity';
import { Document } from '../../entities/document.entity';
import { OcrService } from '../ocr/ocr.service';
import { LLMService } from '../llm/llm.service';
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
    private llmService: LLMService,
    private configService: ConfigService,
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
    const text = await this.extractTextFromPDF(filePath, createdBy);

    // Parse the extracted text to identify formations using LLM
    const formations = await this.parseFormationsFromText(text);

    this.logger.log(`Extracted ${formations.length} formations from PDF`);
    return formations;
  }

  private async extractTextFromPDF(filePath: string, createdBy: string): Promise<string> {
    this.logger.log('Using OCR service to extract text from PDF catalog');

    try {
      // Create a temporary document record for OCR processing
      const fileName = path.basename(filePath);
      const tempDoc = this.documentsRepository.create({
        name: fileName,
        originalFilename: fileName,
        filePath: filePath,
        mimeType: 'application/pdf',
        uploaderId: createdBy, // Use actual user ID instead of fake UUID
        status: 'uploaded' as any,
        tags: [],
      });

      // Save to repository temporarily
      const savedDoc = await this.documentsRepository.save(tempDoc);

      // Process with OCR service
      const processedDoc = await this.ocrService.processDocument(savedDoc.id, createdBy, false);

      // Clean up temporary document
      await this.documentsRepository.delete(savedDoc.id);

      return processedDoc.ocrText || '';
    } catch (error) {
      this.logger.error('Failed to extract text from PDF using OCR', error);
      throw new BadRequestException('Failed to process PDF file with OCR');
    }
  }

  private async parseFormationsFromText(text: string): Promise<ExtractedFormation[]> {
    // Check if dev mode is enabled (saves tokens during testing)
    const devModeSkipLLM = this.configService.get<string>('DEV_MODE_OCR_SKIP_LLM', 'false') === 'true';

    if (devModeSkipLLM) {
      this.logger.log('DEV MODE: Using simple regex extraction (no LLM tokens used)');
      return this.parseFormationsWithRegex(text);
    }

    this.logger.log('Using LLM to intelligently extract formations from OCR text');

    const prompt = `Tu es un expert en extraction de données de catalogues de formation.

Analyse le texte OCR suivant d'un catalogue de formation et extrais UNIQUEMENT les formations professionnelles réelles.

RÈGLES CRITIQUES:
1. IGNORE complètement:
   - Les présentations d'agence/entreprise
   - Les pages de garde et introductions
   - Les "--- Page Break ---" et autres marqueurs techniques
   - Les informations générales sur l'organisme de formation
   - Les mentions légales, contacts, etc.

2. EXTRAIT SEULEMENT les formations professionnelles avec:
   - Un titre clair de formation
   - Une description ou des objectifs pédagogiques

3. Pour chaque formation trouvée, extrait ce qui est DISPONIBLE dans le texte:
   - title: Titre de la formation (OBLIGATOIRE)
   - description: Description, objectifs, ou contenu (OBLIGATOIRE)
   - duration: Durée si mentionnée (optionnel, ex: "2 jours", "14 heures")
   - location: Lieu si mentionné (optionnel)
   - maxParticipants: Nombre max de participants si mentionné (optionnel, nombre seulement)

4. NE PAS inventer de données. Si une information n'est pas dans le texte, ne l'inclut pas.

5. Retourne un JSON array avec UNIQUEMENT les formations réelles trouvées.

Format de réponse STRICTEMENT:
{
  "formations": [
    {
      "title": "Titre exact de la formation",
      "description": "Description ou objectifs",
      "duration": "2 jours" (si disponible, sinon omets ce champ),
      "location": "Tunis" (si disponible, sinon omets ce champ),
      "maxParticipants": 15 (si disponible, sinon omets ce champ)
    }
  ]
}

TEXTE OCR:
${text}

Réponds UNIQUEMENT avec le JSON, aucun texte avant ou après.`;

    try {
      const llmResponse = await this.llmService.generateAnswer(prompt, []);

      this.logger.log('LLM response received, parsing JSON');

      // Extract JSON from response (LLM might wrap it in markdown code blocks)
      let jsonText = llmResponse.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(jsonText);
      const formations = parsed.formations || [];

      this.logger.log(`LLM extracted ${formations.length} formations`);

      // Validate each formation
      return formations.map((f: any) => this.validateFormation(f));

    } catch (error) {
      this.logger.error('Failed to parse LLM response, falling back to empty array', error);
      this.logger.debug('LLM response was:', error.message);
      return [];
    }
  }

  private parseFormationsWithRegex(text: string): ExtractedFormation[] {
    const formations: ExtractedFormation[] = [];
    const sections = text.split(/\n\n+/);
    let currentFormation: Partial<ExtractedFormation> | null = null;

    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;

      // Skip page breaks and presentation sections
      if (trimmed.includes('--- Page Break ---') ||
          trimmed.includes('Présentation:') ||
          trimmed.includes('À propos') ||
          trimmed.toLowerCase().includes('académie') && trimmed.length < 200) {
        continue;
      }

      // Detect formation title
      const titleMatch = trimmed.match(/^(?:FORMATION|Formation|TITRE|Titre|COURS|Cours)[\s:]*(.+?)$/im);
      if (titleMatch) {
        if (currentFormation && currentFormation.title) {
          formations.push(this.validateFormation(currentFormation));
        }
        currentFormation = { title: titleMatch[1].trim() };
        continue;
      }

      if (!currentFormation) {
        if (trimmed.length < 100 && trimmed.length > 5 && !trimmed.includes('.')) {
          currentFormation = { title: trimmed };
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

      // If no startDate is provided, set it to a date far in the future
      // HR will need to update this before publishing
      const startDate = extracted.startDate || new Date('2099-12-31');

      const formation = this.formationsRepository.create({
        title: extracted.title,
        description: extracted.description,
        startDate: startDate,
        endDate: extracted.endDate,
        duration: extracted.duration,
        location: extracted.location,
        maxParticipants: extracted.maxParticipants,
        createdById: createdBy,
        published: false, // HR needs to review before publishing
      });

      const saved = await this.formationsRepository.save(formation);
      imported.push(saved);
      this.logger.log(`Imported formation: ${saved.title} (startDate: ${startDate.toISOString().split('T')[0]})`);
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

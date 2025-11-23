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

    const prompt = `Tu es un expert en extraction de données de catalogues de formation professionnelle.

MISSION: Analyse le texte OCR ci-dessous (extrait d'un catalogue PDF de formations) et extrais TOUTES les formations professionnelles de manière PRÉCISE et COMPLÈTE.

RÈGLES D'EXTRACTION:

1. IGNORE COMPLÈTEMENT:
   - Les pages de présentation de l'organisme de formation
   - Les pages de garde, sommaires, index
   - Les "--- Page Break ---" et marqueurs techniques
   - Les mentions légales, contacts, informations générales
   - Les textes publicitaires ou promotionnels

2. EXTRAIT CHAQUE FORMATION avec le MAXIMUM de détails disponibles:
   - title: Le titre EXACT et COMPLET de la formation (OBLIGATOIRE)
   - description: La description détaillée incluant objectifs, contenu, programme, compétences acquises (OBLIGATOIRE - sois généreux, inclus tous les détails)
   - duration: La durée exacte si mentionnée (ex: "2 jours", "14 heures", "3 mois")
   - location: Le lieu si mentionné (ex: "Tunis", "En ligne", "Siège social")
   - maxParticipants: Le nombre maximum de participants (nombre uniquement)
   - startDate: La date de début si mentionnée (format: "YYYY-MM-DD")
   - endDate: La date de fin si mentionnée (format: "YYYY-MM-DD")

3. INDICES DE DÉTECTION D'UNE FORMATION:
   - Titre en gras ou en majuscules
   - Mots-clés: "Formation", "Stage", "Atelier", "Certification", "Cours", "Séminaire"
   - Présence d'objectifs pédagogiques
   - Mention de durée, dates, ou programme
   - Public cible (ex: "managers", "commerciaux", "techniciens")

4. QUALITÉ DE L'EXTRACTION:
   - Sois PRÉCIS: copie les titres et descriptions EXACTEMENT comme dans le texte
   - Sois COMPLET: extrais TOUTES les formations du catalogue, même si elles sont brèves
   - NE PAS inventer de données - si une info n'existe pas, omets le champ
   - Si une formation semble incomplète, extrais quand même ce qui est disponible

5. GESTION DES CAS DIFFICILES:
   - Si le texte OCR est mal formaté, utilise le contexte pour détecter les formations
   - Si plusieurs formations sont regroupées, sépare-les clairement
   - Si une formation n'a pas de titre explicite mais a du contenu clair, crée un titre descriptif basé sur le contenu

Format de réponse JSON STRICTEMENT:
{
  "formations": [
    {
      "title": "Titre complet et exact de la formation",
      "description": "Description détaillée avec objectifs, contenu, programme, compétences...",
      "duration": "2 jours",
      "location": "Tunis",
      "maxParticipants": 15,
      "startDate": "2024-06-15",
      "endDate": "2024-06-16"
    }
  ]
}

IMPORTANT:
- Lis TOUT le texte attentivement
- N'omets AUCUNE formation
- Sois généreux avec les descriptions (inclus tous les détails disponibles)
- Réponds UNIQUEMENT avec le JSON valide, sans texte avant ou après

TEXTE OCR DU CATALOGUE:
${text}

JSON:`;

    try {
      // Use significantly more tokens for catalog extraction (8000 tokens)
      // and higher temperature for better creativity in parsing
      const llmResponse = await this.llmService.generateAnswer(prompt, [], {
        maxTokens: 8000,
        temperature: 0.2, // Low temperature for precise extraction
      });

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

      // Convert startDate to Date object if it's a string, or use default
      let startDate: Date;
      if (extracted.startDate) {
        startDate = typeof extracted.startDate === 'string'
          ? new Date(extracted.startDate)
          : extracted.startDate;
      } else {
        // If no startDate is provided, set it to a date far in the future
        // HR will need to update this before publishing
        startDate = new Date('2099-12-31');
      }

      // Convert endDate to Date object if it's a string
      let endDate: Date | undefined;
      if (extracted.endDate) {
        endDate = typeof extracted.endDate === 'string'
          ? new Date(extracted.endDate)
          : extracted.endDate;
      }

      const formation = this.formationsRepository.create({
        title: extracted.title,
        description: extracted.description,
        startDate: startDate,
        endDate: endDate,
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

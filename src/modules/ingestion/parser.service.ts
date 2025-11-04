import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

export interface ParsedDocument {
  text: string;
  metadata?: {
    pages?: number;
    [key: string]: any;
  };
}

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  async parseFile(filePath: string, mimeType: string): Promise<ParsedDocument> {
    this.logger.log(`Parsing file: ${filePath} (${mimeType})`);

    try {
      if (mimeType === 'application/pdf') {
        return await this.parsePDF(filePath);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        return await this.parseDOCX(filePath);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      this.logger.error(`Error parsing file ${filePath}:`, error);
      throw error;
    }
  }

  private async parsePDF(filePath: string): Promise<ParsedDocument> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info,
      },
    };
  }

  private async parseDOCX(filePath: string): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });

    return {
      text: result.value,
      metadata: {
        messages: result.messages,
      },
    };
  }

  chunkText(
    text: string,
    chunkSize: number = 800,
    overlap: number = 150,
  ): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);

    let currentChunk = '';
    let previousChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        previousChunk = currentChunk;

        const overlapText = previousChunk.slice(-overlap);
        currentChunk = overlapText + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

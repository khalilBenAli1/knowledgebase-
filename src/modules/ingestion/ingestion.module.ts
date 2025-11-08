import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { Document } from '../../entities/document.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { DocumentsModule } from '../documents/documents.module';
import { LLMModule } from '../llm/llm.module';
import { ParserService } from './parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentChunk]),
    forwardRef(() => DocumentsModule),
    LLMModule,
  ],
  controllers: [IngestionController],
  providers: [IngestionService, ParserService],
  exports: [IngestionService],
})
export class IngestionModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from '../../entities/document.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { AuditModule } from '../audit/audit.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { OcrModule } from '../ocr/ocr.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentChunk]),
    AuditModule,
    forwardRef(() => IngestionModule),
    forwardRef(() => OcrModule),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

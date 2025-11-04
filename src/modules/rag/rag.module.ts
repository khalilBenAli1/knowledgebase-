import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RagService } from './rag.service';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { Document } from '../../entities/document.entity';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentChunk, Document]),
    LLMModule,
  ],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}

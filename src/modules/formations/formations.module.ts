import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormationsController } from './formations.controller';
import { FormationsService } from './formations.service';
import { FormationsCatalogService } from './formations-catalog.service';
import { Formation } from '../../entities/formation.entity';
import { Document } from '../../entities/document.entity';
import { OcrModule } from '../ocr/ocr.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Formation, Document]),
    OcrModule,
  ],
  controllers: [FormationsController],
  providers: [FormationsService, FormationsCatalogService],
  exports: [FormationsService, FormationsCatalogService],
})
export class FormationsModule {}

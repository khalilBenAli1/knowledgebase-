import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormationsController } from './formations.controller';
import { FormationsService } from './formations.service';
import { Formation } from '../../entities/formation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Formation])],
  controllers: [FormationsController],
  providers: [FormationsService],
  exports: [FormationsService],
})
export class FormationsModule {}

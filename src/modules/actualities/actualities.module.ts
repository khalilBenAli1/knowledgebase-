import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActualitiesController } from './actualities.controller';
import { ActualitiesService } from './actualities.service';
import { Actuality } from '../../entities/actuality.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Actuality])],
  controllers: [ActualitiesController],
  providers: [ActualitiesService],
  exports: [ActualitiesService],
})
export class ActualitiesModule {}

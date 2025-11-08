import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActualitiesController } from './actualities.controller';
import { ActualitiesService } from './actualities.service';
import { ActualityInteractionsService } from './actuality-interactions.service';
import { Actuality } from '../../entities/actuality.entity';
import { ActualityInteraction } from '../../entities/actuality-interaction.entity';
import { ActualityComment } from '../../entities/actuality-comment.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Actuality, ActualityInteraction, ActualityComment]),
    NotificationsModule,
  ],
  controllers: [ActualitiesController],
  providers: [ActualitiesService, ActualityInteractionsService],
  exports: [ActualitiesService],
})
export class ActualitiesModule {}

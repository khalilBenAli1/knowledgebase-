import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from '../../entities/event.entity';
import { EventFormField } from '../../entities/event-form-field.entity';
import { EventRegistration } from '../../entities/event-registration.entity';
import { EventRegistrationResponse } from '../../entities/event-registration-response.entity';
import { User } from '../../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      EventFormField,
      EventRegistration,
      EventRegistrationResponse,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

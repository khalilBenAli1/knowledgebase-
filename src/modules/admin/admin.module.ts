import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { Document } from '../../entities/document.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { Event } from '../../entities/event.entity';
import { EventRegistration } from '../../entities/event-registration.entity';
import { FormationRequest } from '../../entities/formation-request.entity';
import { FeedbackModule } from '../feedback/feedback.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatSession,
      ChatMessage,
      Document,
      DocumentChunk,
      User,
      Role,
      AuditLog,
      Event,
      EventRegistration,
      FormationRequest,
    ]),
    FeedbackModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormationRequest } from '../../entities/formation-request.entity';
import { User } from '../../entities/user.entity';
import { Formation } from '../../entities/formation.entity';
import { FormationRequestsController } from './formation-requests.controller';
import { FormationRequestsService } from './formation-requests.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormationRequest, User, Formation]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [FormationRequestsController],
  providers: [FormationRequestsService],
  exports: [FormationRequestsService],
})
export class FormationRequestsModule {}

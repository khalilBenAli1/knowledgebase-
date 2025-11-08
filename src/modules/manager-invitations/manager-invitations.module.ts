import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagerInvitation } from '../../entities/manager-invitation.entity';
import { User } from '../../entities/user.entity';
import { ManagerInvitationsService } from './manager-invitations.service';
import { ManagerInvitationsController } from './manager-invitations.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ManagerInvitation, User]),
    NotificationsModule,
  ],
  providers: [ManagerInvitationsService],
  controllers: [ManagerInvitationsController],
})
export class ManagerInvitationsModule {}

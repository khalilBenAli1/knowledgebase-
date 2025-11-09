import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersHRController } from './users-hr.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailService } from '../email/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    NotificationsModule,
  ],
  controllers: [UsersController, UsersHRController],
  providers: [UsersService, EmailService],
  exports: [UsersService],
})
export class UsersModule {}

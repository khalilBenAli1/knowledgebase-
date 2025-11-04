import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { RoleName } from '../../entities/role.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('api/feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(@Body() createFeedbackDto: CreateFeedbackDto, @CurrentUser() user: User) {
    return this.feedbackService.create(createFeedbackDto, user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN, RoleName.IT_ADMIN)
  findAll() {
    return this.feedbackService.findAll();
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN, RoleName.IT_ADMIN)
  getAllFeedback() {
    return this.feedbackService.findAll();
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN, RoleName.IT_ADMIN)
  getStatistics() {
    return this.feedbackService.getStatistics();
  }
}

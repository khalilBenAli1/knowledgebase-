import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../entities/role.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { ChatDto } from './dto/chat.dto';

@Controller('api/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  getUserSessions(@CurrentUser() user: User) {
    return this.chatService.getUserSessions(user.id);
  }

  @Get('sessions/all')
  @UseGuards(RolesGuard)
  @Roles(RoleName.IT_ADMIN, RoleName.HR_ADMIN)
  getAllSessions() {
    return this.chatService.getAllSessions();
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    return this.chatService.getSession(id);
  }

  @Get('sessions/:id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }

  @Post()
  async chat(@Body() chatDto: ChatDto, @CurrentUser() user: User) {
    const message = await this.chatService.chat(
      chatDto.question,
      user.id,
      chatDto.sessionId,
    );

    return {
      sessionId: message.sessionId,
      message,
    };
  }
}

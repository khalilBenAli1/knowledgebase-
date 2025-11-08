import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ManagerInvitationsService } from './manager-invitations.service';

@Controller('api/manager-invitations')
@UseGuards(JwtAuthGuard)
export class ManagerInvitationsController {
  constructor(private readonly invitationsService: ManagerInvitationsService) {}

  @Post('invite')
  async inviteCollaborator(
    @Request() req,
    @Body() body: { collaboratorEmail: string; message?: string },
  ) {
    return this.invitationsService.inviteCollaborator(req.user.id, body.collaboratorEmail, body.message);
  }

  @Get('received')
  async getMyInvitations(@Request() req) {
    return this.invitationsService.getMyInvitations(req.user.id);
  }

  @Get('sent')
  async getSentInvitations(@Request() req) {
    return this.invitationsService.getSentInvitations(req.user.id);
  }

  @Put(':id/respond')
  async respondToInvitation(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { accept: boolean },
  ) {
    return this.invitationsService.respondToInvitation(id, req.user.id, body.accept);
  }

  @Delete(':id')
  async cancelInvitation(@Param('id') id: string, @Request() req) {
    await this.invitationsService.cancelInvitation(id, req.user.id);
    return { message: 'Invitation cancelled' };
  }

  @Get('collaborators')
  async getMyCollaborators(@Request() req) {
    return this.invitationsService.getMyCollaborators(req.user.id);
  }

  @Delete('collaborators/:id')
  async removeCollaborator(@Param('id') id: string, @Request() req) {
    await this.invitationsService.removeCollaborator(req.user.id, id);
    return { message: 'Collaborator removed' };
  }
}

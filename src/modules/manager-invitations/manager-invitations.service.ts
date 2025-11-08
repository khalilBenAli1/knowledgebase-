import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManagerInvitation, InvitationStatus } from '../../entities/manager-invitation.entity';
import { User } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ManagerInvitationsService {
  private readonly logger = new Logger(ManagerInvitationsService.name);

  constructor(
    @InjectRepository(ManagerInvitation)
    private invitationsRepository: Repository<ManagerInvitation>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async inviteCollaborator(managerId: string, collaboratorEmail: string, message?: string): Promise<ManagerInvitation> {
    // Get manager
    const manager = await this.usersRepository.findOne({
      where: { id: managerId },
      relations: ['role'],
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    // Check if user is actually a manager
    if (manager.role.name !== 'Manager' && manager.role.name !== 'Responsable RH') {
      throw new ForbiddenException('Only managers can invite collaborators');
    }

    // Find collaborator by email
    const collaborator = await this.usersRepository.findOne({
      where: { email: collaboratorEmail },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator not found with this email');
    }

    if (collaborator.id === managerId) {
      throw new BadRequestException('Cannot invite yourself');
    }

    // Check if collaborator already has this manager
    if (collaborator.managerId === managerId) {
      throw new BadRequestException('This user is already your collaborator');
    }

    // Check for existing pending invitation
    const existing = await this.invitationsRepository.findOne({
      where: {
        managerId,
        collaboratorId: collaborator.id,
        status: InvitationStatus.PENDING,
      },
    });

    if (existing) {
      throw new BadRequestException('Invitation already sent to this user');
    }

    // Create invitation
    const invitation = this.invitationsRepository.create({
      managerId,
      collaboratorId: collaborator.id,
      message,
      status: InvitationStatus.PENDING,
    });

    const saved = await this.invitationsRepository.save(invitation);

    // Send notification
    await this.notificationsService.notifyManagerInvitation(
      collaborator.id,
      manager.name,
      saved.id,
    );

    this.logger.log(`Manager ${managerId} invited collaborator ${collaborator.id}`);
    return saved;
  }

  async getMyInvitations(userId: string): Promise<ManagerInvitation[]> {
    return this.invitationsRepository.find({
      where: { collaboratorId: userId, status: InvitationStatus.PENDING },
      relations: ['manager'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSentInvitations(managerId: string): Promise<ManagerInvitation[]> {
    return this.invitationsRepository.find({
      where: { managerId },
      relations: ['collaborator'],
      order: { createdAt: 'DESC' },
    });
  }

  async respondToInvitation(invitationId: string, userId: string, accept: boolean): Promise<ManagerInvitation> {
    const invitation = await this.invitationsRepository.findOne({
      where: { id: invitationId, collaboratorId: userId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('This invitation has already been responded to');
    }

    invitation.status = accept ? InvitationStatus.ACCEPTED : InvitationStatus.DECLINED;
    invitation.respondedAt = new Date();

    const updated = await this.invitationsRepository.save(invitation);

    // If accepted, update user's manager
    if (accept) {
      await this.usersRepository.update(
        { id: userId },
        { managerId: invitation.managerId },
      );
      this.logger.log(`User ${userId} accepted manager invitation from ${invitation.managerId}`);
    } else {
      this.logger.log(`User ${userId} declined manager invitation from ${invitation.managerId}`);
    }

    return updated;
  }

  async cancelInvitation(invitationId: string, managerId: string): Promise<void> {
    const invitation = await this.invitationsRepository.findOne({
      where: { id: invitationId, managerId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending invitations');
    }

    invitation.status = InvitationStatus.CANCELLED;
    await this.invitationsRepository.save(invitation);
  }

  async getMyCollaborators(managerId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { managerId },
      relations: ['role'],
      order: { name: 'ASC' },
    });
  }

  async removeCollaborator(managerId: string, collaboratorId: string): Promise<void> {
    const collaborator = await this.usersRepository.findOne({
      where: { id: collaboratorId, managerId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator not found or not under your management');
    }

    await this.usersRepository.update(
      { id: collaboratorId },
      { managerId: null },
    );

    this.logger.log(`Manager ${managerId} removed collaborator ${collaboratorId}`);
  }
}

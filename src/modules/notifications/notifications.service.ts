import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
    actionUrl?: string,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId,
      type,
      title,
      message,
      metadata,
      actionUrl,
    });

    const saved = await this.notificationsRepository.save(notification);
    this.logger.log(`Created notification ${saved.id} for user ${userId}`);
    return saved;
  }

  async getUserNotifications(
    userId: string,
    unreadOnly = false,
    page = 1,
    limit = 20,
  ): Promise<{ notifications: Notification[]; total: number; page: number; totalPages: number }> {
    const query = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (unreadOnly) {
      query.andWhere('notification.isRead = :isRead', { isRead: false });
    }

    // Get total count
    const total = await query.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    const notifications = await query.skip(skip).take(limit).getMany();

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('userId = :userId AND isRead = false', { userId })
      .execute();

    this.logger.log(`Marked all notifications as read for user ${userId}`);
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await this.notificationsRepository.delete({ id: notificationId, userId });
  }

  // Helper methods for specific notification types
  async notifyFormationRequest(managerId: string, requesterName: string, formationTitle: string, requestId: string): Promise<void> {
    await this.create(
      managerId,
      NotificationType.FORMATION_REQUEST,
      'Nouvelle demande de formation',
      `${requesterName} a demandé la formation "${formationTitle}"`,
      { requestId, requesterName, formationTitle },
      `/manager?tab=requests`, // Route to manager dashboard, requests tab
    );
  }

  async notifyManagerInvitation(collaboratorId: string, managerName: string, invitationId: string): Promise<void> {
    await this.create(
      collaboratorId,
      NotificationType.MANAGER_INVITATION,
      'Invitation de manager',
      `${managerName} vous a invité à rejoindre son équipe`,
      { invitationId, managerName },
      `/settings?tab=invitations`, // Route to settings, invitations tab
    );
  }

  async notifyFormationApproved(userId: string, formationTitle: string): Promise<void> {
    await this.create(
      userId,
      NotificationType.FORMATION_APPROVED,
      'Formation approuvée',
      `Votre demande pour "${formationTitle}" a été approuvée`,
      { formationTitle },
      `/formations`, // Route to formations page
    );
  }

  async notifyFormationDeclined(userId: string, formationTitle: string, reason?: string): Promise<void> {
    await this.create(
      userId,
      NotificationType.FORMATION_DECLINED,
      'Formation refusée',
      `Votre demande pour "${formationTitle}" a été refusée${reason ? ': ' + reason : ''}`,
      { formationTitle, reason },
      `/formations`, // Route to formations page
    );
  }

  async notifyActualityComment(userId: string, commenterName: string, actualityTitle: string, actualityId: string): Promise<void> {
    await this.create(
      userId,
      NotificationType.ACTUALITY_COMMENT,
      'Nouveau commentaire',
      `${commenterName} a commenté sur "${actualityTitle}"`,
      { commenterName, actualityTitle, actualityId },
      `/actualites/${actualityId}`,
    );
  }

  async notifyActualityLike(userId: string, likerName: string, actualityTitle: string, actualityId: string): Promise<void> {
    await this.create(
      userId,
      NotificationType.ACTUALITY_LIKE,
      'Nouvelle mention J\'aime',
      `${likerName} a aimé votre actualité "${actualityTitle}"`,
      { likerName, actualityTitle, actualityId },
      `/actualites/${actualityId}`,
    );
  }

  async notifyHRFormationRequest(formationTitle: string, requesterName: string, requestId: string): Promise<void> {
    // Find all HR users using query builder
    const hrUsers = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name = :roleName', { roleName: 'Responsable RH' })
      .getMany();

    // Create notification for each HR user
    for (const hrUser of hrUsers) {
      await this.create(
        hrUser.id,
        NotificationType.FORMATION_REQUEST,
        'Nouvelle demande de formation (Validation RH)',
        `${requesterName} a demandé la formation "${formationTitle}" (approuvée par le manager)`,
        { requestId, requesterName, formationTitle },
        `/hr/formations`, // Route to HR dashboard
      );
    }

    this.logger.log(`Notified ${hrUsers.length} HR users about formation request ${requestId}`);
  }
}

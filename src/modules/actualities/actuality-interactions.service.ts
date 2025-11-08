import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActualityInteraction, InteractionType } from '../../entities/actuality-interaction.entity';
import { ActualityComment } from '../../entities/actuality-comment.entity';
import { Actuality } from '../../entities/actuality.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ActualityInteractionsService {
  private readonly logger = new Logger(ActualityInteractionsService.name);

  constructor(
    @InjectRepository(ActualityInteraction)
    private interactionsRepository: Repository<ActualityInteraction>,
    @InjectRepository(ActualityComment)
    private commentsRepository: Repository<ActualityComment>,
    @InjectRepository(Actuality)
    private actualitiesRepository: Repository<Actuality>,
    private notificationsService: NotificationsService,
  ) {}

  async recordView(actualityId: string, userId: string): Promise<void> {
    // Check if user already viewed this actuality
    const existing = await this.interactionsRepository.findOne({
      where: { actualityId, userId, type: InteractionType.VIEW },
    });

    if (!existing) {
      const interaction = this.interactionsRepository.create({
        actualityId,
        userId,
        type: InteractionType.VIEW,
      });
      await this.interactionsRepository.save(interaction);
      this.logger.log(`User ${userId} viewed actuality ${actualityId}`);
    }
  }

  async toggleLike(actualityId: string, userId: string, userName: string): Promise<{ liked: boolean }> {
    const existing = await this.interactionsRepository.findOne({
      where: { actualityId, userId, type: InteractionType.LIKE },
    });

    if (existing) {
      // Unlike
      await this.interactionsRepository.remove(existing);
      this.logger.log(`User ${userId} unliked actuality ${actualityId}`);
      return { liked: false };
    } else {
      // Like
      const interaction = this.interactionsRepository.create({
        actualityId,
        userId,
        type: InteractionType.LIKE,
      });
      await this.interactionsRepository.save(interaction);
      this.logger.log(`User ${userId} liked actuality ${actualityId}`);

      // Notify actuality author
      const actuality = await this.actualitiesRepository.findOne({
        where: { id: actualityId },
        relations: ['createdBy'],
      });

      if (actuality && actuality.createdBy.id !== userId) {
        await this.notificationsService.notifyActualityLike(
          actuality.createdBy.id,
          userName,
          actuality.title,
          actualityId,
        );
      }

      return { liked: true };
    }
  }

  async getActualityStats(actualityId: string): Promise<{ views: number; likes: number; comments: number }> {
    const [views, likes, comments] = await Promise.all([
      this.interactionsRepository.count({
        where: { actualityId, type: InteractionType.VIEW },
      }),
      this.interactionsRepository.count({
        where: { actualityId, type: InteractionType.LIKE },
      }),
      this.commentsRepository.count({
        where: { actualityId },
      }),
    ]);

    return { views, likes, comments };
  }

  async getUserLikedActualities(userId: string): Promise<string[]> {
    const likes = await this.interactionsRepository.find({
      where: { userId, type: InteractionType.LIKE },
      select: ['actualityId'],
    });
    return likes.map(l => l.actualityId);
  }

  async addComment(
    actualityId: string,
    userId: string,
    userName: string,
    comment: string,
    parentCommentId?: string,
  ): Promise<ActualityComment> {
    const actuality = await this.actualitiesRepository.findOne({
      where: { id: actualityId },
      relations: ['createdBy'],
    });

    if (!actuality) {
      throw new NotFoundException('Actuality not found');
    }

    const newComment = this.commentsRepository.create({
      actualityId,
      userId,
      comment,
      parentCommentId,
    });

    const saved = await this.commentsRepository.save(newComment);

    // Notify actuality author
    if (actuality.createdBy.id !== userId) {
      await this.notificationsService.notifyActualityComment(
        actuality.createdBy.id,
        userName,
        actuality.title,
        actualityId,
      );
    }

    this.logger.log(`User ${userId} commented on actuality ${actualityId}`);
    return saved;
  }

  async getComments(actualityId: string): Promise<ActualityComment[]> {
    return this.commentsRepository.find({
      where: { actualityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, userId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found or not yours');
    }

    await this.commentsRepository.remove(comment);
    this.logger.log(`User ${userId} deleted comment ${commentId}`);
  }
}

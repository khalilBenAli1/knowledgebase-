import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../../entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../entities/audit-log.entity';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    private auditService: AuditService,
  ) {}

  async create(createFeedbackDto: CreateFeedbackDto, userId: string): Promise<Feedback> {
    const feedback = this.feedbackRepository.create({
      ...createFeedbackDto,
      userId,
    });

    const saved = await this.feedbackRepository.save(feedback);

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.FEEDBACK_SUBMIT,
      targetType: 'Feedback',
      targetId: saved.id,
      payload: {
        messageId: createFeedbackDto.messageId,
        rating: createFeedbackDto.rating,
      },
    });

    return saved;
  }

  async findAll(): Promise<Feedback[]> {
    return this.feedbackRepository.find({
      relations: ['message', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStatistics(): Promise<any> {
    const total = await this.feedbackRepository.count();
    const useful = await this.feedbackRepository.count({
      where: { rating: 'useful' as any },
    });
    const notUseful = await this.feedbackRepository.count({
      where: { rating: 'not_useful' as any },
    });

    return {
      total,
      useful,
      notUseful,
      usefulPercentage: total > 0 ? (useful / total) * 100 : 0,
    };
  }
}

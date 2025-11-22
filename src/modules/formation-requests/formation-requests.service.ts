import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormationRequest, FormationRequestStatus } from '../../entities/formation-request.entity';
import { User } from '../../entities/user.entity';
import { Formation } from '../../entities/formation.entity';
import { CreateFormationRequestDto } from './dto/create-formation-request.dto';
import { ReviewFormationRequestDto } from './dto/review-formation-request.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../entities/audit-log.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FormationRequestsService {
  private readonly logger = new Logger(FormationRequestsService.name);

  constructor(
    @InjectRepository(FormationRequest)
    private requestsRepository: Repository<FormationRequest>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Formation)
    private formationsRepository: Repository<Formation>,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createDto: CreateFormationRequestDto): Promise<FormationRequest> {
    // Get user with manager relationship
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['manager'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.managerId) {
      throw new BadRequestException('You do not have a manager assigned. Please contact HR.');
    }

    // Validate that either formationId OR custom formation fields are provided
    const isCatalogRequest = !!createDto.formationId;
    const isCustomRequest = !!createDto.customFormationTitle;

    if (!isCatalogRequest && !isCustomRequest) {
      throw new BadRequestException('Either formationId or customFormationTitle must be provided');
    }

    if (isCatalogRequest && isCustomRequest) {
      throw new BadRequestException('Cannot provide both formationId and customFormationTitle');
    }

    // If requesting from catalog, validate formation exists
    if (isCatalogRequest) {
      const formation = await this.formationsRepository.findOne({
        where: { id: createDto.formationId },
      });

      if (!formation) {
        throw new NotFoundException('Formation not found');
      }

      if (!formation.published) {
        throw new BadRequestException('This formation is not available for requests');
      }

      // Check if user already has a pending request for this formation
      const existingRequest = await this.requestsRepository.findOne({
        where: {
          formationId: createDto.formationId,
          requesterId: userId,
          status: FormationRequestStatus.PENDING,
        },
      });

      if (existingRequest) {
        throw new BadRequestException('You already have a pending request for this formation');
      }
    }

    const request = this.requestsRepository.create({
      formationId: createDto.formationId || null,
      customFormationTitle: createDto.customFormationTitle || null,
      customFormationDetails: createDto.customFormationDetails || null,
      customFormationLink: createDto.customFormationLink || null,
      customFormationDate: createDto.customFormationDate ? new Date(createDto.customFormationDate) : null,
      requesterId: userId,
      managerId: user.managerId,
      requesterMessage: createDto.requesterMessage,
      status: FormationRequestStatus.PENDING,
    });

    const savedRequest = await this.requestsRepository.save(request);

    const formationTitle = isCatalogRequest
      ? (await this.formationsRepository.findOne({ where: { id: createDto.formationId! } }))?.title || 'Unknown'
      : createDto.customFormationTitle!;

    await this.auditService.log({
      actorId: userId,
      action: AuditAction.DOCUMENT_UPLOAD,
      targetType: 'FormationRequest',
      targetId: savedRequest.id,
      payload: {
        formationId: createDto.formationId,
        formationTitle: formationTitle,
        isCustomRequest,
      },
    });

    this.logger.log(`User ${userId} requested formation: ${formationTitle}${isCustomRequest ? ' (custom)' : ''}`);

    // Send notification to manager
    await this.notificationsService.notifyFormationRequest(
      user.managerId,
      user.name,
      formationTitle,
      savedRequest.id,
    );

    return savedRequest;
  }

  async getUserRequests(userId: string): Promise<FormationRequest[]> {
    return this.requestsRepository.find({
      where: { requesterId: userId },
      relations: ['formation', 'requester', 'manager'],
      order: { createdAt: 'DESC' },
    });
  }

  async getManagerRequests(managerId: string, status?: FormationRequestStatus): Promise<FormationRequest[]> {
    const where: any = { managerId };

    if (status) {
      where.status = status;
    }

    return this.requestsRepository.find({
      where,
      relations: ['formation', 'requester', 'manager'],
      order: { createdAt: 'DESC' },
    });
  }

  async getRequestById(id: string, userId: string): Promise<FormationRequest> {
    const request = await this.requestsRepository.findOne({
      where: { id },
      relations: ['formation', 'requester', 'manager'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Check if user is the requester or the manager
    if (request.requesterId !== userId && request.managerId !== userId) {
      throw new ForbiddenException('You do not have permission to view this request');
    }

    return request;
  }

  async reviewRequest(
    requestId: string,
    managerId: string,
    reviewDto: ReviewFormationRequestDto,
  ): Promise<FormationRequest> {
    const request = await this.requestsRepository.findOne({
      where: { id: requestId },
      relations: ['formation', 'requester', 'manager'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.managerId !== managerId) {
      throw new ForbiddenException('You are not the manager for this request');
    }

    if (request.status !== FormationRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been reviewed');
    }

    // If manager approves, set to MANAGER_APPROVED (pending HR review)
    // If manager declines, set to DECLINED (final)
    if (reviewDto.status === FormationRequestStatus.APPROVED) {
      request.status = FormationRequestStatus.MANAGER_APPROVED;
    } else {
      request.status = reviewDto.status;
    }

    request.managerResponse = reviewDto.managerResponse ?? null;
    request.reviewedBy = managerId;
    request.reviewedAt = new Date();

    const updated = await this.requestsRepository.save(request);

    await this.auditService.log({
      actorId: managerId,
      action: AuditAction.DOCUMENT_APPROVE,
      targetType: 'FormationRequest',
      targetId: requestId,
      payload: {
        status: request.status,
        requesterId: request.requesterId,
      },
    });

    this.logger.log(`Manager ${managerId} ${request.status} formation request ${requestId}`);

    // Notify based on status
    const formationTitle = request.formationId
      ? (await this.formationsRepository.findOne({ where: { id: request.formationId } }))?.title
      : request.customFormationTitle;

    if (formationTitle) {
      if (request.status === FormationRequestStatus.MANAGER_APPROVED) {
        // Notify HR that there's a new request to review
        await this.notificationsService.notifyHRFormationRequest(
          formationTitle,
          request.requester?.name || 'Employee',
          requestId,
        );
      } else if (request.status === FormationRequestStatus.DECLINED) {
        await this.notificationsService.notifyFormationDeclined(
          request.requesterId,
          formationTitle,
          reviewDto.managerResponse,
        );
      }
    }

    return updated;
  }

  async cancelRequest(requestId: string, userId: string): Promise<FormationRequest> {
    const request = await this.requestsRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requesterId !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (request.status !== FormationRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    request.status = FormationRequestStatus.CANCELLED;
    return this.requestsRepository.save(request);
  }

  async getStatistics(managerId: string): Promise<any> {
    const requests = await this.getManagerRequests(managerId);

    return {
      total: requests.length,
      pending: requests.filter(r => r.status === FormationRequestStatus.PENDING).length,
      managerApproved: requests.filter(r => r.status === FormationRequestStatus.MANAGER_APPROVED).length,
      approved: requests.filter(r => r.status === FormationRequestStatus.APPROVED).length,
      declined: requests.filter(r => r.status === FormationRequestStatus.DECLINED).length,
      cancelled: requests.filter(r => r.status === FormationRequestStatus.CANCELLED).length,
    };
  }

  // HR Methods
  async getHRPendingRequests(): Promise<FormationRequest[]> {
    return this.requestsRepository.find({
      where: { status: FormationRequestStatus.MANAGER_APPROVED },
      relations: ['formation', 'requester', 'manager'],
      order: { createdAt: 'DESC' },
    });
  }

  async hrReviewRequest(
    requestId: string,
    hrUserId: string,
    status: FormationRequestStatus.APPROVED | FormationRequestStatus.DECLINED,
    hrResponse?: string,
  ): Promise<FormationRequest> {
    const request = await this.requestsRepository.findOne({
      where: { id: requestId },
      relations: ['formation', 'requester', 'manager'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== FormationRequestStatus.MANAGER_APPROVED) {
      throw new BadRequestException('This request is not pending HR review');
    }

    if (status === FormationRequestStatus.DECLINED && !hrResponse) {
      throw new BadRequestException('Decline motive is required when declining a request');
    }

    request.status = status;
    request.hrResponse = hrResponse ?? null;
    request.hrReviewedBy = hrUserId;
    request.hrReviewedAt = new Date();

    const updated = await this.requestsRepository.save(request);

    await this.auditService.log({
      actorId: hrUserId,
      action: AuditAction.DOCUMENT_APPROVE,
      targetType: 'FormationRequest',
      targetId: requestId,
      payload: {
        status,
        requesterId: request.requesterId,
        hrResponse,
      },
    });

    this.logger.log(`HR ${hrUserId} ${status} formation request ${requestId}`);

    // Notify requester of final decision
    const formationTitle = request.formationId
      ? (await this.formationsRepository.findOne({ where: { id: request.formationId } }))?.title
      : request.customFormationTitle;

    if (formationTitle) {
      if (status === FormationRequestStatus.APPROVED) {
        await this.notificationsService.notifyFormationApproved(request.requesterId, formationTitle);
      } else if (status === FormationRequestStatus.DECLINED) {
        await this.notificationsService.notifyFormationDeclined(
          request.requesterId,
          formationTitle,
          hrResponse,
        );
      }
    }

    return updated;
  }
}

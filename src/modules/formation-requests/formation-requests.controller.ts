import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FormationRequestsService } from './formation-requests.service';
import { CreateFormationRequestDto } from './dto/create-formation-request.dto';
import { ReviewFormationRequestDto } from './dto/review-formation-request.dto';
import { FormationRequestStatus } from '../../entities/formation-request.entity';

@Controller('api/formation-requests')
@UseGuards(JwtAuthGuard)
export class FormationRequestsController {
  constructor(private readonly formationRequestsService: FormationRequestsService) {}

  @Post()
  async create(@Request() req, @Body() createDto: CreateFormationRequestDto) {
    return this.formationRequestsService.create(req.user.id, createDto);
  }

  @Get('my-requests')
  async getMyRequests(@Request() req) {
    return this.formationRequestsService.getUserRequests(req.user.id);
  }

  @Get('pending-reviews')
  async getPendingReviews(@Request() req, @Query('status') status?: FormationRequestStatus) {
    return this.formationRequestsService.getManagerRequests(req.user.id, status);
  }

  @Get('statistics')
  async getStatistics(@Request() req) {
    return this.formationRequestsService.getStatistics(req.user.id);
  }

  @Get(':id')
  async getRequest(@Param('id') id: string, @Request() req) {
    return this.formationRequestsService.getRequestById(id, req.user.id);
  }

  @Put(':id/review')
  async reviewRequest(
    @Param('id') id: string,
    @Request() req,
    @Body() reviewDto: ReviewFormationRequestDto,
  ) {
    return this.formationRequestsService.reviewRequest(id, req.user.id, reviewDto);
  }

  @Delete(':id')
  async cancelRequest(@Param('id') id: string, @Request() req) {
    return this.formationRequestsService.cancelRequest(id, req.user.id);
  }

  // HR Endpoints
  @Get('hr/pending')
  async getHRPendingRequests(@Request() req) {
    // TODO: Add RH role check guard
    return this.formationRequestsService.getHRPendingRequests();
  }

  @Put(':id/hr-review')
  async hrReviewRequest(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { status: FormationRequestStatus.APPROVED | FormationRequestStatus.DECLINED; hrResponse?: string },
  ) {
    // TODO: Add RH role check guard
    return this.formationRequestsService.hrReviewRequest(id, req.user.id, body.status, body.hrResponse);
  }
}

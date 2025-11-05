import { Controller, Post, Get, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { OcrService } from './ocr.service';
import { RoleName } from '../../entities/role.entity';

@Controller('api/ocr')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OcrController {
  constructor(private ocrService: OcrService) {}

  @Post('process/:documentId')
  @Roles(RoleName.HR_ADMIN, RoleName.LEGAL_ADMIN, RoleName.IT_ADMIN)
  async processDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: User,
    @Query('force') force?: string,
  ) {
    const forceReprocess = force === 'true';
    return this.ocrService.processDocument(documentId, user.id, forceReprocess);
  }

  @Get('text/:documentId')
  @Roles(RoleName.HR_ADMIN, RoleName.LEGAL_ADMIN, RoleName.IT_ADMIN)
  async getOcrText(@Param('documentId') documentId: string) {
    return this.ocrService.getOcrText(documentId);
  }

  @Get('search')
  @Roles(RoleName.HR_ADMIN, RoleName.LEGAL_ADMIN, RoleName.IT_ADMIN)
  async searchByOcrText(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.ocrService.searchByOcrText(query, limit ? parseInt(limit.toString(), 10) : 10);
  }
}

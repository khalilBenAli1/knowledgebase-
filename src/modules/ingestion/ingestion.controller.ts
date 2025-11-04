import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../entities/role.entity';

@Controller('api/ingestion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('process/:id')
  @Roles(RoleName.HR_ADMIN, RoleName.IT_ADMIN)
  async processDocument(@Param('id') id: string) {
    await this.ingestionService.processDocument(id);
    return { message: 'Document processing started', documentId: id };
  }

  @Post('reindex/:id')
  @Roles(RoleName.IT_ADMIN)
  async reindexDocument(@Param('id') id: string) {
    await this.ingestionService.reindexDocument(id);
    return { message: 'Document re-indexing started', documentId: id };
  }

  @Get('status/:id')
  @Roles(RoleName.HR_ADMIN, RoleName.IT_ADMIN)
  getStatus(@Param('id') id: string) {
    return this.ingestionService.getProcessingStatus(id);
  }
}

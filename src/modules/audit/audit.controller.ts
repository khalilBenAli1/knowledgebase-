import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../entities/role.entity';

@Controller('api/admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.IT_ADMIN, RoleName.LEGAL_ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
  ) {
    return this.auditService.findAll(parseInt(limit), parseInt(offset));
  }
}

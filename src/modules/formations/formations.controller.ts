import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FormationsService } from './formations.service';
import { Formation } from '../../entities/formation.entity';
import { RoleName } from '../../entities/role.entity';

@Controller('api/formations')
@UseGuards(JwtAuthGuard)
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN, RoleName.LEGAL_ADMIN)
  async create(
    @Body() createData: { title: string; description: string; startDate: Date; endDate?: Date; imageUrl?: string },
    @Request() req,
  ): Promise<Formation> {
    return this.formationsService.create(createData, req.user);
  }

  @Get()
  async findAll(@Query('published') published?: string): Promise<Formation[]> {
    const isPublished = published === 'true' ? true : published === 'false' ? false : undefined;
    return this.formationsService.findAll(isPublished);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Formation> {
    return this.formationsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN, RoleName.LEGAL_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<Formation>,
    @Request() req,
  ): Promise<Formation> {
    return this.formationsService.update(id, updateData, req.user);
  }

  @Put(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN, RoleName.LEGAL_ADMIN)
  async publish(@Param('id') id: string, @Request() req): Promise<Formation> {
    return this.formationsService.publish(id, req.user);
  }

  @Put(':id/unpublish')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN, RoleName.LEGAL_ADMIN)
  async unpublish(@Param('id') id: string, @Request() req): Promise<Formation> {
    return this.formationsService.unpublish(id, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HR_ADMIN, RoleName.LEGAL_ADMIN)
  async remove(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    await this.formationsService.remove(id, req.user);
    return { message: 'Formation deleted successfully' };
  }
}

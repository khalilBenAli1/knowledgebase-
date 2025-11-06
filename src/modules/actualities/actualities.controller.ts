import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActualitiesService } from './actualities.service';
import { Actuality } from '../../entities/actuality.entity';
import { RoleName } from '../../entities/role.entity';

@Controller('api/actualities')
@UseGuards(JwtAuthGuard)
export class ActualitiesController {
  constructor(private readonly actualitiesService: ActualitiesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.LEGAL_ADMIN, RoleName.HR_ADMIN)
  async create(
    @Body() createData: { title: string; description: string; imageUrl?: string },
    @Request() req,
  ): Promise<Actuality> {
    return this.actualitiesService.create(createData, req.user);
  }

  @Get()
  async findAll(@Query('published') published?: string): Promise<Actuality[]> {
    const isPublished = published === 'true' ? true : published === 'false' ? false : undefined;
    return this.actualitiesService.findAll(isPublished);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Actuality> {
    return this.actualitiesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.LEGAL_ADMIN, RoleName.HR_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<Actuality>,
    @Request() req,
  ): Promise<Actuality> {
    return this.actualitiesService.update(id, updateData, req.user);
  }

  @Put(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(RoleName.LEGAL_ADMIN, RoleName.HR_ADMIN)
  async publish(@Param('id') id: string, @Request() req): Promise<Actuality> {
    return this.actualitiesService.publish(id, req.user);
  }

  @Put(':id/unpublish')
  @UseGuards(RolesGuard)
  @Roles(RoleName.LEGAL_ADMIN, RoleName.HR_ADMIN)
  async unpublish(@Param('id') id: string, @Request() req): Promise<Actuality> {
    return this.actualitiesService.unpublish(id, req.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.LEGAL_ADMIN, RoleName.HR_ADMIN)
  async remove(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    await this.actualitiesService.remove(id, req.user);
    return { message: 'Actuality deleted successfully' };
  }
}

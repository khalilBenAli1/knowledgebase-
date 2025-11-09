import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from '../../dto/create-event.dto';
import { RegisterEventDto } from '../../dto/register-event.dto';
import { RoleName } from '../../entities/role.entity';

@Controller('api/events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(RoleName.HR_ADMIN)
  create(@Body() createEventDto: CreateEventDto, @Req() req: any) {
    return this.eventsService.create(createEventDto, req.user);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.eventsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.findOne(id, req.user);
  }

  @Put(':id')
  @Roles(RoleName.HR_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateEventDto: CreateEventDto,
    @Req() req: any,
  ) {
    return this.eventsService.update(id, updateEventDto, req.user);
  }

  @Put(':id/publish')
  @Roles(RoleName.HR_ADMIN)
  publish(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.publish(id, req.user);
  }

  @Put(':id/unpublish')
  @Roles(RoleName.HR_ADMIN)
  unpublish(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.unpublish(id, req.user);
  }

  @Delete(':id')
  @Roles(RoleName.HR_ADMIN)
  delete(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.delete(id, req.user);
  }

  @Post(':id/register')
  register(
    @Param('id') id: string,
    @Body() registerDto: RegisterEventDto,
    @Req() req: any,
  ) {
    return this.eventsService.register(id, registerDto, req.user);
  }

  @Get(':id/my-registration')
  getMyRegistration(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.getMyRegistration(id, req.user);
  }

  @Get(':id/statistics')
  @Roles(RoleName.HR_ADMIN)
  getEventStatistics(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.getEventStatistics(id, req.user);
  }
}

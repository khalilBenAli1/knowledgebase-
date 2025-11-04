import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../entities/role.entity';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics')
  @Roles(RoleName.HR_ADMIN, RoleName.IT_ADMIN)
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('topics')
  @Roles(RoleName.HR_ADMIN, RoleName.IT_ADMIN)
  getMostAskedTopics() {
    return this.adminService.getMostAskedTopics();
  }

  // User Management Endpoints (IT Admin only)
  @Get('users')
  @Roles(RoleName.IT_ADMIN)
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('roles')
  @Roles(RoleName.IT_ADMIN)
  getAllRoles() {
    return this.adminService.getAllRoles();
  }

  @Patch('users/:id/role')
  @Roles(RoleName.IT_ADMIN)
  updateUserRole(@Param('id') id: string, @Body('roleId') roleId: string) {
    return this.adminService.updateUserRole(id, roleId);
  }

  @Patch('users/:id/status')
  @Roles(RoleName.IT_ADMIN)
  updateUserStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.updateUserStatus(id, isActive);
  }

  @Post('users/invite')
  @Roles(RoleName.IT_ADMIN)
  inviteUser(@Body() inviteDto: { email: string; name: string; roleId: string }) {
    return this.adminService.inviteUser(inviteDto);
  }

  // Audit Logs with Pagination
  @Get('audit')
  @Roles(RoleName.IT_ADMIN, RoleName.LEGAL_ADMIN)
  getAuditLogs(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('sortField') sortField: string = 'timestamp',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.adminService.getAuditLogs(
      parseInt(page),
      parseInt(pageSize),
      sortField,
      sortOrder,
    );
  }
}

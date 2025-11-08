import { Controller, Get, Put, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';
import { RoleName } from '../../entities/role.entity';

@Controller('api/hr/team-management')
@UseGuards(JwtAuthGuard)
export class UsersHRController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('overview')
  async getTeamOverview(@Request() req) {
    // Check if user is HR
    const user = await this.usersService.findOne(req.user.id);
    if (user.role.name !== RoleName.HR_ADMIN) {
      throw new ForbiddenException('Only HR can access this resource');
    }

    const allUsers = await this.usersService.findAll();

    // Group users by role
    const managers = allUsers.filter(u => u.role.name === RoleName.MANAGER);
    const employees = allUsers.filter(u =>
      u.role.name !== RoleName.MANAGER &&
      u.role.name !== RoleName.HR_ADMIN &&
      u.role.name !== RoleName.IT_ADMIN
    );

    // Get unassigned employees
    const unassignedEmployees = employees.filter(e => !e.managerId);

    // Build manager-collaborator tree
    const managerTeams = managers.map(manager => ({
      id: manager.id,
      name: manager.name,
      email: manager.email,
      role: manager.role,
      collaborators: employees.filter(e => e.managerId === manager.id),
    }));

    return {
      managers: managerTeams,
      unassignedEmployees,
      totalManagers: managers.length,
      totalEmployees: employees.length,
      totalUnassigned: unassignedEmployees.length,
    };
  }

  @Put('assign-manager')
  async assignManager(
    @Request() req,
    @Body() body: { collaboratorId: string; managerId: string | null; notify?: boolean },
  ) {
    // Check if user is HR
    const user = await this.usersService.findOne(req.user.id);
    if (user.role.name !== RoleName.HR_ADMIN) {
      throw new ForbiddenException('Only HR can assign managers');
    }

    const collaborator = await this.usersService.findOne(body.collaboratorId);
    const oldManagerId = collaborator.managerId;

    // Update manager assignment
    await this.usersService.updateManager(body.collaboratorId, body.managerId);

    // Send notifications if requested
    if (body.notify !== false) {
      // Notify collaborator
      if (body.managerId) {
        const manager = await this.usersService.findOne(body.managerId);
        await this.notificationsService.create(
          collaborator.id,
          NotificationType.MANAGER_ASSIGNED,
          'Nouveau manager assigné',
          `${manager.name} est maintenant votre manager`,
          { managerId: manager.id, managerName: manager.name },
          '/settings',
        );

        // Notify new manager
        await this.notificationsService.create(
          manager.id,
          NotificationType.COLLABORATOR_ASSIGNED,
          'Nouveau collaborateur assigné',
          `${collaborator.name} a été ajouté à votre équipe`,
          { collaboratorId: collaborator.id, collaboratorName: collaborator.name },
          '/manager?tab=team',
        );
      }

      // Notify old manager if there was one
      if (oldManagerId && oldManagerId !== body.managerId) {
        await this.notificationsService.create(
          oldManagerId,
          NotificationType.COLLABORATOR_REMOVED,
          'Collaborateur retiré',
          `${collaborator.name} a été retiré de votre équipe`,
          { collaboratorId: collaborator.id, collaboratorName: collaborator.name },
          '/manager?tab=team',
        );
      }
    }

    return { message: 'Manager assigned successfully' };
  }

  @Put('batch-assign')
  async batchAssignManager(
    @Request() req,
    @Body() body: { assignments: Array<{ collaboratorId: string; managerId: string | null }>; notify?: boolean },
  ) {
    // Check if user is HR
    const user = await this.usersService.findOne(req.user.id);
    if (user.role.name !== RoleName.HR_ADMIN) {
      throw new ForbiddenException('Only HR can assign managers');
    }

    const results: Array<{ collaboratorId: string; success: boolean; error?: string }> = [];
    for (const assignment of body.assignments) {
      try {
        const collaborator = await this.usersService.findOne(assignment.collaboratorId);
        const oldManagerId = collaborator.managerId;

        await this.usersService.updateManager(assignment.collaboratorId, assignment.managerId);

        // Send notifications if requested
        if (body.notify !== false) {
          if (assignment.managerId) {
            const manager = await this.usersService.findOne(assignment.managerId);
            await this.notificationsService.create(
              collaborator.id,
              NotificationType.MANAGER_ASSIGNED,
              'Nouveau manager assigné',
              `${manager.name} est maintenant votre manager`,
              { managerId: manager.id, managerName: manager.name },
              '/settings',
            );

            await this.notificationsService.create(
              manager.id,
              NotificationType.COLLABORATOR_ASSIGNED,
              'Nouveau collaborateur assigné',
              `${collaborator.name} a été ajouté à votre équipe`,
              { collaboratorId: collaborator.id, collaboratorName: collaborator.name },
              '/manager?tab=team',
            );
          }

          if (oldManagerId && oldManagerId !== assignment.managerId) {
            await this.notificationsService.create(
              oldManagerId,
              NotificationType.COLLABORATOR_REMOVED,
              'Collaborateur retiré',
              `${collaborator.name} a été retiré de votre équipe`,
              { collaboratorId: collaborator.id, collaboratorName: collaborator.name },
              '/manager?tab=team',
            );
          }
        }

        results.push({ collaboratorId: assignment.collaboratorId, success: true });
      } catch (error) {
        results.push({ collaboratorId: assignment.collaboratorId, success: false, error: error.message });
      }
    }

    return {
      message: 'Batch assignment completed',
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  }
}

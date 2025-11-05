import { Injectable, UnauthorizedException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../../entities/user.entity';
import { Role, RoleName } from '../../entities/role.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../entities/audit-log.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private dataSource: DataSource,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: User, ipAddress?: string, userAgent?: string) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role.name,
    };

    await this.auditService.log({
      actorId: user.id,
      action: AuditAction.USER_LOGIN,
      targetType: 'User',
      targetId: user.id,
      payload: { email: user.email },
      ipAddress,
      userAgent,
    });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateJwtPayload(payload: any): Promise<User> {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async signup(signupDto: { name: string; email: string; password: string }, ipAddress?: string, userAgent?: string) {
    this.logger.log(`Signup attempt for email: ${signupDto.email}`);

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(signupDto.email);
    if (existingUser) {
      this.logger.warn(`Signup failed: User with email ${signupDto.email} already exists`);
      throw new BadRequestException('Un utilisateur avec cet email existe déjà');
    }

    // Get default "User" role
    const userRole = await this.rolesRepository.findOne({
      where: { name: RoleName.USER },
    });

    if (!userRole) {
      this.logger.error('Default user role not found in database. Please run database seeds.');
      throw new InternalServerErrorException('Configuration système incorrecte. Veuillez contacter l\'administrateur.');
    }

    let newUser: User;
    let userWithRole: User;

    try {
      // Create new user
      newUser = await this.usersService.create({
        name: signupDto.name,
        email: signupDto.email,
        password: signupDto.password,
        roleId: userRole.id,
      });
      this.logger.log(`User created successfully with ID: ${newUser.id}`);

      // Reload user with role relation for login
      userWithRole = await this.usersService.findById(newUser.id);

      if (!userWithRole || !userWithRole.role) {
        this.logger.error(`Failed to reload user ${newUser.id} with role relation`);
        throw new InternalServerErrorException('Erreur lors de la création du compte');
      }

      // Log signup audit
      try {
        await this.auditService.log({
          actorId: newUser.id,
          action: AuditAction.USER_LOGIN, // Note: Could be changed to USER_SIGNUP if that action exists
          targetType: 'User',
          targetId: newUser.id,
          payload: { email: newUser.email, signupMethod: 'email' },
          ipAddress,
          userAgent,
        });
      } catch (auditError) {
        // Log audit error but don't fail the signup
        this.logger.error(`Audit log failed for user ${newUser.id}:`, auditError);
      }

      // Return login token
      this.logger.log(`Signup successful for user: ${newUser.email}`);
      return this.login(userWithRole, ipAddress, userAgent);
    } catch (error) {
      this.logger.error(`Signup failed for ${signupDto.email}:`, error.message);

      // If it's already a BadRequest or other HTTP exception, rethrow it
      if (error instanceof BadRequestException ||
          error instanceof UnauthorizedException ||
          error instanceof InternalServerErrorException) {
        throw error;
      }

      // Otherwise, wrap it in a generic error
      throw new InternalServerErrorException('Une erreur est survenue lors de l\'inscription. Veuillez réessayer.');
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, updateData: { name?: string; email?: string }) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.usersService.findByEmail(updateData.email);
      if (existingUser) {
        throw new BadRequestException('Cet email est déjà utilisé');
      }
    }

    // Update user fields
    if (updateData.name) {
      user.name = updateData.name;
    }
    if (updateData.email) {
      user.email = updateData.email;
    }

    // Save user
    const updatedUser = await this.dataSource.getRepository(User).save(user);

    // Log audit
    await this.auditService.log({
      actorId: userId,
      action: AuditAction.USER_LOGIN, // Using USER_LOGIN as proxy for profile update
      targetType: 'User',
      targetId: userId,
      payload: { updates: updateData },
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      select: ['id', 'email', 'passwordHash'],
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 8 caractères');
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial',
      );
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.passwordHash = hashedPassword;
    await this.dataSource.getRepository(User).save(user);

    // Log audit
    await this.auditService.log({
      actorId: userId,
      action: AuditAction.USER_LOGIN, // Using USER_LOGIN as proxy for password change
      targetType: 'User',
      targetId: userId,
      payload: { action: 'password_changed' },
    });

    return {
      message: 'Mot de passe modifié avec succès',
    };
  }
}

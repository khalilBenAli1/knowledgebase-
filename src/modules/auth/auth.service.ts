import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../../entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../entities/audit-log.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditService: AuditService,
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
}

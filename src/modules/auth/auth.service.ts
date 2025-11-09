import { Injectable, UnauthorizedException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../../entities/user.entity';
import { Role, RoleName } from '../../entities/role.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../entities/audit-log.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private emailService: EmailService,
    private dataSource: DataSource,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Votre compte a été désactivé');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Veuillez vérifier votre email avant de vous connecter');
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

    try {
      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours expiry

      // Create new user with verification token
      newUser = await this.usersService.create({
        name: signupDto.name,
        email: signupDto.email,
        password: signupDto.password,
        roleId: userRole.id,
      });
      this.logger.log(`User created successfully with ID: ${newUser.id}`);

      // Update user with email verification token
      const userRepository = this.dataSource.getRepository(User);
      await userRepository.update(newUser.id, {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpires: tokenExpiry,
        isEmailVerified: false,
        lastVerificationEmailSent: new Date(),
      });

      // Send verification email
      try {
        await this.emailService.sendVerificationEmail(
          newUser.email,
          newUser.name,
          verificationToken,
        );
        this.logger.log(`Verification email sent to ${newUser.email}`);
      } catch (emailError) {
        this.logger.error(`Failed to send verification email to ${newUser.email}:`, emailError);
        // Continue even if email fails
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

      // Return success message (DON'T log user in automatically)
      this.logger.log(`Signup successful for user: ${newUser.email}`);
      return {
        message: 'Inscription réussie. Veuillez vérifier votre email pour activer votre compte.',
        email: newUser.email,
      };
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

  async verifyEmail(token: string) {
    this.logger.log(`Email verification attempt with token: ${token.substring(0, 10)}...`);

    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      this.logger.warn(`Email verification failed: Invalid token`);
      throw new BadRequestException('Token de vérification invalide ou expiré');
    }

    // Check if token is expired
    if (user.emailVerificationTokenExpires && new Date() > user.emailVerificationTokenExpires) {
      this.logger.warn(`Email verification failed: Token expired for user ${user.email}`);
      throw new BadRequestException('Token de vérification expiré. Veuillez demander un nouveau lien de vérification.');
    }

    // Check if already verified
    if (user.isEmailVerified) {
      this.logger.log(`Email already verified for user ${user.email}`);
      return {
        message: 'Votre email a déjà été vérifié. Vous pouvez vous connecter.',
      };
    }

    // Verify email
    await userRepository.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
    });

    this.logger.log(`Email verified successfully for user ${user.email}`);

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.name);
      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (emailError) {
      this.logger.error(`Failed to send welcome email to ${user.email}:`, emailError);
      // Continue even if welcome email fails
    }

    // Log audit
    try {
      await this.auditService.log({
        actorId: user.id,
        action: AuditAction.USER_LOGIN, // Using USER_LOGIN as proxy for email verification
        targetType: 'User',
        targetId: user.id,
        payload: { action: 'email_verified' },
      });
    } catch (auditError) {
      this.logger.error(`Audit log failed for user ${user.id}:`, auditError);
    }

    return {
      message: 'Votre email a été vérifié avec succès. Vous pouvez maintenant vous connecter.',
    };
  }

  async resendVerificationEmail(email: string) {
    this.logger.log(`Resend verification email request for: ${email}`);

    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not
      this.logger.warn(`Resend verification: User not found for ${email}`);
      return {
        message: 'Si un compte existe avec cet email, un lien de vérification a été envoyé.',
      };
    }

    // Check if already verified
    if (user.isEmailVerified) {
      this.logger.log(`Resend verification: Email already verified for ${email}`);
      throw new BadRequestException('Votre email a déjà été vérifié.');
    }

    // Check cooldown (1 minute = 60000 milliseconds)
    if (user.lastVerificationEmailSent) {
      const now = new Date();
      const timeSinceLastEmail = now.getTime() - user.lastVerificationEmailSent.getTime();
      const cooldownPeriod = 60000; // 1 minute in milliseconds

      if (timeSinceLastEmail < cooldownPeriod) {
        const remainingSeconds = Math.ceil((cooldownPeriod - timeSinceLastEmail) / 1000);
        this.logger.warn(`Resend verification cooldown: ${remainingSeconds}s remaining for ${email}`);
        throw new BadRequestException(
          `Veuillez attendre ${remainingSeconds} secondes avant de demander un nouvel email de vérification.`
        );
      }
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours expiry

    // Update user with new token and timestamp
    await userRepository.update(user.id, {
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: tokenExpiry,
      lastVerificationEmailSent: new Date(),
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken,
      );
      this.logger.log(`Verification email resent to ${user.email}`);
    } catch (emailError) {
      this.logger.error(`Failed to resend verification email to ${user.email}:`, emailError);
      throw new InternalServerErrorException('Erreur lors de l\'envoi de l\'email de vérification');
    }

    return {
      message: 'Un nouveau lien de vérification a été envoyé à votre email.',
    };
  }

  async requestPasswordReset(email: string) {
    this.logger.log(`Password reset request for: ${email}`);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not for security
      this.logger.warn(`Password reset: User not found for ${email}`);
      return {
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      };
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // 1 hour expiry

    // Save reset token to database
    try {
      await this.passwordResetTokenRepository.save({
        token: resetToken,
        userId: user.id,
        expiresAt: tokenExpiry,
        used: false,
      });
      this.logger.log(`Password reset token created for user ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to create password reset token for ${user.email}:`, error);
      throw new InternalServerErrorException('Erreur lors de la création du token de réinitialisation');
    }

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken,
      );
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (emailError) {
      this.logger.error(`Failed to send password reset email to ${user.email}:`, emailError);
      throw new InternalServerErrorException('Erreur lors de l\'envoi de l\'email de réinitialisation');
    }

    // Log audit
    try {
      await this.auditService.log({
        actorId: user.id,
        action: AuditAction.USER_LOGIN, // Using USER_LOGIN as proxy for password reset request
        targetType: 'User',
        targetId: user.id,
        payload: { action: 'password_reset_requested' },
      });
    } catch (auditError) {
      this.logger.error(`Audit log failed for user ${user.id}:`, auditError);
    }

    return {
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    this.logger.log(`Password reset attempt with token: ${token.substring(0, 10)}...`);

    // Find the reset token
    const resetTokenRecord = await this.passwordResetTokenRepository.findOne({
      where: { token, used: false },
      relations: ['user'],
    });

    if (!resetTokenRecord) {
      this.logger.warn(`Password reset failed: Invalid or already used token`);
      throw new BadRequestException('Token de réinitialisation invalide ou déjà utilisé');
    }

    // Check if token is expired
    if (new Date() > resetTokenRecord.expiresAt) {
      this.logger.warn(`Password reset failed: Token expired`);
      throw new BadRequestException('Token de réinitialisation expiré. Veuillez demander un nouveau lien.');
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

    // Update user password
    const userRepository = this.dataSource.getRepository(User);
    await userRepository.update(resetTokenRecord.userId, {
      passwordHash: hashedPassword,
    });

    // Mark token as used
    await this.passwordResetTokenRepository.update(resetTokenRecord.id, {
      used: true,
    });

    this.logger.log(`Password reset successful for user ID: ${resetTokenRecord.userId}`);

    // Log audit
    try {
      await this.auditService.log({
        actorId: resetTokenRecord.userId,
        action: AuditAction.USER_LOGIN, // Using USER_LOGIN as proxy for password reset
        targetType: 'User',
        targetId: resetTokenRecord.userId,
        payload: { action: 'password_reset_completed' },
      });
    } catch (auditError) {
      this.logger.error(`Audit log failed for user ${resetTokenRecord.userId}:`, auditError);
    }

    return {
      message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    };
  }
}

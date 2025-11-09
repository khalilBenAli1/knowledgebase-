import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = new User();
    user.name = createUserDto.name;
    user.email = createUserDto.email;
    user.roleId = createUserDto.roleId;

    if (createUserDto.password) {
      user.passwordHash = await bcrypt.hash(createUserDto.password, 10);
    }

    if (createUserDto.externalId) {
      user.externalId = createUserDto.externalId;
    }

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.email) {
      user.email = updateUserDto.email;
    }

    if (updateUserDto.roleId) {
      user.roleId = updateUserDto.roleId;
    }

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.remove(user);
  }

  async findOne(id: string): Promise<User> {
    return this.findById(id);
  }

  async updateManager(userId: string, managerId: string | null): Promise<User> {
    const user = await this.findById(userId);
    user.managerId = managerId;
    return this.usersRepository.save(user);
  }

  async adminResetPassword(userId: string): Promise<{ tempPassword: string }> {
    this.logger.log(`Admin password reset requested for user ID: ${userId}`);

    const user = await this.findById(userId);

    // Generate a random temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex'); // 16 character hex string

    // Hash the temporary password
    user.passwordHash = await bcrypt.hash(tempPassword, 10);

    await this.usersRepository.save(user);
    this.logger.log(`Password updated in database for user ${user.email}`);

    // Send email with temporary password
    try {
      await this.emailService.sendAdminPasswordResetEmail(user.email, user.name, tempPassword);
      this.logger.log(`Admin password reset email sent successfully to ${user.email}`);
    } catch (emailError) {
      this.logger.error(
        `Failed to send admin password reset email to ${user.email}`,
        emailError instanceof Error ? emailError.stack : emailError
      );
      this.logger.error(`Email error details: ${emailError instanceof Error ? emailError.message : JSON.stringify(emailError)}`);
      throw new InternalServerErrorException('Failed to send password reset email. The password has been reset but the user was not notified.');
    }

    return { tempPassword };
  }
}

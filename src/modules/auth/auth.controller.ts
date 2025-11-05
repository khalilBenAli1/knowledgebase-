import { Controller, Post, UseGuards, Request, Get, Body, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(req.user, ipAddress, userAgent);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Request() req, @Body() signupDto: SignupDto) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.signup(signupDto, ipAddress, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getUserProfile(@CurrentUser() user: User) {
    return this.authService.getUserProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateData: { name?: string; email?: string },
  ) {
    return this.authService.updateProfile(user.id, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: User,
    @Body() passwordData: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      user.id,
      passwordData.currentPassword,
      passwordData.newPassword,
    );
  }
}

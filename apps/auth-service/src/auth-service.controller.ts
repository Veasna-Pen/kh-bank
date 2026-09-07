import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  SendOtpDto,
  VerifyOtpDto,
} from '@app/common/dto/auth';
import { JwtAuthGuard } from '@app/auth';
import type { IAuthenticatedUser } from '@app/common/interfaces/auth';
import type { Request } from 'express';
import { CurrentUser } from '@app/common';

@Controller('auth')
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: IAuthenticatedUser) {
    return { user };
  }

  @Post('otp/send')
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authServiceService.sendOtp(sendOtpDto);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authServiceService.verifyOtp(verifyOtpDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authServiceService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    return this.authServiceService.login(loginDto, { ipAddress, userAgent });
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authServiceService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authServiceService.logout(refreshTokenDto);
  }
}

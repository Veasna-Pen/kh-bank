import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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

  @Post('send-otp')
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authServiceService.sendOtp(sendOtpDto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authServiceService.verifyOtp(verifyOtpDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authServiceService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authServiceService.login(loginDto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authServiceService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authServiceService.logout(refreshTokenDto);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser() user: IAuthenticatedUser) {
    return this.authServiceService.getActiveSessions(user.userId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @CurrentUser() user: IAuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.authServiceService.revokeSession(user.userId, sessionId);
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  async revokeAllSessions(@CurrentUser() user: IAuthenticatedUser) {
    return this.authServiceService.revokeAllOtherSessions(
      user.userId,
      user.deviceId,
    );
  }
}

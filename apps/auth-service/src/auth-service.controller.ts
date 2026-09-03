import { Body, Controller, Post } from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { RegisterDto } from '@app/common/dto/auth';

@Controller('auth')
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authServiceService.register(registerDto);
  }
}

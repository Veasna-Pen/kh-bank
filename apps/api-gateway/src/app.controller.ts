import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(['', 'api/v1'])
  getHello() {
    return this.appService.getHello();
  }

  @Get(['health', 'api/v1/health'])
  getHealth() {
    return this.appService.getHealth();
  }
}

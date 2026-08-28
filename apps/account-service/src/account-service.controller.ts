import { Controller, Get } from '@nestjs/common';
import { AccountServiceService } from './account-service.service';

@Controller()
export class AccountServiceController {
  constructor(private readonly accountServiceService: AccountServiceService) {}

  @Get()
  getHello(): string {
    return this.accountServiceService.getHello();
  }
}

import { Controller, Get } from '@nestjs/common';
import { LedgerServiceService } from './ledger-service.service';

@Controller()
export class LedgerServiceController {
  constructor(private readonly ledgerServiceService: LedgerServiceService) {}

  @Get()
  getHello(): string {
    return this.ledgerServiceService.getHello();
  }
}

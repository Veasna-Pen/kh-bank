import { Controller, Get } from '@nestjs/common';
import { TransferServiceService } from './transfer-service.service';

@Controller()
export class TransferServiceController {
  constructor(private readonly transferServiceService: TransferServiceService) {}

  @Get()
  getHello(): string {
    return this.transferServiceService.getHello();
  }
}

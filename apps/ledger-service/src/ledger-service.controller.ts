import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LedgerServiceService } from './ledger-service.service';
import { DepositDto } from '@app/common/dto/ledger';
import { JwtAuthGuard, Roles, RolesGuard } from '@app/auth';
import { Currency, UserRole } from '@app/common/enums';

@Controller('ledger')
export class LedgerServiceController {
  constructor(private readonly ledgerServiceService: LedgerServiceService) {}

  @Post('deposits')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deposit(@Body() dto: DepositDto) {
    return this.ledgerServiceService.deposit(dto);
  }

  @Get('accounts/:id/balance')
  async getAccountBalance(
    @Param('id', ParseUUIDPipe) accountId: string,
    @Query('currency') currency?: Currency,
  ) {
    return this.ledgerServiceService.getAccountBalance(accountId, currency);
  }
}

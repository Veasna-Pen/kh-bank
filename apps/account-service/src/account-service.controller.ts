import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AccountServiceService } from './account-service.service';
import {
  CreateAccountDto,
  UpdateAccountStatusDto,
} from '@app/common/dto/account';
import { JwtAuthGuard } from '@app/auth';
import { CurrentUser } from '@app/common';
import type { IAuthenticatedUser } from '@app/common/interfaces/auth';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountServiceController {
  constructor(private readonly accountServiceService: AccountServiceService) {}

  @Post()
  async createAccount(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountServiceService.createAccount(user.userId, dto);
  }

  @Get()
  async getMyAccounts(@CurrentUser() user: IAuthenticatedUser) {
    return this.accountServiceService.getMyAccounts(user.userId);
  }

  @Get(':id')
  async getAccountById(
    @CurrentUser() user: IAuthenticatedUser,
    @Param('id') accountId: string,
  ) {
    return this.accountServiceService.getAccountById(user.userId, accountId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') accountId: string,
    @Body() dto: UpdateAccountStatusDto,
  ) {
    return this.accountServiceService.updateStatus(accountId, dto.status);
  }
}

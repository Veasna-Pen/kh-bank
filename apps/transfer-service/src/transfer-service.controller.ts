import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransferServiceService } from './transfer-service.service';
import {
  CreateTransferDto,
  TransferFilterQueryDto,
} from '@app/common/dto/transfer';
import { JwtAuthGuard } from '@app/auth';
import { CurrentUser } from '@app/common';
import type { IAuthenticatedUser } from '@app/common/interfaces/auth';

const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransferServiceController {
  constructor(
    private readonly transferServiceService: TransferServiceService,
  ) {}

  @Post()
  async createTransfer(
    @CurrentUser() user: IAuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateTransferDto,
  ) {
    const key = idempotencyKey?.trim();

    if (!key || key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      throw new BadRequestException(
        `Idempotency-Key header is required (max ${MAX_IDEMPOTENCY_KEY_LENGTH} characters)`,
      );
    }

    return this.transferServiceService.createTransfer(user.userId, key, dto);
  }

  @Get()
  async getTransfers(
    @CurrentUser() user: IAuthenticatedUser,
    @Query() query: TransferFilterQueryDto,
  ) {
    return this.transferServiceService.getTransfers(user.userId, query);
  }

  @Get(':id')
  async getTransferById(
    @CurrentUser() user: IAuthenticatedUser,
    @Param('id', ParseUUIDPipe) transferId: string,
  ) {
    return this.transferServiceService.getTransferById(user.userId, transferId);
  }
}

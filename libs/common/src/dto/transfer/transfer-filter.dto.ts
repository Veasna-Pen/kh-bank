import { TransferStatus } from '@app/common/enums';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../pagination';

export class TransferFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('all', { message: 'Account ID must be a valid UUID' })
  accountId?: string;

  @IsOptional()
  @IsEnum(TransferStatus, { message: 'Invalid transfer status' })
  status?: TransferStatus;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: string;
}

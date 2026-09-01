import { Currency } from '@app/common/enums';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class GetBalanceQueryDto {
  @IsNotEmpty({ message: 'Account ID is required' })
  @IsUUID('all', { message: 'Account ID must be a valid UUID' })
  accountId: string;

  @IsOptional()
  @IsEnum(Currency, { message: 'Currency must be USD or KHR' })
  currency?: Currency;
}

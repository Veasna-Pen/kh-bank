import { Currency } from '@app/common/enums';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class DepositDto {
  @IsNotEmpty({ message: 'Account ID is required' })
  @IsUUID('all', { message: 'Account ID must be a valid UUID' })
  accountId: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @Matches(/^(?!0(\.0+)?$)\d+(\.\d{1,4})?$/, {
    message:
      'Amount must be a positive number greater than zero with up to 4 decimal places',
  })
  amount: string;

  @IsNotEmpty({ message: 'Currency is required' })
  @IsEnum(Currency, { message: 'Currency must be USD or KHR' })
  currency: Currency;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}

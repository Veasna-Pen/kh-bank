import { Currency } from '@app/common/enums';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';


export class CreateTransferDto {
  @IsNotEmpty({ message: 'Source account ID is required' })
  @IsUUID('all', { message: 'Source account ID must be a valid UUID' })
  fromAccountId: string;

  @IsNotEmpty({ message: 'Destination account ID is required' })
  @IsUUID('all', { message: 'Destination account ID must be a valid UUID' })
  toAccountId: string;

  @IsNotEmpty({ message: 'Transfer amount is required' })
  @Matches(/^(?!0(\.0+)?$)\d+(\.\d{1,4})?$/, {
    message: 'Amount must be a positive number greater than zero with up to 4 decimal places',
  })
  amount: string;

  @IsNotEmpty({ message: 'Currency is required' })
  @IsEnum(Currency, { message: 'Currency must be USD or KHR' })
  currency: Currency;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Idempotency key must be a string' })
  idempotencyKey?: string;
}

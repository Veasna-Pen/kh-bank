import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Currency, LedgerTransactionType } from '@app/common/enums';
import { LedgerEntryDto } from './ledger-entry.dto';

export class CreateLedgerTransactionDto {
  @IsNotEmpty({ message: 'Reference is required' })
  @IsString({ message: 'Reference must be a string' })
  reference: string;

  @IsNotEmpty({ message: 'Transaction type is required' })
  @IsEnum(LedgerTransactionType, { message: 'Invalid ledger transaction type' })
  type: LedgerTransactionType;

  @IsNotEmpty({ message: 'Currency is required' })
  @IsEnum(Currency, { message: 'Currency must be USD or KHR' })
  currency: Currency;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsArray({ message: 'Entries must be an array' })
  @ArrayMinSize(2, {
    message:
      'Double-entry accounting requires at least 2 entries (debit and credit)',
  })
  @ValidateNested({ each: true })
  @Type(() => LedgerEntryDto)
  entries: LedgerEntryDto[];
}

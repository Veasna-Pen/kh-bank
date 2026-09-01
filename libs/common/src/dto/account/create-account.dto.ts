import { AccountType, Currency } from '@app/common/enums';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateAccountDto {
  @IsNotEmpty({ message: 'Customer ID is required' })
  @IsUUID('all', { message: 'Customer ID must be a valid UUID' })
  customerId: string;

  @IsNotEmpty({ message: 'Account type is required' })
  @IsEnum(AccountType, { message: 'Account type must be SAVINGS' })
  type: AccountType = AccountType.SAVINGS;

  @IsNotEmpty({ message: 'Currency is required' })
  @IsEnum(Currency, { message: 'Currency must be USD or KHR' })
  currency: Currency;
}

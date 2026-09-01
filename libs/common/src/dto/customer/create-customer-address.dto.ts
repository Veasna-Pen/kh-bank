import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCustomerAddressDto {
  @IsOptional()
  @IsUUID('all', { message: 'Customer ID must be a valid UUID' })
  customerId?: string;

  @IsNotEmpty({ message: 'Address line is required' })
  @IsString({ message: 'Address line must be a string' })
  addressLine: string;

  @IsNotEmpty({ message: 'City is required' })
  @IsString({ message: 'City must be a string' })
  city: string;

  @IsNotEmpty({ message: 'Province is required' })
  @IsString({ message: 'Province must be a string' })
  province: string;

  @IsNotEmpty({ message: 'Country is required' })
  @IsString({ message: 'Country must be a string' })
  country: string;

  @IsOptional()
  @IsString({ message: 'Postal code must be a string' })
  postalCode?: string;

  @IsOptional()
  @IsBoolean({ message: 'isPrimary must be a boolean' })
  isPrimary?: boolean;
}

import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerAddressDto {
  @IsOptional()
  @IsString({ message: 'Address line must be a string' })
  addressLine?: string;

  @IsOptional()
  @IsString({ message: 'City must be a string' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'Province must be a string' })
  province?: string;

  @IsOptional()
  @IsString({ message: 'Country must be a string' })
  country?: string;

  @IsOptional()
  @IsString({ message: 'Postal code must be a string' })
  postalCode?: string;

  @IsOptional()
  @IsBoolean({ message: 'isPrimary must be a boolean' })
  isPrimary?: boolean;
}

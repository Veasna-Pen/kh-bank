import { OtpPurpose } from '@app/common/enums';
import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString({ message: 'Phone number must be a string' })
  phone: string;

  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString({ message: 'OTP code must be a string' })
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  code: string;

  @IsNotEmpty({ message: 'Purpose is required' })
  @IsEnum(OtpPurpose, { message: 'Invalid OTP purpose' })
  purpose: OtpPurpose;
}

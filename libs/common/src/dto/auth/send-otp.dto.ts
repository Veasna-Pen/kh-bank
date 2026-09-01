import { OtpPurpose } from '@app/common/enums';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString({ message: 'Phone number must be a string' })
  phone: string;

  @IsNotEmpty({ message: 'Purpose is required' })
  @IsEnum(OtpPurpose, { message: 'Invalid OTP purpose' })
  purpose: OtpPurpose;
}

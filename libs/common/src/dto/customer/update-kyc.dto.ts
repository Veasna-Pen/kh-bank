import { KycStatus } from '@app/common/enums';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateKycStatusDto {
  @IsNotEmpty({ message: 'KYC status is required' })
  @IsEnum(KycStatus, { message: 'KYC status must be PENDING, VERIFIED, or REJECTED' })
  kycStatus: KycStatus;

  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;
}

import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string;

  @IsNotEmpty({ message: 'Device ID is required' })
  @IsString({ message: 'Device ID must be a string' })
  deviceId: string;
}

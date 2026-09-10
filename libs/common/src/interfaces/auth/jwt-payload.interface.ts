import { UserRole } from '@app/common/enums';

export interface IJwtPayload {
  sub: string;
  phone: string;
  deviceId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

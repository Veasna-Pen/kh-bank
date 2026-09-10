import { UserRole } from '@app/common/enums';

export interface IAuthenticatedUser {
  userId: string;
  phone: string;
  deviceId: string;
  role: UserRole;
}

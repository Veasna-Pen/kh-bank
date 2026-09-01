export interface IJwtPayload {
  sub: string;
  phone: string;
  deviceId: string;
  iat?: number;
  exp?: number;
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload, IAuthenticatedUser } from '@app/common/interfaces/auth';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_ACCESS_SECRET',
        'development_secret',
      ),
    });
  }

  validate(payload: IJwtPayload): IAuthenticatedUser {
    return {
      userId: payload.sub,
      phone: payload.phone,
      deviceId: payload.deviceId,
      role: payload.role,
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthDatabaseService } from '@app/database';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  SendOtpDto,
  VerifyOtpDto,
} from '@app/common/dto/auth';
import { OtpPurpose } from '@app/common/enums';
import { IJwtPayload } from '@app/common/interfaces/auth';
import { RedisService } from '@app/redis';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import {
  KAFKA_SERVICE,
  KAFKA_TOPICS,
  EVENT_SOURCES,
} from '@app/kafka/constants/kafka.constants';
import type { ClientKafka } from '@nestjs/microservices';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { otpCodes, refreshTokens, sessions, users } from '@app/database/auth';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthServiceService {
  constructor(
    private readonly authDB: AuthDatabaseService,
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateOpaqueToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private getRefreshTokenTtlMs(): number {
    const days = parseInt(
      process.env.REFRESH_TOKEN_TTL_DAYS ||
        process.env.JWT_REFRESH_EXPIRES_IN_DAYS ||
        '7',
      10,
    );
    return (isNaN(days) ? 7 : days) * 24 * 60 * 60 * 1000;
  }

  async sendOtp(dto: SendOtpDto) {
    const { phone, purpose } = dto;
    const cooldownKey = `otp:cooldown:${phone}:${purpose}`;
    const isCooldown = await this.redisService.has(cooldownKey);

    if (isCooldown) {
      throw new HttpException(
        'Please wait 60 seconds before requesting another OTP',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const [existingUser] = await this.authDB.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (purpose === OtpPurpose.REGISTRATION && existingUser) {
      throw new ConflictException('Phone number is already registered');
    }

    if (purpose !== OtpPurpose.REGISTRATION && !existingUser) {
      throw new UnauthorizedException(
        'User not found for the requested phone number',
      );
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const codeHash = this.hashToken(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.authDB.db.insert(otpCodes).values({
      id: crypto.randomUUID(),
      userId: existingUser ? existingUser.id : null,
      phone,
      codeHash,
      purpose,
      expiresAt,
      attempts: 0,
    });

    // Set 60s cooldown in Redis
    await this.redisService.set(cooldownKey, true, 60);

    // Reset attempt counter in Redis (5 minute TTL)
    const attemptsKey = `otp:attempts:${phone}:${purpose}`;
    await this.redisService.del(attemptsKey);

    console.log(`[OTP] Generated OTP for ${phone} (${purpose}): ${code}`);

    return {
      message: 'OTP sent successfully',
      otp: code,
      expiresIn: 300,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const { phone, code, purpose } = dto;
    const attemptsKey = `otp:attempts:${phone}:${purpose}`;
    const failedAttempts =
      (await this.redisService.get<number>(attemptsKey)) || 0;

    if (failedAttempts >= 5) {
      throw new HttpException(
        'Too many failed attempts. Please request a new OTP.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const [latestOtp] = await this.authDB.db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.purpose, purpose),
          isNull(otpCodes.verifiedAt),
          gt(otpCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!latestOtp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const codeHash = this.hashToken(code);
    if (latestOtp.codeHash !== codeHash) {
      const nextAttempts = failedAttempts + 1;
      await this.redisService.set(attemptsKey, nextAttempts, 300);

      await this.authDB.db
        .update(otpCodes)
        .set({ attempts: latestOtp.attempts + 1 })
        .where(eq(otpCodes.id, latestOtp.id));

      throw new UnauthorizedException('Invalid OTP code');
    }

    await this.authDB.db
      .update(otpCodes)
      .set({ verifiedAt: new Date() })
      .where(eq(otpCodes.id, latestOtp.id));

    await this.redisService.del(attemptsKey);

    if (purpose === OtpPurpose.REGISTRATION) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenKey = `otp:verification:${verificationToken}`;
      await this.redisService.set(tokenKey, { phone, purpose }, 600); // 10 minutes

      return {
        message: 'OTP verified successfully',
        verificationToken,
      };
    }

    return {
      message: 'OTP verified successfully',
    };
  }

  async register(dto: RegisterDto) {
    const { phone, password, verificationToken } = dto;

    const tokenKey = `otp:verification:${verificationToken}`;
    const cached = await this.redisService.get<{
      phone: string;
      purpose: OtpPurpose;
    }>(tokenKey);

    if (
      !cached ||
      cached.phone !== phone ||
      cached.purpose !== OtpPurpose.REGISTRATION
    ) {
      throw new BadRequestException(
        'Invalid or expired phone verification token',
      );
    }

    // Single-use token: consume immediately
    await this.redisService.del(tokenKey);

    const [existingUser] = await this.authDB.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (existingUser) {
      throw new ConflictException('Phone number is already registered');
    }

    const passwordHash = await argon2.hash(password);
    const userId = crypto.randomUUID();

    await this.authDB.db.insert(users).values({
      id: userId,
      phone,
      passwordHash,
      status: 'ACTIVE',
    });

    this.kafkaClient.emit(KAFKA_TOPICS.USER_REGISTERED, {
      eventId: crypto.randomUUID(),
      version: 1,
      occurredAt: new Date().toISOString(),
      source: EVENT_SOURCES.AUTH_SERVICE,
      data: {
        userId,
        phone,
        registeredAt: new Date().toISOString(),
      },
    });

    return {
      message: 'User registered successfully',
      user: {
        id: userId,
        phone,
        status: 'ACTIVE',
      },
    };
  }

  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const { phone, password, deviceId } = dto;

    const [user] = await this.authDB.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is blocked or suspended');
    }

    // Revoke any existing active refresh tokens for this user on the same device
    await this.authDB.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.userId, user.id),
          eq(refreshTokens.deviceId, deviceId),
          isNull(refreshTokens.revokedAt),
        ),
      );

    const rawRefreshToken = this.generateOpaqueToken();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());

    await this.authDB.db.insert(refreshTokens).values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      deviceId,
      expiresAt,
    });

    // Record session entry for auditability
    const ipAddress = (meta?.ipAddress || 'unknown').slice(0, 64);
    const userAgent = meta?.userAgent || 'unknown';

    await this.authDB.db.insert(sessions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      deviceId,
      ipAddress,
      userAgent,
      expiresAt,
    });

    const payload: IJwtPayload = {
      sub: user.id,
      phone: user.phone,
      deviceId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        status: user.status,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken: rawToken, deviceId } = dto;
    const tokenHash = this.hashToken(rawToken);

    const [existingToken] = await this.authDB.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.deviceId, deviceId),
        ),
      )
      .limit(1);

    if (!existingToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Reuse detection: if the token was already revoked, revoke all active tokens for this user/device
    if (existingToken.revokedAt) {
      await this.authDB.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, existingToken.userId),
            eq(refreshTokens.deviceId, deviceId),
            isNull(refreshTokens.revokedAt),
          ),
        );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (existingToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const [user] = await this.authDB.db
      .select()
      .from(users)
      .where(eq(users.id, existingToken.userId))
      .limit(1);

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    // Revoke current refresh token
    await this.authDB.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, existingToken.id));

    // Generate new refresh token
    const newRawRefreshToken = this.generateOpaqueToken();
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());

    await this.authDB.db.insert(refreshTokens).values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: newTokenHash,
      deviceId,
      expiresAt: newExpiresAt,
    });

    const payload: IJwtPayload = {
      sub: user.id,
      phone: user.phone,
      deviceId,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(dto: RefreshTokenDto) {
    const { refreshToken: rawToken, deviceId } = dto;
    const tokenHash = this.hashToken(rawToken);

    await this.authDB.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.deviceId, deviceId),
          isNull(refreshTokens.revokedAt),
        ),
      );

    return {
      message: 'Logged out successfully',
    };
  }
}

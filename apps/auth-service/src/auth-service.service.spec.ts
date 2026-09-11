import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose, UserRole, UserStatus } from '@app/common/enums';
import { AuthServiceService } from './auth-service.service';

describe('AuthServiceService.sendOtp', () => {
  const originalFlag = process.env.EXPOSE_OTP_IN_RESPONSE;
  const dto = { phone: '+85512345678', purpose: OtpPurpose.REGISTRATION };
  let service: AuthServiceService;

  beforeEach(() => {
    // No existing user for the phone; inserts succeed.
    const db = {
      select: () => ({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
      }),
      insert: () => ({ values: () => Promise.resolve() }),
    };
    const redis = {
      has: jest.fn().mockResolvedValue(false),
      set: jest.fn(),
      del: jest.fn(),
    };

    service = new AuthServiceService(
      { db } as never,
      {} as never,
      {} as never,
      redis as never,
    );
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.EXPOSE_OTP_IN_RESPONSE;
    } else {
      process.env.EXPOSE_OTP_IN_RESPONSE = originalFlag;
    }
  });

  it('does not return the OTP by default', async () => {
    delete process.env.EXPOSE_OTP_IN_RESPONSE;

    await expect(service.sendOtp(dto)).resolves.not.toHaveProperty('otp');
  });

  it('returns the OTP only when EXPOSE_OTP_IN_RESPONSE=true', async () => {
    process.env.EXPOSE_OTP_IN_RESPONSE = 'true';

    await expect(service.sendOtp(dto)).resolves.toHaveProperty(
      'otp',
      expect.stringMatching(/^\d{6}$/),
    );
  });
});

describe('AuthServiceService.register', () => {
  const dto = {
    phone: '+85512345678',
    password: 'secret1',
    verificationToken: 'token-1',
  };

  it('answers 409 when a concurrent registration took the phone first', async () => {
    // The pre-check finds no user, but the insert loses the unique constraint.
    const db = {
      select: () => ({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
      }),
      insert: () => ({
        values: () =>
          Promise.reject(
            Object.assign(new Error('duplicate key'), { code: '23505' }),
          ),
      }),
    };
    const cached = { phone: dto.phone, purpose: OtpPurpose.REGISTRATION };
    const redis = {
      get: jest.fn().mockResolvedValue(cached),
      del: jest.fn(),
    };
    const events = { publish: jest.fn() };
    const service = new AuthServiceService(
      { db } as never,
      events as never,
      {} as never,
      redis as never,
    );

    await expect(service.register(dto)).rejects.toThrow(ConflictException);
    expect(events.publish).not.toHaveBeenCalled();
  });
});

describe('AuthServiceService.refreshToken', () => {
  const dto = { refreshToken: 'raw-token', deviceId: 'device-1' };
  const user = {
    id: 'user-1',
    phone: '+85512345678',
    status: UserStatus.ACTIVE,
    role: UserRole.USER,
  };
  const activeToken = {
    id: 'token-1',
    userId: user.id,
    deviceId: dto.deviceId,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };

  // Records the writes in order. `rotationWins` decides whether the conditional
  // revoke still finds the token active or a concurrent request got there first.
  function createFakeDb(rotationWins: boolean) {
    const selects: unknown[][] = [[activeToken], [user]];
    const steps: string[] = [];
    const tx = {
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => {
              steps.push('revoke current token');
              return Promise.resolve(
                rotationWins ? [{ id: activeToken.id }] : [],
              );
            },
          }),
        }),
      }),
      insert: () => ({
        values: () => {
          steps.push('insert new token');
          return Promise.resolve();
        },
      }),
    };
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(selects.shift() ?? []),
          }),
        }),
      }),
      update: () => ({
        set: (values: Record<string, unknown>) => ({
          where: () => {
            steps.push(
              'lastActiveAt' in values
                ? 'touch session'
                : 'revoke device tokens',
            );
            return Promise.resolve();
          },
        }),
      }),
      transaction: (work: (t: typeof tx) => Promise<unknown>) => work(tx),
    };

    return { db, steps };
  }

  const serviceWith = (db: unknown) =>
    new AuthServiceService(
      { db } as never,
      {} as never,
      { signAsync: jest.fn().mockResolvedValue('access-token') } as never,
      {} as never,
    );

  it('rotates an active token', async () => {
    const fake = createFakeDb(true);

    const result = await serviceWith(fake.db).refreshToken(dto);

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).not.toBe(dto.refreshToken);
    expect(fake.steps).toEqual([
      'revoke current token',
      'insert new token',
      'touch session',
    ]);
  });

  it('treats losing a concurrent rotation as token reuse', async () => {
    const fake = createFakeDb(false);

    await expect(serviceWith(fake.db).refreshToken(dto)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(fake.steps).toEqual([
      'revoke current token',
      'revoke device tokens',
    ]);
  });
});

import { OtpPurpose } from '@app/common/enums';
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

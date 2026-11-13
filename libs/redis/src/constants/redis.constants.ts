export const REDIS_PREFIXES = {
  SESSION: 'session:',
  OTP: 'otp:',
  IDEMPOTENCY: 'idem:',
  RATE_LIMIT: 'rl:',
} as const;

export const REDIS_TTL = {
  SESSION_DEFAULT: 60 * 60 * 24 * 7, // 7 days
  OTP_DEFAULT: 60 * 5, // 5 minutes
  OTP_COOLDOWN: 60, // 60 seconds
  OTP_VERIFICATION: 60 * 10, // 10 minutes
  IDEMPOTENCY_DEFAULT: 60 * 60 * 24, // 24 hours
} as const;

export const REDIS_KEYS = {
  otpCooldown: (phone: string, purpose: string) =>
    `${REDIS_PREFIXES.OTP}cooldown:${phone}:${purpose}`,
  otpAttempts: (phone: string, purpose: string) =>
    `${REDIS_PREFIXES.OTP}attempts:${phone}:${purpose}`,
  otpVerification: (token: string) =>
    `${REDIS_PREFIXES.OTP}verification:${token}`,
} as const;

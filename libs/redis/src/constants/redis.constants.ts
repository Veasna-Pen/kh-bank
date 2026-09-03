export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const REDIS_PREFIXES = {
  SESSION: 'session:',
  OTP: 'otp:',
  IDEMPOTENCY: 'idem:',
  RATE_LIMIT: 'rl:',
} as const;

export const REDIS_TTL = {
  SESSION_DEFAULT: 60 * 60 * 24 * 7, // 7 days
  OTP_DEFAULT: 60 * 5, // 5 minutes
  IDEMPOTENCY_DEFAULT: 60 * 60 * 24, // 24 hours
} as const;

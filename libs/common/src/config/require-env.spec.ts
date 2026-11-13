import { requireEnv } from './require-env';

describe('requireEnv', () => {
  const validate = requireEnv('DATABASE_URL', 'JWT_ACCESS_SECRET');

  it('passes the config through when every key is set', () => {
    const config = {
      DATABASE_URL: 'postgres://localhost/db',
      JWT_ACCESS_SECRET: 's3cret',
    };

    expect(validate(config)).toBe(config);
  });

  it('names every key that is missing or empty', () => {
    expect(() => validate({ DATABASE_URL: '' })).toThrow(
      'Missing required environment variables: DATABASE_URL, JWT_ACCESS_SECRET',
    );
  });
});

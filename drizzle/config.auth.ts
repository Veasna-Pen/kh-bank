import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './libs/database/src/auth/schema.ts',
  out: './migrations/auth',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.AUTH_DATABASE_URL!,
  },
});

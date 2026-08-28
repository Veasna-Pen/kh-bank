import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './libs/database/src/account/schema.ts',
  out: './migrations/account',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.ACCOUNT_DATABASE_URL!,
  },
});

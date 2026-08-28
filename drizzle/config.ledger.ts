import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './libs/database/src/ledger/schema.ts',
  out: './migrations/ledger',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.LEDGER_DATABASE_URL!,
  },
});

import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './libs/database/src/transfer/schema.ts',
  out: './migrations/transfer',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.TRANSFER_DATABASE_URL!,
  },
});

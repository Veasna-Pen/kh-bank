import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './libs/database/src/customer/schema.ts',
  out: './migrations/customer',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.CUSTOMER_DATABASE_URL!,
  },
});

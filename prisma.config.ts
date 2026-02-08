// prisma.config.ts
import 'dotenv/config';               // loads .env file
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',     // or wherever your schema lives
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),         // type-safe env access (throws if missing)
  },
});
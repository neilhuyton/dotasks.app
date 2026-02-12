// prisma/global.d.ts

import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

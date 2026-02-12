// src/schemas.ts

import { z } from "zod";

export const verifyEmailSearchSchema = z.object({
  token: z.uuid().optional(),
});

export const confirmResetPasswordSearchSchema = z.object({
  token: z.uuid().optional(),
});

// __mocks__/server.ts

import { setupServer } from "msw/node";
import { authHandlers } from "./handlers/auth";
import { resetPasswordRequestHandler } from "./handlers/resetPasswordRequest";

export const server = setupServer(
  ...authHandlers,
  resetPasswordRequestHandler,
);

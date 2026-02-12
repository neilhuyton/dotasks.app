// __mocks__/trpcMsw.ts

import { createTRPCMsw, httpLink } from "msw-trpc";
import type { AppRouter } from "../server/trpc";

export const trpcMsw = createTRPCMsw<AppRouter>({
  links: [httpLink({ url: "/trpc" })],
});

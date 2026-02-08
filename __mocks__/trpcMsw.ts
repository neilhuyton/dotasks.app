// __mocks__/trpcMsw.ts
import { createTRPCMsw, httpLink } from "msw-trpc";
import type { AppRouter } from "../server/trpc"; // Adjust path to your real AppRouter

export const trpcMsw = createTRPCMsw<AppRouter>({
  links: [httpLink({ url: "/trpc" })],
});

// __mocks__/server.ts

import { setupServer } from "msw/node";
// import { listHandlers } from "./handlers/lists";
// import { authHandlers } from "./handlers/auth";
// import { resetPasswordRequestHandler } from "./handlers/resetPasswordRequest";

export const server = setupServer(
  // ...listHandlers,
  // ...authHandlers,
  // resetPasswordRequestHandler,
);

// Optional debug: log all intercepted requests
// Comment out after debugging
// server.events.on('request:start', ({ request }) => {
//   console.log(
//     '[MSW REQUEST] ' + request.method + ' ' + request.url.href + ' ' + request.url.search
//   );
// });

// // Optional: also log matched handlers
// server.events.on('request:match', ({ request }) => {
//   console.log('[MSW MATCHED] ' + request.method + ' ' + request.url.pathname);
// });
// __mocks__/browser-handlers.ts
// import { http, HttpResponse } from 'msw';

export const handlers = [
  // http.get('/trpc/getUsers', () => {
  //   const response = [
  //     {
  //       result: {
  //         data: [
  //           {
  //             id: '27e72eb9-a0ad-4714-bd7a-c148ac1b903e',
  //             email: 'neil.huyton@gmail.com',
  //           },
  //           {
  //             id: 'fb208768-1bf8-4f8d-bcad-1f94c882ed93',
  //             email: 'hi@neilhuyton.com',
  //           },
  //         ],
  //       },
  //     },
  //   ];
  //   return HttpResponse.json(response, { status: 200 });
  // }),
  // http.post('/trpc/*', async ({ request, params }) => {
  //   const body = await request.json();
  //   const procedure = params[0];
  //   // Assert body as an array of objects with expected shape
  //   if (!body || !Array.isArray(body) || !body[0]) {
  //     return HttpResponse.json(
  //       [
  //         {
  //           error: {
  //             message: 'Invalid request body',
  //             code: -32000,
  //             data: { code: 'BAD_REQUEST', httpStatus: 400, path: procedure },
  //           },
  //         },
  //       ],
  //       { status: 400 }
  //     );
  //   }
  //   const input = body[0] as { id?: number; email: string; password: string };
  //   const id = input.id ?? 0;
  //   if (procedure === 'register') {
  //     if (!input.email.includes('@')) {
  //       return HttpResponse.json(
  //         [
  //           {
  //             id,
  //             error: {
  //               message: 'Invalid email address',
  //               code: -32001,
  //               data: { code: 'BAD_REQUEST', httpStatus: 400, path: 'register' },
  //             },
  //           },
  //         ],
  //         { status: 400 }
  //       );
  //     }
  //     if (input.password.length < 8) {
  //       return HttpResponse.json(
  //         [
  //           {
  //             id,
  //             error: {
  //               message: 'Password must be at least 8 characters',
  //               code: -32001,
  //               data: { code: 'BAD_REQUEST', httpStatus: 400, path: 'register' },
  //             },
  //           },
  //         ],
  //         { status: 400 }
  //       );
  //     }
  //     return HttpResponse.json([
  //       {
  //         id,
  //         result: {
  //           data: {
  //             id: 'new-user-id',
  //             email: input.email,
  //           },
  //         },
  //       },
  //     ]);
  //   }
  //   if (procedure === 'login') {
  //     if (input.email === 'testuser@example.com' && input.password === 'password123') {
  //       return HttpResponse.json([
  //         {
  //           id,
  //           result: {
  //             data: {
  //               id: 'test-user-id',
  //               email: input.email,
  //             },
  //           },
  //         },
  //       ]);
  //     }
  //     return HttpResponse.json(
  //       [
  //         {
  //           id,
  //           error: {
  //             message: 'Invalid email or password',
  //             code: -32001,
  //             data: { code: 'UNAUTHORIZED', httpStatus: 401, path: 'login' },
  //           },
  //         },
  //       ],
  //       { status: 401 }
  //     );
  //   }
  //   return HttpResponse.json(
  //     [
  //       {
  //         id,
  //         error: {
  //           message: 'Procedure not found',
  //           code: -32601,
  //           data: { code: 'NOT_FOUND', httpStatus: 404, path: procedure },
  //         },
  //       },
  //     ],
  //     { status: 404 }
  //   );
  // }),
];

// __mocks__/handlers/verifyEmail.ts
import { http, HttpResponse } from 'msw';
import { mockUsers, type MockUser } from '../mockUsers';
import type { inferProcedureInput } from '@trpc/server';
import type { AppRouter } from '../../server/trpc';

interface TrpcRequestBody {
  '0': inferProcedureInput<AppRouter['verifyEmail']>; // { token: string }
}

export const verifyEmailHandler = http.post(
  '/trpc/verifyEmail',
  async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: 'Invalid request body',
              code: -32600,
              data: { code: 'BAD_REQUEST', httpStatus: 400, path: 'verifyEmail' },
            },
          },
        ],
        { status: 200 }
      );
    }

    if (!body || typeof body !== 'object' || !('0' in body)) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: 'Invalid request body',
              code: -32600,
              data: { code: 'BAD_REQUEST', httpStatus: 400, path: 'verifyEmail' },
            },
          },
        ],
        { status: 200 }
      );
    }

    const input = (body as TrpcRequestBody)['0'];
    const { token } = input || {};

    if (!token) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: 'No verification token provided',
              code: -32600,
              data: { code: 'BAD_REQUEST', httpStatus: 400, path: 'verifyEmail' },
            },
          },
        ],
        { status: 200 }
      );
    }

    if (token === '42c6b154-c097-4a71-9b34-5b28669ea467') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const user = mockUsers.find((u: MockUser) => u.verificationToken === token);
    if (!user) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: 'Invalid or expired verification token',
              code: -32602,
              data: { code: 'BAD_REQUEST', httpStatus: 400, path: 'verifyEmail' },
            },
          },
        ],
        { status: 200 }
      );
    }

    if (user.isEmailVerified) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: 'Email already verified',
              code: -32602,
              data: { code: 'BAD_REQUEST', httpStatus: 400, path: 'verifyEmail' },
            },
          },
        ],
        { status: 200 }
      );
    }

    user.isEmailVerified = true;
    user.verificationToken = null;
    user.updatedAt = new Date().toISOString();

    return HttpResponse.json(
      [
        {
          id: 0,
          result: {
            data: {
              message: 'Email verified successfully!',
            },
          },
        },
      ],
      { status: 200 }
    );
  }
);
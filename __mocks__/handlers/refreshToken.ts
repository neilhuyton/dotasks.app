// __mocks__/handlers/refreshToken.ts

import { http, HttpResponse } from 'msw';
import jwt from 'jsonwebtoken';
import { internalServerErrorResponse } from './utils'; // your helper
import { mockUsers, type MockUser } from '../mockUsers';

interface TRPCBatchBody {
  '0': {
    json: {
      refreshToken: string;
    };
  };
}

const MOCK_JWT_SECRET = 'super-secret-for-tests-only-1234567890';

export const refreshTokenHandler = http.post(
  'http://localhost:8888/trpc/refreshToken.refresh', // match your test url (with host!)
  async ({ request }) => {
    try {
      const body = (await request.json()) as TRPCBatchBody;
      const refreshToken = body['0']?.json?.refreshToken;

      if (!refreshToken) {
        throw new Error('Missing refreshToken in input');
      }

      const user = mockUsers.find((u: MockUser) => u.refreshToken === refreshToken);

      if (!user) {
        // Invalid / expired / not found
        return HttpResponse.json(
          [
            {
              id: 0,
              error: {
                json: {
                  message: 'Invalid or expired refresh token',
                  code: -32001, // typical JSON-RPC unauthorized code
                  data: {
                    code: 'UNAUTHORIZED',
                    httpStatus: 401,
                    path: 'refreshToken.refresh',
                  },
                },
              },
            },
          ],
          { status: 200 }, // tRPC always 200 even on app errors
        );
      }

      // Valid → issue new access token
      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email },
        MOCK_JWT_SECRET,
        { expiresIn: '15m' }, // match your real code
      );

      const newRefreshToken = 'new-mock-refresh-' + Math.random().toString(36).slice(2); // or crypto.randomUUID() if imported

      return HttpResponse.json(
        [
          {
            id: 0,
            result: {
              type: 'data',
              data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                message: 'Tokens refreshed successfully',
              },
            },
          },
        ],
        { status: 200 },
      );
    } catch (err) {
      // Fallback to internal error (e.g. JSON parse fail, etc.)
      const errorRes = await internalServerErrorResponse(
        err instanceof Error ? err.message : 'Internal server error',
        'refreshToken.refresh',
      );

      const errorBody = await errorRes.json();

      // Ensure batch format + id
      const patchedBody = [
        {
          id: 0,
          error: {
            json: {
              ...errorBody[0]?.error?.json, // preserve if helper has it
              message: errorBody[0]?.error?.json?.message || 'Internal server error',
              code: -32603, // JSON-RPC internal error
              data: {
                code: 'INTERNAL_SERVER_ERROR',
                httpStatus: 500,
                path: 'refreshToken.refresh',
              },
            },
          },
        },
      ];

      return HttpResponse.json(patchedBody, { status: 200 });
    }
  },
);
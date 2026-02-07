// __mocks__/handlers/weightGetGoals.ts
import { http, HttpResponse } from 'msw';

interface TRPCRequestBody {
  id: number;
  path?: string;
  method?: string;
}

export const weightGetGoalsHandler = http.post(
  'http://localhost:8888/.netlify/functions/trpc/weight.getGoals',
  async ({ request, params }) => {
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: 'Invalid request body',
              code: -32000,
              data: { code: 'BAD_REQUEST', httpStatus: 400, path: params.path ?? 'weight.getGoals' },
            },
          },
        ],
        { status: 200 }
      );
    }

    const procedurePath = Array.isArray(requestBody)
      ? (requestBody[0] as TRPCRequestBody)?.path
      : (requestBody as TRPCRequestBody)?.path;

    if (procedurePath !== 'weight.getGoals') {
      return; // Pass to next handler
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: 'Unauthorized',
              code: -32001,
              data: {
                code: 'UNAUTHORIZED',
                httpStatus: 401,
                path: params.path ?? 'weight.getGoals',
              },
            },
          },
        ],
        { status: 200 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId;
    } catch {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: 'Invalid token',
              code: -32001,
              data: {
                code: 'UNAUTHORIZED',
                httpStatus: 401,
                path: params.path ?? 'weight.getGoals',
              },
            },
          },
        ],
        { status: 200 }
      );
    }

    if (userId === 'test-user-id') {
      return HttpResponse.json(
        [
          {
            id: 0,
            result: {
              type: 'data',
              data: [
                {
                  id: '1',
                  goalWeightKg: 65.0,
                  goalSetAt: '2025-08-28T00:00:00Z',
                  reachedAt: null,
                },
                {
                  id: '2',
                  goalWeightKg: 70.0,
                  goalSetAt: '2025-08-27T00:00:00Z',
                  reachedAt: '2025-08-27T12:00:00Z',
                },
              ],
            },
          },
        ],
        { status: 200 }
      );
    }

    if (userId === 'empty-user-id') {
      return HttpResponse.json(
        [{ id: 0, result: { type: 'data', data: [] } }],
        { status: 200 }
      );
    }

    if (userId === 'error-user-id') {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: 'Failed to fetch goals',
              code: -32002,
              data: {
                code: 'INTERNAL_SERVER_ERROR',
                httpStatus: 500,
                path: params.path?.includes('weight.getGoals') ? 'weight.getGoals' : 'unknown',
              },
            },
          },
        ],
        { status: 200 }
      );
    }

    if (userId === 'invalid-user-id') {
      return HttpResponse.json(
        [
          {
            id: 0,
            error: {
              message: 'Invalid token',
              code: -32001,
              data: {
                code: 'UNAUTHORIZED',
                httpStatus: 401,
                path: params.path ?? 'weight.getGoals',
              },
            },
          },
        ],
        { status: 200 }
      );
    }

    return HttpResponse.json(
      [
        {
          id: 0,
          error: {
            message: 'Unauthorized',
            code: -32001,
            data: {
              code: 'UNAUTHORIZED',
              httpStatus: 401,
              path: params.path ?? 'weight.getGoals',
            },
          },
        },
      ],
      { status: 200 }
    );
  }
);
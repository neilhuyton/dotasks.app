// __mocks__/handlers/resetPasswordRequest.ts

import { http, HttpResponse } from 'msw';

export const resetPasswordRequestHandler = http.post(
  '/trpc/resetPassword.request',
  async ({ request }) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return HttpResponse.json(
        { message: 'Invalid JSON request' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object' || body === null) {
      return HttpResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const input = body as { email?: unknown };
    const email = input.email;

    if (typeof email !== 'string' || email.trim() === '') {
      return HttpResponse.json(
        { message: 'Invalid email' },
        { status: 400 }
      );
    }

    // ← This is the important change
    return HttpResponse.json(
      {
        result: {
          data: {
            message: 'If the email exists, a reset link has been sent.'
          }
        }
      },
      { status: 200 }
    );
  }
);
// netlify/functions/trpc.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { IncomingMessage } from 'http';
import { appRouter } from '../../server/trpc';
import { createContext } from '../../server/context';
import { TRPCError } from '@trpc/server';
import { getHTTPStatusCodeFromError } from '@trpc/server/http';

const ALLOWED_ORIGIN = process.env.VITE_APP_URL || 'http://localhost:5173';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // If your local/dev setup still sees /.netlify/functions/trpc prefix (uncommon now, but safe to keep)
  // Remove or comment out if requests arrive at /trpc directly
  const pathname = url.pathname.replace(/^\/.netlify\/functions\/trpc/, '/trpc');

  const origin = req.headers.get('origin');
  const isAllowed = origin && (origin.includes('localhost') || origin === ALLOWED_ORIGIN);
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': isAllowed ? origin! : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Safe adapter: shape-match only what's likely used (headers most common)
  // Extend { method: req.method, url: req.url, ... } if your createContext reads them
  const adaptedReq = {
    headers: Object.fromEntries(req.headers) as IncomingMessage['headers'],
  } as IncomingMessage;

  try {
    const response = await fetchRequestHandler({
      endpoint: '/trpc',
      req,
      router: appRouter,
      createContext: () => createContext({ req: adaptedReq }),
      batching: { enabled: true },
      allowMethodOverride: true,
    });

    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (cause) {
    const error = cause instanceof TRPCError
      ? cause
      : new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          cause,
        });

    const statusCode = getHTTPStatusCodeFromError(error);

    const body = JSON.stringify([{
      error: {
        message: error.message,
        code: error.code,
        data: {
          code: error.code,
          httpStatus: statusCode,
          stack: error.stack,
          path: pathname.split('/trpc/')[1]?.split('?')[0] || '',
        },
      },
    }]);

    const errorHeaders = new Headers({
      'content-type': 'application/json',
      ...corsHeaders,
    });

    return new Response(body, { status: statusCode, headers: errorHeaders });
  }
}
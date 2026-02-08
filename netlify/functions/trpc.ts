// netlify/functions/trpc.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { HandlerEvent, HandlerResponse } from '@netlify/functions';
import { appRouter } from '../../server/trpc';
import { createContext } from '../../server/context';
import type { IncomingMessage } from 'http';
import { TRPCError } from '@trpc/server';
import { getHTTPStatusCodeFromError } from '@trpc/server/http';

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const queryString = event.queryStringParameters
    ? new URLSearchParams(event.queryStringParameters as Record<string, string>).toString()
    : '';
  const path = event.path.replace('/.netlify/functions/trpc', '/trpc');
  const url = `https://${event.headers.host || 'localhost:8888'}${path}${queryString ? `?${queryString}` : ''}`;

  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).filter(([, value]) => value !== undefined)
  ) as Record<string, string>;

  const isLocalhost = headers['origin']?.includes('localhost');
  const allowedOrigin = isLocalhost
    ? headers['origin']
    : process.env.VITE_APP_URL || 'http://localhost:5173';

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': allowedOrigin || 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    const request = new Request(url, {
      method: event.httpMethod,
      headers,
      body: event.httpMethod !== 'GET' && event.body ? event.body : undefined,
    });

    const response = await fetchRequestHandler({
      endpoint: '/trpc',
      req: request,
      router: appRouter,
      createContext: () => createContext({ req: { headers } as IncomingMessage }),
      batching: {
        enabled: true,
      },
      allowMethodOverride: true,
      responseMeta: () => ({
        headers: corsHeaders,
        status: 200,
      }),
    });

    const responseBody = await response.text();

    return {
      statusCode: response.status,
      headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
      body: responseBody,
    };
  } catch (error: unknown) {
    const trpcError = error instanceof TRPCError ? error : new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      cause: error,
    });
    const statusCode = getHTTPStatusCodeFromError(trpcError);
    return {
      statusCode,
      headers: { 'content-type': 'application/json', ...corsHeaders },
      body: JSON.stringify([{
        error: {
          message: trpcError.message,
          code: trpcError.code,
          data: {
            code: trpcError.code,
            httpStatus: statusCode,
            stack: trpcError.stack,
            path: path.split('/trpc/')[1]?.split('?')[0],
          },
        },
      }]),
    };
  }
};
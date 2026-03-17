import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/trpc";
import { createContext } from "../../server/context";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

const ALLOWED_ORIGIN = process.env.VITE_APP_URL || "http://localhost:8888";

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const isAllowed =
    origin && (origin.includes("localhost") || origin === ALLOWED_ORIGIN);
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": isAllowed ? origin! : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const response = await fetchRequestHandler({
      endpoint: "/trpc",
      req,
      router: appRouter,
      createContext: ({ req }) => createContext({ req }),
      batching: { enabled: true },
      allowMethodOverride: true,
    });

    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) =>
      headers.set(key, value),
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (cause) {
    const error =
      cause instanceof TRPCError
        ? cause
        : new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unexpected error",
            cause,
          });

    const statusCode = getHTTPStatusCodeFromError(error);

    const body = JSON.stringify([
      {
        error: {
          message: error.message,
          code: error.code,
          data: {
            code: error.code,
            httpStatus: statusCode,
            stack: error.stack,
            path:
              new URL(req.url).pathname.split("/trpc/")[1]?.split("?")[0] || "",
          },
        },
      },
    ]);

    const errorHeaders = new Headers({
      "content-type": "application/json",
      ...corsHeaders,
    });

    return new Response(body, { status: statusCode, headers: errorHeaders });
  }
}

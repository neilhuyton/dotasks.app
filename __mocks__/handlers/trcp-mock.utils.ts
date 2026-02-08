import { HttpResponse } from "msw";
import jwt from "jsonwebtoken";

export function unauthorizedResponse(path = "unknown") {
  return HttpResponse.json(
    [
      {
        id: 0,
        error: {
          message: "Unauthorized: User must be logged in",
          code: -32001,
          data: {
            code: "UNAUTHORIZED",
            httpStatus: 401,
            path,
          },
        },
      },
    ],
    { status: 401 },
  );
}

export function invalidTokenResponse(id = 0, path = "unknown") {
  return HttpResponse.json(
    [
      {
        id,
        error: {
          message: "Invalid token",
          code: -32001,
          data: {
            code: "UNAUTHORIZED",
            httpStatus: 401,
            path,
          },
        },
      },
    ],
    { status: 401 },
  );
}

export function invalidJsonResponse(id = 0, path = "unknown") {
  return HttpResponse.json(
    [
      {
        id,
        error: {
          message: "Invalid request body",
          code: -32600,
          data: {
            code: "BAD_REQUEST",
            httpStatus: 400,
            path,
          },
        },
      },
    ],
    { status: 400 },
  );
}

export function badRequestResponse(message, id = 0, path = "unknown") {
  return HttpResponse.json(
    [
      {
        id,
        error: {
          message,
          code: -32001,
          data: {
            code: "BAD_REQUEST",
            httpStatus: 400,
            path,
          },
        },
      },
    ],
    { status: 400 },
  );
}

export async function getRequestIdAndInput(request, path) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { error: invalidJsonResponse(0, path) };
  }

  let id = 0;
  let input;

  if (Array.isArray(body)) {
    id = body[0]?.id ?? 0;
    input = body[0]?.input;
  } else if (body && typeof body === "object") {
    if ("input" in body) {
      id = body.id ?? 0;
      input = body.input;
    } else if ("0" in body) {
      id = body["0"]?.id ?? 0;
      input = body["0"]?.input;
    }
  }

  return { id, input };
}

export function checkAuth(request, path, id = 0) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorizedResponse(id, path);
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    return null;
  } catch {
    return invalidTokenResponse(id, path);
  }
}

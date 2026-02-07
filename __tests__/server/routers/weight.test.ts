import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../__mocks__/server";
import { setupMSW } from "../../../__tests__/setupTests";

describe("weight procedures (MSW contract)", () => {
  setupMSW();

  const BASE_URL = "http://localhost:8888/.netlify/functions/trpc";
  const AUTH_HEADER = { Authorization: "Bearer test-user-id" };
  const JSON_HEADER = { "content-type": "application/json" };

  const batchSuccess = (data: unknown) =>
    HttpResponse.json([{ id: 0, result: { data } }]);

  const batchError = (message: string, code: string, status: number) =>
    HttpResponse.json(
      [
        {
          id: 0,
          error: {
            message,
            code: -32001,
            data: { code, httpStatus: status, path: "weight.<procedure>" },
          },
        },
      ],
      { status },
    );

  const post = (path: string, body: unknown = undefined, extraHeaders = {}) =>
    fetch(`${BASE_URL}/${path}`, {
      method: "POST",
      headers: { ...JSON_HEADER, ...extraHeaders },
      body: body ? JSON.stringify([{ id: 0, json: body }]) : undefined,
    });

  const get = (path: string, extraHeaders = {}) =>
    fetch(`${BASE_URL}/${path}`, {
      method: "GET",
      headers: { ...JSON_HEADER, ...extraHeaders },
    });

  describe("weight.create", () => {
    it("creates successfully", async () => {
      server.use(
        http.post(`${BASE_URL}/weight.create`, () =>
          batchSuccess({
            id: "weight-id-123",
            weightKg: 70.5,
            createdAt: "2025-08-23T12:00:00Z",
          }),
        ),
      );

      const res = await post(
        "weight.create",
        { weightKg: 70.5, note: "Morning weigh-in" },
        AUTH_HEADER,
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json[0].result.data).toEqual({
        id: "weight-id-123",
        weightKg: 70.5,
        createdAt: "2025-08-23T12:00:00Z",
      });
    });

    it("rejects unauthenticated", async () => {
      server.use(
        http.post(`${BASE_URL}/weight.create`, () =>
          batchError("Unauthorized: User must be logged in", "UNAUTHORIZED", 401),
        ),
      );

      const res = await post("weight.create", {
        weightKg: 70.5,
        note: "Morning weigh-in",
      });
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json[0].error.message).toBe("Unauthorized: User must be logged in");
    });

    it("rejects negative weight", async () => {
      server.use(
        http.post(`${BASE_URL}/weight.create`, () =>
          batchError("Weight must be a positive number", "BAD_REQUEST", 400),
        ),
      );

      const res = await post(
        "weight.create",
        { weightKg: -70.5, note: "Morning weigh-in" },
        AUTH_HEADER,
      );
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json[0].error.message).toBe("Weight must be a positive number");
    });
  });

  describe("weight.getWeights", () => {
    const mockData = [
      { id: "1", weightKg: 70.5, note: "Morning weigh-in", createdAt: "2025-08-20T10:00:00Z" },
      { id: "2", weightKg: 71.0, note: "Evening weigh-in", createdAt: "2025-08-19T18:00:00Z" },
    ];

    it("returns list", async () => {
      server.use(http.get(`${BASE_URL}/weight.getWeights`, () => batchSuccess(mockData)));

      const res = await get("weight.getWeights", AUTH_HEADER);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json[0].result.data).toEqual(mockData);
    });

    it("rejects unauthenticated", async () => {
      server.use(
        http.get(`${BASE_URL}/weight.getWeights`, () =>
          batchError("Unauthorized: User must be logged in", "UNAUTHORIZED", 401),
        ),
      );

      const res = await get("weight.getWeights");
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json[0].error.message).toBe("Unauthorized: User must be logged in");
    });
  });

  describe("weight.delete", () => {
    it("deletes successfully", async () => {
      server.use(http.post(`${BASE_URL}/weight.delete`, () => batchSuccess({ id: "weight-id-123" })));

      const res = await post("weight.delete", { weightId: "weight-id-123" }, AUTH_HEADER);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json[0].result.data).toEqual({ id: "weight-id-123" });
    });

    it("returns 404 when not found", async () => {
      server.use(
        http.post(`${BASE_URL}/weight.delete`, () =>
          batchError("Weight measurement not found", "NOT_FOUND", 404),
        ),
      );

      const res = await post("weight.delete", { weightId: "non-existent-id" }, AUTH_HEADER);
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json[0].error.message).toBe("Weight measurement not found");
    });

    it("rejects unauthenticated", async () => {
      server.use(
        http.post(`${BASE_URL}/weight.delete`, () =>
          batchError("Unauthorized: User must be logged in", "UNAUTHORIZED", 401),
        ),
      );

      const res = await post("weight.delete", { weightId: "weight-id-123" });
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json[0].error.message).toBe("Unauthorized: User must be logged in");
    });

    it("rejects deleting another user's record", async () => {
      server.use(
        http.post(`${BASE_URL}/weight.delete`, () =>
          batchError(
            "Unauthorized: Cannot delete another user's weight measurement",
            "UNAUTHORIZED",
            401,
          ),
        ),
      );

      const res = await post("weight.delete", { weightId: "other-user-weight-id" }, AUTH_HEADER);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json[0].error.message).toBe(
        "Unauthorized: Cannot delete another user's weight measurement",
      );
    });
  });

  describe("weight.setGoal", () => {
    it("sets goal successfully", async () => {
      server.use(http.post(`${BASE_URL}/weight.setGoal`, () => batchSuccess({ goalWeightKg: 65.0 })));

      const res = await post("weight.setGoal", { goalWeightKg: 65.0 }, AUTH_HEADER);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json[0].result.data).toEqual({ goalWeightKg: 65.0 });
    });

    it("rejects unauthenticated", async () => {
      server.use(
        http.post(`${BASE_URL}/weight.setGoal`, () =>
          batchError("Unauthorized: User must be logged in", "UNAUTHORIZED", 401),
        ),
      );

      const res = await post("weight.setGoal", { goalWeightKg: 65.0 });
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json[0].error.message).toBe("Unauthorized: User must be logged in");
    });

    it("rejects negative goal", async () => {
      server.use(
        http.post(`${BASE_URL}/weight.setGoal`, () =>
          batchError("Goal weight must be a positive number", "BAD_REQUEST", 400),
        ),
      );

      const res = await post("weight.setGoal", { goalWeightKg: -65.0 }, AUTH_HEADER);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json[0].error.message).toBe("Goal weight must be a positive number");
    });
  });

  describe("weight.getGoal", () => {
    it("returns existing goal", async () => {
      server.use(http.get(`${BASE_URL}/weight.getGoal`, () => batchSuccess({ goalWeightKg: 65.0 })));

      const res = await get("weight.getGoal", AUTH_HEADER);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json[0].result.data).toEqual({ goalWeightKg: 65.0 });
    });

    it("returns null when no goal", async () => {
      server.use(http.get(`${BASE_URL}/weight.getGoal`, () => batchSuccess(null)));

      const res = await get("weight.getGoal", AUTH_HEADER);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json[0].result.data).toBeNull();
    });

    it("rejects unauthenticated", async () => {
      server.use(
        http.get(`${BASE_URL}/weight.getGoal`, () =>
          batchError("Unauthorized: User must be logged in", "UNAUTHORIZED", 401),
        ),
      );

      const res = await get("weight.getGoal");
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json[0].error.message).toBe("Unauthorized: User must be logged in");
    });
  });
});
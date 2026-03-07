// e2e/login.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Login Functionality", () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === "failed" || testInfo.status === "timedOut") {
      await page.screenshot({
        path: `test-results/failure-screenshot-${testInfo.title.replace(/\s+/g, "-")}-${Date.now()}.png`,
      });
    }
  });

  test.beforeEach(async () => {});

  test("should log in successfully with valid credentials", async ({
    page,
  }) => {
    await page.route("/trpc/login**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true",
          },
          body: JSON.stringify({
            result: {
              data: {
                id: "test-user-id",
                email: "testuser@example.com",
                token:
                  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMSIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc1NjcyNTIwMCwiZXhwIjoxNzU5MzE3MjAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
                refreshToken: "mock-refresh-token",
              },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

    await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("m@example.com")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByPlaceholder("Enter your password")).toBeVisible({
      timeout: 5000,
    });

    await page.getByPlaceholder("m@example.com").fill("testuser@example.com");
    await page.getByPlaceholder("Enter your password").fill("password123");

    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.request().method() === "POST" &&
          resp.url().includes("trpc/login") &&
          resp.status() === 200,
        { timeout: 10000 },
      ),
      page.waitForURL("**/", { timeout: 20000 }),
      page.getByTestId("login-button").click(),
    ]);

    await expect(page.getByTestId("login-form")).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("should display error message with invalid credentials", async ({
    page,
  }) => {
    await page.route("/trpc/login**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          headers: {
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true",
          },
          body: JSON.stringify({
            error: {
              message: "Invalid email or password",
              code: -32001,
              data: { code: "UNAUTHORIZED", httpStatus: 401, path: "login" },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

    await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("m@example.com")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByPlaceholder("Enter your password")).toBeVisible({
      timeout: 5000,
    });

    await page.getByPlaceholder("m@example.com").fill("wronguser@example.com");
    await page.getByPlaceholder("Enter your password").fill("wrongpassword");

    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.request().method() === "POST" &&
          resp.url().includes("trpc/login") &&
          resp.status() === 401,
        { timeout: 10000 },
      ),
      page.getByTestId("login-button").click(),
    ]);

    await expect(page.getByTestId("login-message")).toHaveText(
      "Login failed: Invalid email or password",
      {
        timeout: 5000,
      },
    );

    await expect(page.getByTestId("login-form")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("link", { name: "Measurements" }),
    ).not.toBeVisible({ timeout: 10000 });
  });

  test("should display validation errors for invalid inputs", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

    await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("m@example.com")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByPlaceholder("Enter your password")).toBeVisible({
      timeout: 5000,
    });

    await page.getByPlaceholder("m@example.com").fill("invalid-email");
    await page.getByPlaceholder("Enter your password").fill("short");

    await page.getByTestId("login-button").click();

    await expect(
      page.getByText("Please enter a valid email address"),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText("Password must be at least 8 characters long"),
    ).toBeVisible({
      timeout: 5000,
    });

    const response = await page
      .waitForResponse(
        (resp) =>
          resp.request().method() === "POST" &&
          resp.url().includes("trpc/login"),
        { timeout: 2000 },
      )
      .catch(() => null);
    expect(response).toBeNull();

    await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("link", { name: "Measurements" }),
    ).not.toBeVisible({ timeout: 5000 });
  });

  test("should navigate form elements in correct tab order", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

    await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("m@example.com")).toBeVisible({
      timeout: 5000,
    });

    await page.getByPlaceholder("m@example.com").focus();
    await expect(page.getByPlaceholder("m@example.com")).toBeFocused({
      timeout: 5000,
    });

    await page.keyboard.press("Tab");
    await expect(page.getByPlaceholder("Enter your password")).toBeFocused({
      timeout: 5000,
    });

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("forgot-password-link")).toBeFocused({
      timeout: 5000,
    });

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("signup-link")).toBeFocused({
      timeout: 5000,
    });

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("login-button")).toBeFocused({
      timeout: 5000,
    });
  });
});

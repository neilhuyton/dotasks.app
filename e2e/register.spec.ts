// e2e/register.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Register Functionality', () => {
  test('should register successfully with valid credentials', async ({ page }) => {
    await page.route('**/trpc/register**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 0,
              result: {
                data: {
                  id: 'new-user-id',
                  email: 'newuser@example.com',
                  message:
                    'Registration successful! Please check your email to verify your account.!',
                },
              },
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('signup-link')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('signup-link').click();

    await expect(page.getByTestId('register-form')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('m@example.com')).toBeVisible({ timeout: 5000 });

    const emailInput = page.getByPlaceholder('m@example.com');
    const passwordInput = page.getByPlaceholder('Enter your password');

    await emailInput.fill('newuser@example.com');
    await expect(emailInput).toHaveValue('newuser@example.com');

    await passwordInput.fill('password123');
    await expect(passwordInput).toHaveValue('password123');

    const registerButton = page.getByRole('button', { name: 'Register' });
    await expect(registerButton).toBeEnabled({ timeout: 5000 });

    await Promise.all([
      page.waitForResponse(
        (resp) => resp.request().method() === 'POST' && resp.url().includes('trpc/register'),
        { timeout: 10000 }
      ),
      registerButton.click(),
    ]);

    await expect(page.getByTestId('register-message')).toHaveText(
      'Registration successful! Please check your email to verify your account.!',
      { timeout: 2000 }
    );

    await page.waitForURL('**/login', { timeout: 5000 });

    await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible({ timeout: 10000 });
  });

  test('should display error message with invalid email', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('signup-link')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('signup-link').click();

    await expect(page.getByTestId('register-form')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('m@example.com')).toBeVisible({ timeout: 5000 });

    const emailInput = page.getByPlaceholder('m@example.com');
    const passwordInput = page.getByPlaceholder('Enter your password');

    await emailInput.fill('invalid-email');
    await expect(emailInput).toHaveValue('invalid-email');

    await passwordInput.fill('password123');
    await expect(passwordInput).toHaveValue('password123');

    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByText('Please enter a valid email address')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('register-form')).toBeVisible({ timeout: 5000 });

    const response = await page
      .waitForResponse(
        (resp) => resp.request().method() === 'POST' && resp.url().includes('trpc/register'),
        { timeout: 2000 }
      )
      .catch(() => null);
    expect(response).toBeNull();
  });

  test('should display error message with short password', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('signup-link')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('signup-link').click();

    await expect(page.getByTestId('register-form')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('m@example.com')).toBeVisible({ timeout: 5000 });

    const emailInput = page.getByPlaceholder('m@example.com');
    const passwordInput = page.getByPlaceholder('Enter your password');

    await emailInput.fill('newuser@example.com');
    await expect(emailInput).toHaveValue('newuser@example.com');

    await passwordInput.fill('short');
    await expect(passwordInput).toHaveValue('short');

    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId('register-form')).toBeVisible({ timeout: 5000 });

    const response = await page
      .waitForResponse(
        (resp) => resp.request().method() === 'POST' && resp.url().includes('trpc/register'),
        { timeout: 2000 }
      )
      .catch(() => null);
    expect(response).toBeNull();
  });

  test('should switch to login form when log in button is clicked', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('signup-link')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('signup-link').click();

    await expect(page.getByTestId('register-form')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('m@example.com')).toBeVisible({ timeout: 5000 });

    await expect(page.getByTestId('login-link')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('login-link').click();

    await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible({ timeout: 5000 });
  });
});
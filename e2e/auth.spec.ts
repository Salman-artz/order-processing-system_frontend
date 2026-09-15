import { test, expect } from './fixtures/auth';
import { createMockJwt, TEST_CUSTOMER, TEST_ADMIN } from './fixtures/auth';
import { setupStandardApiMocks } from './utils/seed';

test.describe('CUJ-01: Authentication & Session Management', () => {

  test('Happy Path: Customer Register -> Redirect to Login', async ({ page }) => {
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'User registered successfully' }),
      });
    });

    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

    await page.getByTestId('input-name').fill('John Doe');
    await page.getByTestId('input-email').fill('john.doe@example.com');
    await page.getByTestId('input-password').fill('Password123');
    await page.getByTestId('input-confirm-password').fill('Password123');

    await page.getByTestId('btn-submit').click();

    // Verify redirected to login page with toast
    await expect(page).toHaveURL(/\/login/);
  });

  test('Happy Path: Customer Login -> Redirect to /customer/products', async ({ page }) => {
    const token = createMockJwt(TEST_CUSTOMER);

    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token }),
      });
    });

    await setupStandardApiMocks(page);

    await page.goto('/login');
    await page.getByTestId('input-email').fill('customer@test.com');
    await page.getByTestId('input-password').fill('Password123');
    await page.getByTestId('btn-submit').click();

    await expect(page).toHaveURL(/\/customer\/products/);
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('user-email')).toHaveText('customer@test.com');
  });

  test('Happy Path: Admin Login -> Redirect to /admin/dashboard', async ({ page }) => {
    const token = createMockJwt(TEST_ADMIN);

    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token }),
      });
    });

    await setupStandardApiMocks(page);

    await page.goto('/login');
    await page.getByTestId('input-email').fill('admin@test.com');
    await page.getByTestId('input-password').fill('Password123');
    await page.getByTestId('btn-submit').click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('user-email')).toHaveText('admin@test.com');
  });

  test('Happy Path: User Logout -> Clears Token and Redirects to /login', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);
    await customerPage.goto('/customer/products');
    await expect(customerPage.getByTestId('sidebar')).toBeVisible();

    await customerPage.getByTestId('btn-logout').click();

    await expect(customerPage).toHaveURL(/\/login/);
    const storedToken = await customerPage.evaluate(() => localStorage.getItem('token'));
    expect(storedToken).toBeNull();
  });

  test('Happy Path: Session Hydration (F5) -> Session persists on reload', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);
    await customerPage.goto('/customer/products');
    await expect(customerPage.getByTestId('sidebar')).toBeVisible();

    // Reload page (F5)
    await customerPage.reload();

    // Verify user remains on products page without redirecting to login
    await expect(customerPage).toHaveURL(/\/customer\/products/);
    await expect(customerPage.getByTestId('sidebar')).toBeVisible();
    await expect(customerPage.getByTestId('user-email')).toHaveText('customer@test.com');
  });

  test('Failure State: Register Validation Errors (Client Zod Schema)', async ({ page }) => {
    await page.goto('/register');

    // Fill invalid inputs: short name, invalid email, weak password, mismatched confirm password
    await page.getByTestId('input-name').fill('A');
    await page.getByTestId('input-email').fill('invalid-email');
    await page.getByTestId('input-password').fill('weak');
    await page.getByTestId('input-confirm-password').fill('different');

    await page.getByTestId('btn-submit').click();

    await expect(page.getByTestId('error-name')).toBeVisible();
    await expect(page.getByTestId('error-email')).toBeVisible();
    await expect(page.getByTestId('error-password')).toBeVisible();
    await expect(page.getByTestId('error-confirm-password')).toBeVisible();
  });

  test('Failure State: Register Duplicate Email (Backend 400/409)', async ({ page }) => {
    await page.route('**/api/v1/auth/register', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Email is already registered' }),
      });
    });

    await page.goto('/register');
    await page.getByTestId('input-name').fill('Existing User');
    await page.getByTestId('input-email').fill('existing@example.com');
    await page.getByTestId('input-password').fill('Password123');
    await page.getByTestId('input-confirm-password').fill('Password123');

    await page.getByTestId('btn-submit').click();

    // Should stay on /register and show failure feedback
    await expect(page).toHaveURL(/\/register/);
  });

  test('Failure State: Login Invalid Credentials', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid email or password' }),
      });
    });

    await page.goto('/login');
    await page.getByTestId('input-email').fill('wrong@example.com');
    await page.getByTestId('input-password').fill('WrongPassword123');
    await page.getByTestId('btn-submit').click();

    await expect(page).toHaveURL(/\/login/);
  });

  test('Security/RBAC: Unauthenticated User Accessing Protected Route is Redirected to /login', async ({ page }) => {
    // Clear any storage state
    await page.goto('/customer/products');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Security/RBAC: Customer User Accessing /admin Route is Redirected to /customer/products', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);
    await customerPage.goto('/admin/dashboard');
    await expect(customerPage).toHaveURL(/\/customer\/products/);
  });

});

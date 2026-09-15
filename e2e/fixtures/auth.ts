import { test as base, Page } from '@playwright/test';

export interface TestUser {
  id: string;
  email: string;
  name?: string;
  role: 'CUSTOMER' | 'ADMIN';
}

export const TEST_CUSTOMER: TestUser = {
  id: 'c1111111-1111-1111-1111-111111111111',
  email: 'customer@test.com',
  name: 'Test Customer',
  role: 'CUSTOMER',
};

export const TEST_ADMIN: TestUser = {
  id: 'a9999999-9999-9999-9999-999999999999',
  email: 'admin@test.com',
  name: 'Test Admin',
  role: 'ADMIN',
};

export function createMockJwt(user: TestUser): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      user_id: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24,
    })
  ).toString('base64url');
  const signature = Buffer.from('mock_signature_for_e2e_tests').toString('base64url');
  return `${header}.${payload}.${signature}`;
}

export async function injectAuthState(page: Page, user: TestUser = TEST_CUSTOMER) {
  const token = createMockJwt(user);
  await page.addInitScript(
    ({ token, user }) => {
      // Only set if not explicitly logged out
      if (!sessionStorage.getItem('logged_out')) {
        window.localStorage.setItem('token', token);
        window.localStorage.setItem('user', JSON.stringify(user));
      }
    },
    { token, user }
  );
}

type AuthFixtures = {
  customerPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  customerPage: async ({ page }, use) => {
    await injectAuthState(page, TEST_CUSTOMER);
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await injectAuthState(page, TEST_ADMIN);
    await use(page);
  },
});

export { expect } from '@playwright/test';

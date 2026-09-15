import { test, expect } from './fixtures/auth';
import { setupStandardApiMocks } from './utils/seed';

test.describe('CUJ-04: Admin Dashboard & Analytics', () => {

  test('Happy Path: Admin Dashboard Renders KPI Metrics and Charts', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    await adminPage.goto('/admin/dashboard');
    await expect(adminPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Verify KPI Cards
    await expect(adminPage.getByTestId('metric-total-orders')).toBeVisible();
    await expect(adminPage.getByTestId('metric-revenue')).toBeVisible();
    await expect(adminPage.getByTestId('metric-pending-orders')).toBeVisible();
    await expect(adminPage.getByTestId('metric-success-rate')).toBeVisible();

    // Verify KPI calculations match SEED_ORDERS (3 orders total: 1 completed, 1 pending, 1 cancelled)
    await expect(adminPage.getByTestId('metric-total-orders')).toContainText('3');
    await expect(adminPage.getByTestId('metric-pending-orders')).toContainText('1');

    // Verify Charts Containers
    await expect(adminPage.getByTestId('chart-revenue-container')).toBeVisible();
    await expect(adminPage.getByTestId('chart-status-container')).toBeVisible();

    // Verify Recent Orders Table
    await expect(adminPage.getByTestId('table-recent-orders')).toBeVisible();
    await expect(adminPage.getByTestId('recent-order-row-ord-completed-101')).toBeVisible();
  });

  test('Happy Path: Auto-Refresh Indicator is Active', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    await adminPage.goto('/admin/dashboard');
    await expect(adminPage.getByText(/Auto-refreshing every 10s/)).toBeVisible();
  });

});

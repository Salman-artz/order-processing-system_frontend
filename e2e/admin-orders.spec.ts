import { test, expect } from './fixtures/auth';
import { setupStandardApiMocks } from './utils/seed';

test.describe('CUJ-05: Admin Order Management & Saga Audit Trail', () => {

  test('Happy Path: Admin Views All Orders Table', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    await adminPage.goto('/admin/orders');
    await expect(adminPage.getByRole('heading', { name: 'All Orders' })).toBeVisible();

    // Verify table and rows
    await expect(adminPage.getByTestId('table-admin-orders')).toBeVisible();
    await expect(adminPage.getByTestId('admin-order-row-ord-completed-101')).toBeVisible();
    await expect(adminPage.getByTestId('admin-order-row-ord-pending-102')).toBeVisible();
    await expect(adminPage.getByTestId('admin-order-row-ord-cancelled-103')).toBeVisible();
  });

  test('Happy Path: Admin Filters Orders by Status', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    await adminPage.goto('/admin/orders');

    // Filter by COMPLETED
    await adminPage.getByTestId('select-status-filter').selectOption('COMPLETED');
    await expect(adminPage.getByTestId('admin-order-row-ord-completed-101')).toBeVisible();
    await expect(adminPage.getByTestId('admin-order-row-ord-pending-102')).not.toBeVisible();
    await expect(adminPage.getByTestId('admin-order-row-ord-cancelled-103')).not.toBeVisible();

    // Filter by CANCELLED
    await adminPage.getByTestId('select-status-filter').selectOption('CANCELLED');
    await expect(adminPage.getByTestId('admin-order-row-ord-cancelled-103')).toBeVisible();
    await expect(adminPage.getByTestId('admin-order-row-ord-completed-101')).not.toBeVisible();
  });

  test('Happy Path: Admin Inspects Order Details & Saga Execution Logs', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    await adminPage.goto('/admin/orders/ord-completed-101');
    await expect(adminPage.getByRole('heading', { name: 'Admin Order Details' })).toBeVisible();

    await expect(adminPage.getByTestId('admin-order-id')).toHaveText('ord-completed-101');
    await expect(adminPage.getByTestId('admin-order-status-badge')).toHaveText('COMPLETED');

    // Verify Items and Total
    await expect(adminPage.getByTestId('admin-order-items')).toBeVisible();
    await expect(adminPage.getByTestId('admin-order-total')).toContainText('1.350.000');

    // Verify Saga Execution Logs
    await expect(adminPage.getByTestId('admin-saga-logs-section')).toBeVisible();
    await expect(adminPage.getByTestId('admin-saga-log-order_create')).toBeVisible();
    await expect(adminPage.getByTestId('admin-saga-log-stock_reserve')).toBeVisible();
    await expect(adminPage.getByTestId('admin-saga-log-payment_process')).toBeVisible();
  });

  test('Failure State: Filter with No Matching Orders Displays Empty State', async ({ adminPage }) => {
    await setupStandardApiMocks(adminPage);

    await adminPage.goto('/admin/orders');

    // Filter by RESERVED (which has 0 items in SEED_ORDERS)
    await adminPage.getByTestId('select-status-filter').selectOption('RESERVED');
    await expect(adminPage.getByTestId('empty-admin-orders-state')).toBeVisible();
    await expect(adminPage.getByTestId('empty-admin-orders-state')).toHaveText('No orders found.');
  });

});

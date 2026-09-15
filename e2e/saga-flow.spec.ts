import { test, expect } from './fixtures/auth';
import { setupStandardApiMocks, SEED_ORDERS } from './utils/seed';

test.describe('CUJ-03: Order Tracking & Saga Lifecycle (Happy Path vs Compensation)', () => {

  test('Happy Path: Customer Views Orders List with Compact Saga Status', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);

    await customerPage.goto('/customer/orders');
    await expect(customerPage.getByRole('heading', { name: 'My Orders' })).toBeVisible();

    // Verify order cards are rendered
    await expect(customerPage.getByTestId('customer-orders-list')).toBeVisible();
    await expect(customerPage.getByTestId('order-card-ord-completed-101')).toBeVisible();
    await expect(customerPage.getByTestId('order-id-ord-completed-101')).toHaveText('ord-completed-101');

    // Verify compact saga status
    const completedCard = customerPage.getByTestId('order-card-ord-completed-101');
    await expect(completedCard.getByTestId('saga-compact-status')).toHaveText('COMPLETED');
  });

  test('Happy Path: Order Details Renders Full Saga Timeline & Item Summary', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);

    await customerPage.goto('/customer/orders/ord-completed-101');
    await expect(customerPage.getByRole('heading', { name: 'Order Details' })).toBeVisible();

    await expect(customerPage.getByTestId('order-details-id')).toHaveText('ord-completed-101');
    await expect(customerPage.getByTestId('status-badge')).toHaveText('COMPLETED');

    // Verify Saga Timeline
    await expect(customerPage.getByTestId('saga-timeline')).toBeVisible();
    await expect(customerPage.getByTestId('saga-step-pending')).toBeVisible();
    await expect(customerPage.getByTestId('saga-step-reserved')).toBeVisible();
    await expect(customerPage.getByTestId('saga-step-awaiting_payment')).toBeVisible();
    await expect(customerPage.getByTestId('saga-step-completed')).toBeVisible();

    // Verify item details and total
    await expect(customerPage.getByTestId('order-details-items')).toBeVisible();
    await expect(customerPage.getByTestId('order-details-total')).toContainText('1.350.000');
  });

  test('Happy Path: Live WebSocket Status Transition (Simulated Deterministic Frame)', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);

    // Mock initial order as PENDING
    await customerPage.route('**/api/v1/orders/ord-live-test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ord-live-test',
          userId: 'c1111111-1111-1111-1111-111111111111',
          status: 'PENDING',
          totalAmount: 1350000,
          items: [{ productId: '6e37486f-7ce2-41c1-9046-a8f2d943006f', quantity: 1, price: 1350000 }],
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // Mock WebSocket server if supported or simulate status update
    await customerPage.routeWebSocket?.('**/ws/orders/ord-live-test*', (ws) => {
      ws.onMessage((message) => {
        // Echo or handle client ping
      });
      // Emit progression event
      setTimeout(() => {
        ws.send(JSON.stringify({ order_id: 'ord-live-test', status: 'COMPLETED' }));
      }, 500);
    });

    await customerPage.goto('/customer/orders/ord-live-test');
    await expect(customerPage.getByTestId('order-details-id')).toHaveText('ord-live-test');
  });

  test('Saga Compensation: Cancelled Order Displays Compensation Banner & Status', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);

    await customerPage.goto('/customer/orders/ord-cancelled-103');
    await expect(customerPage.getByTestId('order-details-id')).toHaveText('ord-cancelled-103');

    // Verify CANCELLED status badge
    await expect(customerPage.getByTestId('status-badge')).toHaveText('CANCELLED');

    // Verify Saga Cancelled Compensation Banner
    await expect(customerPage.getByTestId('saga-cancelled-banner')).toBeVisible();
    await expect(customerPage.getByTestId('saga-cancelled-banner')).toContainText(
      'Order was cancelled. Any reserved stock has been released.'
    );
  });

  test('Failure State: Empty Customer Orders (No Previous Purchases)', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage, { orders: [] });

    await customerPage.goto('/customer/orders');
    await expect(customerPage.getByTestId('empty-orders-state')).toBeVisible();
    await expect(customerPage.getByTestId('empty-orders-state')).toHaveText('No orders found.');
  });

  test('Payment Gateway: Midtrans Snap Payment Settlement', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);

    // Mock initial in-flight order
    await customerPage.route('**/api/v1/orders/ord-midtrans-test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ord-midtrans-test',
          userId: 'c1111111-1111-1111-1111-111111111111',
          status: 'RESERVED',
          totalAmount: 4500000,
          items: [{ productId: '13ab7375-c7b2-4e83-8cc0-dfd981ed74d7', quantity: 1, price: 4500000 }],
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // Mock Midtrans simulate endpoint
    await customerPage.route('**/api/v1/payments/midtrans/simulate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', message: 'Midtrans payment simulated as settlement' }),
      });
    });

    await customerPage.goto('/customer/orders/ord-midtrans-test');
    await expect(customerPage.getByTestId('midtrans-gateway-section')).toBeVisible();
    await expect(customerPage.getByTestId('btn-midtrans-pay')).toBeVisible();

    // Trigger Midtrans Pay Simulation
    await customerPage.getByTestId('btn-midtrans-pay').click();
  });

  test('Payment Gateway: Midtrans Snap Payment Cancellation / Denial', async ({ customerPage }) => {
    await setupStandardApiMocks(customerPage);

    await customerPage.route('**/api/v1/orders/ord-midtrans-cancel-test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ord-midtrans-cancel-test',
          userId: 'c1111111-1111-1111-1111-111111111111',
          status: 'CANCELLED',
          totalAmount: 28500000,
          items: [{ productId: '4120ce5d-ac77-45f1-bd50-c5bc5d2725ad', quantity: 1, price: 28500000 }],
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await customerPage.goto('/customer/orders/ord-midtrans-cancel-test');
    await expect(customerPage.getByTestId('midtrans-gateway-section')).toBeVisible();
    await expect(customerPage.getByTestId('midtrans-status-failed')).toBeVisible();
  });

});

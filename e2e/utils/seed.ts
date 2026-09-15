import { Page } from '@playwright/test';

export interface MockProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
}

export interface MockOrder {
  id: string;
  userId: string;
  status: 'PENDING' | 'RESERVED' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  items: Array<{ productId: string; quantity: number; price: number }>;
  createdAt: string;
  updatedAt?: string;
  sagaLogs?: Array<{
    id: string;
    orderId: string;
    eventType: string;
    status: 'SUCCESS' | 'FAILED';
    createdAt: string;
  }>;
}

export const SEED_PRODUCTS: MockProduct[] = [
  {
    id: '4120ce5d-ac77-45f1-bd50-c5bc5d2725ad',
    name: 'GPU NVIDIA RTX 4090 24GB',
    price: 28500000,
    stock: 2,
    description: 'Flagship graphics card, PCIe 5.0',
  },
  {
    id: '13ab7375-c7b2-4e83-8cc0-dfd981ed74d7',
    name: 'Headphone Sony WH-1000XM5 Noise Cancelling',
    price: 4500000,
    stock: 20,
    description: 'Noise-cancelling, 30h battery',
  },
  {
    id: '79e5bb66-f451-4960-b144-1dc6af9866f1',
    name: 'Laptop ASUS VivoBook 15 Intel Core i5',
    price: 8750000,
    stock: 25,
    description: 'Everyday laptop for work and study',
  },
  {
    id: '6e37486f-7ce2-41c1-9046-a8f2d943006f',
    name: 'Mechanical Keyboard Keychron K2 RGB',
    price: 1350000,
    stock: 40,
    description: 'Wireless, hot-swap, TKL layout',
  },
  {
    id: 'cf217e3f-1cac-40f1-ae59-166e659c743a',
    name: 'Monitor LG 24 inch IPS Full HD',
    price: 2850000,
    stock: 15,
    description: '24-inch IPS monitor for work and entertainment',
  },
  {
    id: 'eb824b0c-dca7-48b9-a72b-3448dd3627a2',
    name: 'SSD External Samsung T7 1TB',
    price: 1750000,
    stock: 35,
    description: 'Portable external SSD storage',
  },
  {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Discontinued Vintage Mouse',
    price: 150000,
    stock: 0,
    description: 'Out of stock item for testing failure boundary',
  },
];

export const SEED_ORDERS: MockOrder[] = [
  {
    id: 'ord-completed-101',
    userId: 'c1111111-1111-1111-1111-111111111111',
    status: 'COMPLETED',
    totalAmount: 1350000,
    items: [{ productId: '6e37486f-7ce2-41c1-9046-a8f2d943006f', quantity: 1, price: 1350000 }],
    createdAt: '2026-08-26T10:00:00Z',
    sagaLogs: [
      { id: 'l1', orderId: 'ord-completed-101', eventType: 'ORDER_CREATE', status: 'SUCCESS', createdAt: new Date(Date.now() - 3590000).toISOString() },
      { id: 'l2', orderId: 'ord-completed-101', eventType: 'STOCK_RESERVE', status: 'SUCCESS', createdAt: new Date(Date.now() - 3580000).toISOString() },
      { id: 'l3', orderId: 'ord-completed-101', eventType: 'PAYMENT_PROCESS', status: 'SUCCESS', createdAt: new Date(Date.now() - 3570000).toISOString() },
    ],
  },
  {
    id: 'ord-pending-102',
    userId: 'c1111111-1111-1111-1111-111111111111',
    status: 'PENDING',
    totalAmount: 4500000,
    items: [{ productId: '13ab7375-c7b2-4e83-8cc0-dfd981ed74d7', quantity: 1, price: 4500000 }],
    createdAt: '2026-08-26T11:00:00Z',
    sagaLogs: [
      { id: 'l4', orderId: 'ord-pending-102', eventType: 'ORDER_CREATE', status: 'SUCCESS', createdAt: new Date().toISOString() },
    ],
  },
  {
    id: 'ord-cancelled-103',
    userId: 'c1111111-1111-1111-1111-111111111111',
    status: 'CANCELLED',
    totalAmount: 28500000,
    items: [{ productId: '4120ce5d-ac77-45f1-bd50-c5bc5d2725ad', quantity: 1, price: 28500000 }],
    createdAt: '2026-08-26T12:00:00Z',
    sagaLogs: [
      { id: 'l5', orderId: 'ord-cancelled-103', eventType: 'ORDER_CREATE', status: 'SUCCESS', createdAt: new Date(Date.now() - 7190000).toISOString() },
      { id: 'l6', orderId: 'ord-cancelled-103', eventType: 'STOCK_RESERVE', status: 'SUCCESS', createdAt: new Date(Date.now() - 7180000).toISOString() },
      { id: 'l7', orderId: 'ord-cancelled-103', eventType: 'PAYMENT_PROCESS', status: 'FAILED', createdAt: new Date(Date.now() - 7170000).toISOString() },
    ],
  },
];

/**
 * Setup standard API mocks for isolated, deterministic E2E test runs.
 */
export async function setupStandardApiMocks(page: Page, options?: {
  products?: MockProduct[];
  orders?: MockOrder[];
  throwProductsError?: boolean;
  throwOrdersError?: boolean;
}) {
  const products = options?.products ?? SEED_PRODUCTS;
  const orders = options?.orders ?? SEED_ORDERS;

  // Intercept Products API
  await page.route(/\/api\/v1\/products(\/.*|\?.*)?$/, async (route) => {
    if (options?.throwProductsError) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ products, total: products.length }) });
    }
  });

  // Intercept Admin Orders API (prioritized over customer orders)
  await page.route(/\/api\/v1\/admin\/orders(\/.*|\?.*)?$/, async (route) => {
    const url = route.request().url();
    const parsedUrl = new URL(url);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    if (lastSegment === 'orders') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ orders, total: orders.length }) });
    } else {
      const orderId = lastSegment;
      const order = orders.find((o) => o.id === orderId) || {
        ...orders[0],
        id: orderId,
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(order) });
    }
  });

  // Intercept Customer Orders API
  await page.route(/\/api\/v1\/orders(\/.*|\?.*)?$/, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const parsedUrl = new URL(url);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    if (lastSegment === 'orders' && method === 'GET') {
      if (options?.throwOrdersError) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ orders, total: orders.length }) });
      }
    } else if (lastSegment === 'orders' && method === 'POST') {
      const payload = route.request().postDataJSON();
      const newOrder: MockOrder = {
        id: `ord-created-${Date.now().toString().slice(-6)}`,
        userId: 'c1111111-1111-1111-1111-111111111111',
        status: 'PENDING',
        totalAmount: payload?.items?.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0) || 1350000,
        items: payload?.items || [],
        createdAt: new Date().toISOString(),
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ order: newOrder }),
      });
    } else {
      const orderId = lastSegment;
      const order = orders.find((o) => o.id === orderId) || {
        id: orderId,
        userId: 'c1111111-1111-1111-1111-111111111111',
        status: 'PENDING',
        totalAmount: 1350000,
        items: [{ productId: '6e37486f-7ce2-41c1-9046-a8f2d943006f', quantity: 1, price: 1350000 }],
        createdAt: new Date().toISOString(),
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(order) });
    }
  });
}

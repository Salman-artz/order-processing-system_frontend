import api from '@/lib/api/client';
import { Order, OrderStatus, SagaLog } from '@/types';

export interface CreateOrderPayload {
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
}

export interface FulfillmentMetrics {
  total_orders: number;
  pending_fulfillment: number;
  picking_orders: number;
  packed_orders: number;
  dispatched_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  median_latency?: string;
  status_counts: Record<string, number>;
}

export const MOCK_ORDERS_STORE: Order[] = [
  {
    id: "ord-8f92a104",
    userId: "usr-admin-01",
    status: "COMPLETED",
    totalAmount: 1200000,
    items: [{ productId: "3bd14f9f-26b3-41c2-bb9a-461a7c4d37c6", quantity: 1, price: 1200000 }],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "ord-e41c7b89",
    userId: "usr-cust-02",
    status: "CANCELLED",
    totalAmount: 28500000,
    items: [{ productId: "4120ce5d-ac77-45f1-bd50-c5bc5d2725ad", quantity: 1, price: 28500000 }],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "ord-710da9c2",
    userId: "usr-cust-03",
    status: "INVENTORY_RESERVED",
    totalAmount: 4500000,
    items: [{ productId: "13ab7375-c7b2-4e83-8cc0-dfd981ed74d7", quantity: 1, price: 4500000 }],
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "ord-3a81f57d",
    userId: "usr-cust-01",
    status: "CONFIRMED",
    totalAmount: 8750000,
    items: [{ productId: "79e5bb66-f451-4960-b144-1dc6af9866f1", quantity: 1, price: 8750000 }],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "ord-9b4e10c7",
    userId: "usr-cust-04",
    status: "COMPLETED",
    totalAmount: 1350000,
    items: [{ productId: "6e37486f-7ce2-41c1-9046-a8f2d943006f", quantity: 1, price: 1350000 }],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export class OrderService {
  static isMock(): boolean {
    return process.env.NEXT_PUBLIC_USE_MOCK === "true";
  }

  static async createOrder(payload: CreateOrderPayload): Promise<Order> {
    if (this.isMock()) {
      const total = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const newOrder: Order = {
        id: `ord-${Math.random().toString(36).substring(2, 10)}`,
        status: "CONFIRMED",
        totalAmount: total,
        items: payload.items.map((i) => ({
          productId: i.product_id,
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_ORDERS_STORE.unshift(newOrder);
      return newOrder;
    }
    const res = await api.post('/orders', payload);
    return res.data.order ?? res.data;
  }

  static async simulateFailureOrder(payload: CreateOrderPayload): Promise<Order> {
    if (this.isMock()) {
      const total = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const newOrder: Order = {
        id: `ord-fail-${Math.random().toString(36).substring(2, 10)}`,
        status: "CANCELLED",
        totalAmount: total,
        items: payload.items.map((i) => ({
          productId: i.product_id,
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_ORDERS_STORE.unshift(newOrder);
      return newOrder;
    }
    // Amount trigger for backend simulation fail (balance insufficient / limit exceeded)
    const failItems = payload.items.map((item) => ({
      ...item,
      price: 8888, // Specific trigger recognized by backend payment-service
    }));
    const res = await api.post('/orders', { items: failItems });
    return res.data.order ?? res.data;
  }

  static async getOrderById(orderId: string): Promise<Order> {
    if (this.isMock()) {
      const found = MOCK_ORDERS_STORE.find((o) => o.id === orderId);
      if (found) return found;
      return {
        id: orderId,
        status: orderId.includes('fail') ? 'CANCELLED' : 'COMPLETED',
        totalAmount: 4500000,
        items: [{ productId: "13ab7375-c7b2-4e83-8cc0-dfd981ed74d7", quantity: 1, price: 4500000 }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    const res = await api.get(`/orders/${orderId}`);
    const item = res.data.order ?? res.data;
    return {
      id: item.id,
      userId: item.customer_id || item.userId,
      status: item.status,
      totalAmount: typeof item.total_amount === 'string'
        ? parseFloat(item.total_amount.replace(',', '.'))
        : Number(item.total_amount ?? item.totalAmount ?? 0),
      items: item.items || [],
      createdAt: item.created_at || item.createdAt,
      updatedAt: item.updated_at || item.updatedAt,
    };
  }

  static async listCustomerOrders(): Promise<Order[]> {
    if (this.isMock()) {
      return MOCK_ORDERS_STORE;
    }
    const res = await api.get('/orders');
    const list = res.data.orders ?? res.data;
    if (Array.isArray(list)) {
      return list.map((item: any) => ({
        id: item.id,
        userId: item.customer_id || item.userId,
        status: item.status,
        totalAmount: typeof item.total_amount === 'string'
          ? parseFloat(item.total_amount.replace(',', '.'))
          : Number(item.total_amount ?? item.totalAmount ?? 0),
        items: item.items || [],
        createdAt: item.created_at || item.createdAt,
        updatedAt: item.updated_at || item.updatedAt,
      }));
    }
    return [];
  }

  static async listAllOrders(): Promise<Order[]> {
    if (this.isMock()) {
      return MOCK_ORDERS_STORE;
    }
    const res = await api.get('/admin/orders');
    const list = res.data.orders ?? res.data;
    if (Array.isArray(list)) {
      return list.map((item: any) => ({
        id: item.id,
        userId: item.customer_id || item.userId,
        status: item.status,
        totalAmount: typeof item.total_amount === 'string'
          ? parseFloat(item.total_amount.replace(',', '.'))
          : Number(item.total_amount ?? item.totalAmount ?? 0),
        items: item.items || [],
        createdAt: item.created_at || item.createdAt,
        updatedAt: item.updated_at || item.updatedAt,
      }));
    }
    return [];
  }

  static async advanceFulfillment(orderId: string, status: string, notes?: string): Promise<Order> {
    if (this.isMock()) {
      const order = MOCK_ORDERS_STORE.find((o) => o.id === orderId);
      if (order) {
        order.status = status as OrderStatus;
        order.updatedAt = new Date().toISOString();
        return order;
      }
      throw new Error("Order not found in mock store");
    }
    const res = await api.patch(`/admin/orders/${orderId}/fulfillment`, { status, notes });
    return res.data.order ?? res.data;
  }

  static async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    if (this.isMock()) {
      const order = MOCK_ORDERS_STORE.find((o) => o.id === orderId);
      if (order) {
        order.status = "CANCELLED";
        order.updatedAt = new Date().toISOString();
        return order;
      }
      throw new Error("Order not found in mock store");
    }
    const res = await api.post(`/admin/orders/${orderId}/cancel`, { reason });
    return res.data.order ?? res.data;
  }

  static async getOrderTimeline(orderId: string): Promise<SagaLog[]> {
    if (this.isMock()) {
      return [];
    }
    const res = await api.get(`/admin/orders/${orderId}/timeline`);
    return res.data.timeline ?? res.data ?? [];
  }

  static async getMetrics(): Promise<FulfillmentMetrics> {
    if (this.isMock()) {
      const statusCounts: Record<string, number> = {};
      let totalRev = 0;
      MOCK_ORDERS_STORE.forEach((o) => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
        totalRev += Number(o.totalAmount ?? o.total_amount ?? 0);
      });
      return {
        total_orders: MOCK_ORDERS_STORE.length,
        pending_fulfillment: (statusCounts["CONFIRMED"] || 0) + (statusCounts["PENDING"] || 0),
        picking_orders: statusCounts["PICKING"] || 0,
        packed_orders: statusCounts["PACKED"] || 0,
        dispatched_orders: statusCounts["DISPATCHED"] || 0,
        completed_orders: statusCounts["COMPLETED"] || 0,
        cancelled_orders: (statusCounts["CANCELLED"] || 0) + (statusCounts["PAYMENT_FAILED"] || 0),
        total_revenue: totalRev,
        status_counts: statusCounts,
      };
    }
    const res = await api.get('/admin/metrics');
    const data = res.data.metrics ?? res.data;
    return {
      total_orders: Number(data.total_orders ?? 0),
      pending_fulfillment: Number(data.pending_fulfillment ?? 0),
      picking_orders: Number(data.picking_orders ?? 0),
      packed_orders: Number(data.packed_orders ?? 0),
      dispatched_orders: Number(data.dispatched_orders ?? 0),
      completed_orders: Number(data.completed_orders ?? 0),
      cancelled_orders: Number(data.cancelled_orders ?? 0),
      total_revenue: Number(data.total_revenue ?? 0),
      status_counts: data.status_counts ?? {},
    };
  }
}

import api from '@/lib/api/client';
import { Order, OrderStatus, SagaLog } from '@/types';

export interface CreateOrderPayload {
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
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
    status: "RESERVED",
    totalAmount: 4500000,
    items: [{ productId: "13ab7375-c7b2-4e83-8cc0-dfd981ed74d7", quantity: 1, price: 4500000 }],
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "ord-3a81f57d",
    userId: "usr-cust-01",
    status: "COMPLETED",
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
  static async createOrder(payload: CreateOrderPayload): Promise<Order> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      const total = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const newOrder: Order = {
        id: `ord-${Math.random().toString(36).substring(2, 10)}`,
        status: "COMPLETED",
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
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
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
      price: 8888, // Specific simulated trigger recognized by backend payment-service
    }));
    const res = await api.post('/orders', { items: failItems });
    return res.data.order ?? res.data;
  }

  static async getOrderById(orderId: string): Promise<Order> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
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
    return res.data.order ?? res.data;
  }

  static async listCustomerOrders(): Promise<Order[]> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      return MOCK_ORDERS_STORE;
    }
    try {
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
      return MOCK_ORDERS_STORE;
    } catch {
      return MOCK_ORDERS_STORE;
    }
  }

  static async listAllOrders(): Promise<Order[]> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      return MOCK_ORDERS_STORE;
    }
    try {
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
      return MOCK_ORDERS_STORE;
    } catch {
      return MOCK_ORDERS_STORE;
    }
  }

  static async getOrderTimeline(orderId: string): Promise<SagaLog[]> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      const isFailed = orderId.includes('fail') || orderId === 'ord-e41c7b89';
      if (isFailed) {
        return [
          { id: "log-1", orderId, eventType: "order.created", status: "SUCCESS", payload: { order_id: orderId, action: "Order persisted as PENDING" }, createdAt: new Date(Date.now() - 4000).toISOString() },
          { id: "log-2", orderId, eventType: "inventory.reserved", status: "SUCCESS", payload: { order_id: orderId, action: "Stock lock acquired in PostgreSQL" }, createdAt: new Date(Date.now() - 3200).toISOString() },
          { id: "log-3", orderId, eventType: "payment.failed", status: "FAILED", payload: { order_id: orderId, reason: "Transaction limit exceeded (> Rp 10.000.000)" }, createdAt: new Date(Date.now() - 2100).toISOString() },
          { id: "log-4", orderId, eventType: "inventory.released", status: "COMPENSATED", payload: { order_id: orderId, action: "SAGA COMPENSATION: Stock unlocked & refunded back to inventory" }, createdAt: new Date(Date.now() - 1100).toISOString() },
          { id: "log-5", orderId, eventType: "order.cancelled", status: "CANCELLED", payload: { order_id: orderId, final_status: "CANCELLED", compensation: "Completed" }, createdAt: new Date(Date.now() - 200).toISOString() },
        ];
      }
      return [
        { id: "log-1", orderId, eventType: "order.created", status: "SUCCESS", payload: { order_id: orderId, action: "Order initialized" }, createdAt: new Date(Date.now() - 3500).toISOString() },
        { id: "log-2", orderId, eventType: "inventory.reserved", status: "SUCCESS", payload: { order_id: orderId, action: "Stock locked" }, createdAt: new Date(Date.now() - 2700).toISOString() },
        { id: "log-3", orderId, eventType: "payment.success", status: "SUCCESS", payload: { order_id: orderId, action: "Payment verified via Midtrans" }, createdAt: new Date(Date.now() - 1500).toISOString() },
        { id: "log-4", orderId, eventType: "order.completed", status: "SUCCESS", payload: { order_id: orderId, final_status: "COMPLETED" }, createdAt: new Date(Date.now() - 400).toISOString() },
      ];
    }

    try {
      const res = await api.get(`/admin/orders/${orderId}/timeline`);
      const list = res.data.timeline ?? res.data;
      if (Array.isArray(list)) {
        return list.map((item: any) => ({
          id: item.id,
          orderId: item.order_id || item.orderId || orderId,
          eventType: item.event_type || item.eventType,
          status: (item.event_type || "").includes("failed") 
            ? "FAILED" 
            : (item.event_type || "").includes("released") || (item.event_type || "").includes("compensat")
            ? "COMPENSATED" 
            : (item.event_type || "").includes("cancelled")
            ? "CANCELLED"
            : "SUCCESS",
          payload: item.payload,
          createdAt: item.created_at || item.createdAt,
        }));
      }
      return [];
    } catch {
      return [];
    }
  }
}

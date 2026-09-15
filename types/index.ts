export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
}

export type OrderStatus = 'PENDING' | 'RESERVED' | 'PAID' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id?: string;
  productId?: string;
  product_id?: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId?: string;
  customer_id?: string;
  status: OrderStatus;
  items?: OrderItem[];
  totalAmount?: number;
  total_amount?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface SagaLog {
  id: string;
  orderId?: string;
  order_id?: string;
  eventType?: string;
  event_type?: string;
  status?: string;
  payload?: any;
  createdAt?: string;
  created_at?: string;
}

export function getOrderTotal(order: Order | undefined | null): number {
  if (!order) return 0;
  return Number(order.totalAmount ?? order.total_amount ?? 0);
}

export function getOrderDate(dateStr?: string): string {
  if (!dateStr) return "–";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "–" : d.toLocaleDateString();
  } catch {
    return "–";
  }
}

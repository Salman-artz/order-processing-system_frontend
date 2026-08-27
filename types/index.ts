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
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SagaLog {
  id: string;
  orderId: string;
  eventType: string;
  status: string;
  payload?: any;
  createdAt: string;
}

import api from '@/lib/api/client';
import { Product } from '@/types';

export interface ProductItem {
  id: string;
  name: string;
  stock_available: number;
  stock_reserved: number;
  stock: number;
  price: number;
  description?: string;
}

export const MOCK_PRODUCTS: ProductItem[] = [
  { id: "4120ce5d-ac77-45f1-bd50-c5bc5d2725ad", name: "GPU NVIDIA RTX 4090 24GB", price: 28500000, stock: 12, stock_reserved: 10, stock_available: 2, description: "Flagship 24GB GDDR6X, PCIe 5.0, 450W TDP" },
  { id: "13ab7375-c7b2-4e83-8cc0-dfd981ed74d7", name: "Headphone Sony WH-1000XM5", price: 4500000, stock: 25, stock_reserved: 5, stock_available: 20, description: "Industry-leading ANC, 30h battery, LDAC Hi-Res" },
  { id: "79e5bb66-f451-4960-b144-1dc6af9866f1", name: "Laptop ASUS VivoBook 15 Core i5", price: 8750000, stock: 30, stock_reserved: 5, stock_available: 25, description: "Intel Core i5-1335U, 16GB RAM, 512GB NVMe" },
  { id: "6e37486f-7ce2-41c1-9046-a8f2d943006f", name: "Mechanical Keyboard Keychron K2 RGB", price: 1350000, stock: 45, stock_reserved: 5, stock_available: 40, description: "Wireless Bluetooth 5.1, Hot-swap, Gateron G Pro" },
  { id: "cf217e3f-1cac-40f1-ae59-166e659c743a", name: "Monitor LG 24\" IPS Full HD", price: 2850000, stock: 20, stock_reserved: 5, stock_available: 15, description: "IPS display, 75Hz refresh, AMD FreeSync, sRGB 99%" },
  { id: "eb824b0c-dca7-48b9-a72b-3448dd3627a2", name: "SSD External Samsung T7 1TB", price: 1750000, stock: 40, stock_reserved: 5, stock_available: 35, description: "USB 3.2 Gen 2, up to 1,050 MB/s, AES 256-bit" },
  { id: "7edc8875-b3b2-4e83-8cc0-dfd981ed74d1", name: "Standing Desk Ergonomic 140cm", price: 5200000, stock: 15, stock_reserved: 3, stock_available: 12, description: "Dual motor electric adjustment 70-120cm, memory preset" },
  { id: "aa43c0cd-7b4b-4cc1-b9a8-a9d5673f84f3", name: "USB-C Hub 7-in-1 Anker Premium", price: 425000, stock: 60, stock_reserved: 2, stock_available: 58, description: "4K HDMI, 100W Power Delivery, SD/microSD, 2x USB-A" },
];

export class ProductService {
  static async getProducts(): Promise<ProductItem[]> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      return MOCK_PRODUCTS;
    }
    try {
      const res = await api.get('/products');
      const data = res.data.products ?? res.data;
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          stock: Number(item.stock ?? (item.stock_available ?? 0) + (item.stock_reserved ?? 0)),
          stock_reserved: Number(item.stock_reserved ?? 0),
          stock_available: Number(item.stock_available ?? item.stock ?? 0),
          description: item.description,
        }));
      }
      return MOCK_PRODUCTS;
    } catch {
      return MOCK_PRODUCTS;
    }
  }

  static async getProductById(id: string): Promise<ProductItem | null> {
    const list = await this.getProducts();
    return list.find((p) => p.id === id) || null;
  }

  static async createProduct(payload: { name: string; price: number; stock: number }): Promise<ProductItem> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      const newItem: ProductItem = {
        id: `mock-prod-${Date.now()}`,
        name: payload.name,
        price: payload.price,
        stock: payload.stock,
        stock_reserved: 0,
        stock_available: payload.stock,
      };
      MOCK_PRODUCTS.unshift(newItem);
      return newItem;
    }
    const res = await api.post('/products', payload);
    return res.data.product ?? res.data;
  }

  static async updateProduct(id: string, payload: { name: string; price: number }): Promise<void> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      const p = MOCK_PRODUCTS.find((item) => item.id === id);
      if (p) {
        p.name = payload.name;
        p.price = payload.price;
      }
      return;
    }
    await api.put(`/products/${id}`, payload);
  }

  static async deleteProduct(id: string): Promise<void> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      const idx = MOCK_PRODUCTS.findIndex((item) => item.id === id);
      if (idx !== -1) MOCK_PRODUCTS.splice(idx, 1);
      return;
    }
    await api.delete(`/products/${id}`);
  }

  static async restockProduct(id: string, qty: number): Promise<void> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      const p = MOCK_PRODUCTS.find((item) => item.id === id);
      if (p) {
        p.stock += qty;
        p.stock_available += qty;
      }
      return;
    }
    await api.post(`/products/${id}/restock`, { quantity: qty });
  }
}

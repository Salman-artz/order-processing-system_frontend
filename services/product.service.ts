import api from '@/lib/api/client';

export interface ProductItem {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  category?: string;
  unit_of_measure?: string;
  price: number;
  cost_price?: number;
  stock_available: number;
  stock_reserved: number;
  stock: number;
  min_stock_threshold?: number;
  status?: string;
  is_low_stock?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StockMovementItem {
  id: string;
  product_id: string;
  location_id?: string | null;
  movement_type: string;
  quantity: number;
  reference_id?: string;
  previous_available: number;
  new_available: number;
  reason: string;
  created_at: string;
}

export interface WarehouseLocationItem {
  id: string;
  warehouse_name: string;
  zone: string;
  rack: string;
  shelf: string;
  bin: string;
  created_at?: string;
}

export const MOCK_PRODUCTS: ProductItem[] = [
  { id: "4120ce5d-ac77-45f1-bd50-c5bc5d2725ad", sku: "SKU-RTX-4090", name: "GPU NVIDIA RTX 4090 24GB", price: 28500000, cost_price: 24000000, stock: 12, stock_reserved: 10, stock_available: 2, min_stock_threshold: 5, category: "Components", unit_of_measure: "unit", status: "active", is_low_stock: true, description: "Flagship 24GB GDDR6X, PCIe 5.0, 450W TDP" },
  { id: "13ab7375-c7b2-4e83-8cc0-dfd981ed74d7", sku: "SKU-SONY-XM5", name: "Headphone Sony WH-1000XM5", price: 4500000, cost_price: 3600000, stock: 25, stock_reserved: 5, stock_available: 20, min_stock_threshold: 5, category: "Audio", unit_of_measure: "unit", status: "active", is_low_stock: false, description: "Industry-leading ANC, 30h battery, LDAC Hi-Res" },
  { id: "79e5bb66-f451-4960-b144-1dc6af9866f1", sku: "SKU-ASUS-VIVO", name: "Laptop ASUS VivoBook 15 Core i5", price: 8750000, cost_price: 7200000, stock: 30, stock_reserved: 5, stock_available: 25, min_stock_threshold: 5, category: "Computers", unit_of_measure: "unit", status: "active", is_low_stock: false, description: "Intel Core i5-1335U, 16GB RAM, 512GB NVMe" },
  { id: "6e37486f-7ce2-41c1-9046-a8f2d943006f", sku: "SKU-KCHRON-K2", name: "Mechanical Keyboard Keychron K2 RGB", price: 1350000, cost_price: 950000, stock: 45, stock_reserved: 5, stock_available: 40, min_stock_threshold: 10, category: "Peripherals", unit_of_measure: "unit", status: "active", is_low_stock: false, description: "Wireless Bluetooth 5.1, Hot-swap, Gateron G Pro" },
  { id: "cf217e3f-1cac-40f1-ae59-166e659c743a", sku: "SKU-LG-24IPS", name: "Monitor LG 24\" IPS Full HD", price: 2850000, cost_price: 2100000, stock: 20, stock_reserved: 5, stock_available: 15, min_stock_threshold: 5, category: "Monitors", unit_of_measure: "unit", status: "active", is_low_stock: false, description: "IPS display, 75Hz refresh, AMD FreeSync, sRGB 99%" },
  { id: "eb824b0c-dca7-48b9-a72b-3448dd3627a2", sku: "SKU-SAM-T7-1TB", name: "SSD External Samsung T7 1TB", price: 1750000, cost_price: 1300000, stock: 40, stock_reserved: 5, stock_available: 35, min_stock_threshold: 10, category: "Storage", unit_of_measure: "unit", status: "active", is_low_stock: false, description: "USB 3.2 Gen 2, up to 1,050 MB/s, AES 256-bit" },
  { id: "7edc8875-b3b2-4e83-8cc0-dfd981ed74d1", sku: "SKU-DESK-ERGO", name: "Standing Desk Ergonomic 140cm", price: 5200000, cost_price: 3900000, stock: 15, stock_reserved: 3, stock_available: 12, min_stock_threshold: 3, category: "Furniture", unit_of_measure: "unit", status: "active", is_low_stock: false, description: "Dual motor electric adjustment 70-120cm, memory preset" },
  { id: "aa43c0cd-7b4b-4cc1-b9a8-a9d5673f84f3", sku: "SKU-ANKER-HUB7", name: "USB-C Hub 7-in-1 Anker Premium", price: 425000, cost_price: 290000, stock: 60, stock_reserved: 2, stock_available: 58, min_stock_threshold: 15, category: "Accessories", unit_of_measure: "unit", status: "active", is_low_stock: false, description: "4K HDMI, 100W Power Delivery, SD/microSD, 2x USB-A" },
];

export const MOCK_MOVEMENTS: StockMovementItem[] = [
  {
    id: "mov-01",
    product_id: "4120ce5d-ac77-45f1-bd50-c5bc5d2725ad",
    movement_type: "INBOUND_RECEIVING",
    quantity: 12,
    reference_id: "PO-2026-001",
    previous_available: 0,
    new_available: 12,
    reason: "Inbound vendor delivery shipment",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: "mov-02",
    product_id: "4120ce5d-ac77-45f1-bd50-c5bc5d2725ad",
    movement_type: "SAGA_RESERVE",
    quantity: 10,
    reference_id: "ord-8f92a104",
    previous_available: 12,
    new_available: 2,
    reason: "Saga reservation for batch order",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export const MOCK_LOCATIONS: WarehouseLocationItem[] = [
  { id: "loc-01", warehouse_name: "Main Fulfillment Hub", zone: "ZONE-A", rack: "R01", shelf: "S01", bin: "B01" },
  { id: "loc-02", warehouse_name: "Main Fulfillment Hub", zone: "ZONE-A", rack: "R01", shelf: "S01", bin: "B02" },
  { id: "loc-03", warehouse_name: "Main Fulfillment Hub", zone: "ZONE-B", rack: "R02", shelf: "S02", bin: "B01" },
  { id: "loc-04", warehouse_name: "Main Fulfillment Hub", zone: "ZONE-C", rack: "R03", shelf: "S01", bin: "B01" },
];

export class ProductService {
  static isMock(): boolean {
    return process.env.NEXT_PUBLIC_USE_MOCK === "true";
  }

  static async getProducts(params?: { search?: string; category?: string; status?: string }): Promise<ProductItem[]> {
    if (this.isMock()) {
      let filtered = [...MOCK_PRODUCTS];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
      }
      if (params?.category) {
        filtered = filtered.filter((p) => p.category === params.category);
      }
      return filtered;
    }

    const res = await api.get('/products', { params });
    const data = res.data.products ?? res.data;
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        id: item.id,
        sku: item.sku || `SKU-${item.id.slice(0, 8).toUpperCase()}`,
        name: item.name,
        description: item.description || '',
        category: item.category || 'General Hardware',
        unit_of_measure: item.unit_of_measure || 'unit',
        price: Number(item.price),
        cost_price: Number(item.cost_price ?? 0),
        stock: Number(item.stock ?? (item.stock_available ?? 0) + (item.stock_reserved ?? 0)),
        stock_reserved: Number(item.stock_reserved ?? 0),
        stock_available: Number(item.stock_available ?? item.stock ?? 0),
        min_stock_threshold: Number(item.min_stock_threshold ?? 5),
        status: item.status || 'active',
        is_low_stock: Boolean(item.is_low_stock ?? ((item.stock_available ?? 0) <= (item.min_stock_threshold ?? 5))),
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    }
    return [];
  }

  static async getProductById(id: string): Promise<ProductItem | null> {
    if (this.isMock()) {
      return MOCK_PRODUCTS.find((p) => p.id === id) || null;
    }
    const res = await api.get(`/products/${id}`);
    const item = res.data.product ?? res.data;
    if (!item) return null;
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      category: item.category,
      unit_of_measure: item.unit_of_measure,
      price: Number(item.price),
      cost_price: Number(item.cost_price ?? 0),
      stock: Number(item.stock ?? (item.stock_available ?? 0) + (item.stock_reserved ?? 0)),
      stock_reserved: Number(item.stock_reserved ?? 0),
      stock_available: Number(item.stock_available ?? item.stock ?? 0),
      min_stock_threshold: Number(item.min_stock_threshold ?? 5),
      status: item.status || 'active',
      is_low_stock: Boolean(item.is_low_stock),
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  static async createProduct(payload: {
    sku?: string;
    name: string;
    description?: string;
    category?: string;
    unit_of_measure?: string;
    price: number;
    cost_price?: number;
    initial_stock?: number;
    min_stock_threshold?: number;
  }): Promise<ProductItem> {
    if (this.isMock()) {
      const stock = payload.initial_stock ?? 0;
      const newItem: ProductItem = {
        id: `prod-${Date.now()}`,
        sku: payload.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
        name: payload.name,
        description: payload.description || '',
        category: payload.category || 'General Hardware',
        unit_of_measure: payload.unit_of_measure || 'unit',
        price: payload.price,
        cost_price: payload.cost_price ?? 0,
        stock,
        stock_reserved: 0,
        stock_available: stock,
        min_stock_threshold: payload.min_stock_threshold ?? 5,
        status: 'active',
        is_low_stock: stock <= (payload.min_stock_threshold ?? 5),
      };
      MOCK_PRODUCTS.unshift(newItem);
      return newItem;
    }
    const res = await api.post('/products', payload);
    return res.data.product ?? res.data;
  }

  static async updateProduct(id: string, payload: Partial<ProductItem>): Promise<void> {
    if (this.isMock()) {
      const p = MOCK_PRODUCTS.find((item) => item.id === id);
      if (p) {
        Object.assign(p, payload);
      }
      return;
    }
    await api.put(`/products/${id}`, payload);
  }

  static async deleteProduct(id: string): Promise<void> {
    if (this.isMock()) {
      const idx = MOCK_PRODUCTS.findIndex((item) => item.id === id);
      if (idx !== -1) MOCK_PRODUCTS.splice(idx, 1);
      return;
    }
    await api.delete(`/products/${id}`);
  }

  static async restockProduct(id: string, qty: number): Promise<void> {
    if (this.isMock()) {
      const p = MOCK_PRODUCTS.find((item) => item.id === id);
      if (p) {
        p.stock += qty;
        p.stock_available += qty;
      }
      return;
    }
    await api.post(`/products/${id}/restock`, { quantity: qty });
  }

  static async receiveStock(payload: {
    product_id: string;
    quantity: number;
    location_id?: string;
    reference_id?: string;
    reason?: string;
  }): Promise<any> {
    if (this.isMock()) {
      const p = MOCK_PRODUCTS.find((item) => item.id === payload.product_id);
      if (p) {
        p.stock += payload.quantity;
        p.stock_available += payload.quantity;
      }
      return { message: "Inbound shipment recorded in mock mode" };
    }
    const res = await api.post('/inventory/receiving', payload);
    return res.data;
  }

  static async adjustStock(payload: {
    product_id: string;
    new_quantity: number;
    reason: string;
    reference_id?: string;
  }): Promise<any> {
    if (this.isMock()) {
      const p = MOCK_PRODUCTS.find((item) => item.id === payload.product_id);
      if (p) {
        p.stock_available = payload.new_quantity;
        p.stock = p.stock_available + p.stock_reserved;
      }
      return { message: "Stock adjusted in mock mode" };
    }
    const res = await api.post('/inventory/adjust', payload);
    return res.data;
  }

  static async transferStock(payload: {
    product_id: string;
    from_location_id?: string;
    to_location_id?: string;
    quantity: number;
    reason?: string;
  }): Promise<any> {
    if (this.isMock()) {
      return { message: "Transfer recorded in mock mode" };
    }
    const res = await api.post('/inventory/transfer', payload);
    return res.data;
  }

  static async getMovements(limit = 50): Promise<StockMovementItem[]> {
    if (this.isMock()) {
      return MOCK_MOVEMENTS;
    }
    const res = await api.get('/inventory/movements', { params: { limit } });
    return res.data.movements ?? res.data ?? [];
  }

  static async getLocations(): Promise<WarehouseLocationItem[]> {
    if (this.isMock()) {
      return MOCK_LOCATIONS;
    }
    const res = await api.get('/inventory/locations');
    return res.data.locations ?? res.data ?? [];
  }

  static async createLocation(payload: {
    warehouse_name?: string;
    zone: string;
    rack: string;
    shelf: string;
    bin: string;
  }): Promise<WarehouseLocationItem> {
    if (this.isMock()) {
      const newLoc: WarehouseLocationItem = {
        id: `loc-${Date.now()}`,
        warehouse_name: payload.warehouse_name || "Main Fulfillment Hub",
        zone: payload.zone,
        rack: payload.rack,
        shelf: payload.shelf,
        bin: payload.bin,
      };
      MOCK_LOCATIONS.push(newLoc);
      return newLoc;
    }
    const res = await api.post('/inventory/locations', payload);
    return res.data.location ?? res.data;
  }
}

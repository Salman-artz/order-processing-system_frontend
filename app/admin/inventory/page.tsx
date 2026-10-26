"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductService, ProductItem, StockMovementItem, WarehouseLocationItem } from "@/services/product.service";
import { toast } from "sonner";
import { 
  Package, 
  Plus, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  History, 
  X,
  ArrowRightLeft,
  Truck,
  MapPin,
  ClipboardList,
  AlertTriangle
} from "lucide-react";
import clsx from "clsx";

type TabType = "catalog" | "receiving" | "adjust" | "transfer" | "movements" | "locations";

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("catalog");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modals
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [restockProduct, setRestockProduct] = useState<ProductItem | null>(null);
  const [restockQty, setRestockQty] = useState("10");

  // Form states: New Product
  const [newProd, setNewProd] = useState({
    sku: "",
    name: "",
    category: "Components",
    unit_of_measure: "unit",
    price: "",
    cost_price: "",
    initial_stock: "10",
    min_stock_threshold: "5",
    description: "",
  });

  // Form states: Receiving
  const [receiveForm, setReceiveForm] = useState({
    product_id: "",
    quantity: "10",
    location_id: "",
    reference_id: "PO-" + new Date().getFullYear() + "-001",
    reason: "Inbound vendor purchase order shipment",
  });

  // Form states: Adjustment
  const [adjustForm, setAdjustForm] = useState({
    product_id: "",
    new_quantity: "0",
    reference_id: "ADJ-" + Date.now().toString().slice(-4),
    reason: "",
  });

  // Form states: Transfer
  const [transferForm, setTransferForm] = useState({
    product_id: "",
    from_location_id: "",
    to_location_id: "",
    quantity: "1",
    reason: "Zone replenishment transfer",
  });

  // Form states: Location
  const [locForm, setLocForm] = useState({
    warehouse_name: "Main Fulfillment Hub",
    zone: "ZONE-A",
    rack: "R01",
    shelf: "S01",
    bin: "B01",
  });

  // 1. Fetch Products
  const { data: products = [], isLoading: isProdsLoading } = useQuery<ProductItem[]>({
    queryKey: ["admin-products"],
    queryFn: () => ProductService.getProducts(),
    staleTime: 15_000,
  });

  // 2. Fetch Movements
  const { data: movements = [] } = useQuery<StockMovementItem[]>({
    queryKey: ["admin-movements"],
    queryFn: () => ProductService.getMovements(50),
    staleTime: 15_000,
    enabled: activeTab === "movements",
  });

  // 3. Fetch Locations
  const { data: locations = [] } = useQuery<WarehouseLocationItem[]>({
    queryKey: ["admin-locations"],
    queryFn: () => ProductService.getLocations(),
    staleTime: 30_000,
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async () => {
      return ProductService.createProduct({
        sku: newProd.sku || undefined,
        name: newProd.name,
        category: newProd.category,
        unit_of_measure: newProd.unit_of_measure,
        price: parseFloat(newProd.price) || 0,
        cost_price: parseFloat(newProd.cost_price) || 0,
        initial_stock: parseInt(newProd.initial_stock) || 0,
        min_stock_threshold: parseInt(newProd.min_stock_threshold) || 5,
        description: newProd.description,
      });
    },
    onSuccess: () => {
      toast.success("Product SKU registered successfully!");
      setShowCreateProduct(false);
      setNewProd({
        sku: "",
        name: "",
        category: "Components",
        unit_of_measure: "unit",
        price: "",
        cost_price: "",
        initial_stock: "10",
        min_stock_threshold: "5",
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to create product");
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async () => {
      return ProductService.receiveStock({
        product_id: receiveForm.product_id,
        quantity: parseInt(receiveForm.quantity) || 1,
        location_id: receiveForm.location_id || undefined,
        reference_id: receiveForm.reference_id,
        reason: receiveForm.reason,
      });
    },
    onSuccess: () => {
      toast.success("Inbound goods received into inventory!");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-movements"] });
      setActiveTab("catalog");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to receive goods");
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!adjustForm.reason) throw new Error("Adjustment reason is mandatory for audit trail");
      return ProductService.adjustStock({
        product_id: adjustForm.product_id,
        new_quantity: parseInt(adjustForm.new_quantity) || 0,
        reason: adjustForm.reason,
        reference_id: adjustForm.reference_id,
      });
    },
    onSuccess: () => {
      toast.success("Inventory balance adjusted and audited!");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-movements"] });
      setActiveTab("catalog");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to adjust stock");
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      return ProductService.transferStock({
        product_id: transferForm.product_id,
        from_location_id: transferForm.from_location_id || undefined,
        to_location_id: transferForm.to_location_id || undefined,
        quantity: parseInt(transferForm.quantity) || 1,
        reason: transferForm.reason,
      });
    },
    onSuccess: () => {
      toast.success("Stock relocated to destination storage bin!");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-movements"] });
      setActiveTab("catalog");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to transfer stock");
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async () => {
      return ProductService.createLocation(locForm);
    },
    onSuccess: () => {
      toast.success("Warehouse location registered!");
      setShowCreateLocation(false);
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to register location");
    },
  });

  const restockMutation = useMutation({
    mutationFn: async ({ id, qty }: { id: string; qty: number }) => {
      await ProductService.restockProduct(id, qty);
    },
    onSuccess: () => {
      toast.success("Stock replenished successfully!");
      setRestockProduct(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => {
      toast.error("Failed to replenish stock");
    },
  });

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter ? p.category === categoryFilter : true;
    return matchesSearch && matchesCat;
  });

  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const totalReserved = products.reduce((acc, p) => acc + p.stock_reserved, 0);
  const totalAvailable = products.reduce((acc, p) => acc + p.stock_available, 0);

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Restock Quick Modal */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-panel border border-border rounded p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="tech-data font-bold text-sm text-text-main flex items-center gap-2">
                <RotateCcw size={15} className="text-interactive" />
                Quick Restock SKU
              </h3>
              <button onClick={() => setRestockProduct(null)} className="text-text-muted hover:text-text-main">
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-text-muted">
              Replenishing: <strong className="text-text-main">{restockProduct.name}</strong>
            </div>
            <div className="space-y-1.5 text-xs">
              <label className="text-text-dim text-[11px] block">Additional Units</label>
              <input
                type="number"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                min="1"
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setRestockProduct(null)}
                className="px-3 py-1.5 rounded bg-card border border-border text-text-muted hover:text-text-main"
              >
                Cancel
              </button>
              <button
                onClick={() => restockMutation.mutate({ id: restockProduct.id, qty: parseInt(restockQty) || 10 })}
                className="px-3 py-1.5 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 font-bold"
              >
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-panel border border-border rounded p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="tech-data font-bold text-sm text-text-main flex items-center gap-2">
                <Package size={15} className="text-interactive" />
                Register New Warehouse SKU
              </h3>
              <button onClick={() => setShowCreateProduct(false)} className="text-text-muted hover:text-text-main">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-text-dim text-[10px] block mb-1">SKU Code (Auto if blank)</label>
                <input
                  type="text"
                  placeholder="e.g. SKU-SSD-2TB"
                  value={newProd.sku}
                  onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
              <div>
                <label className="text-text-dim text-[10px] block mb-1">Product Name *</label>
                <input
                  type="text"
                  placeholder="Item name..."
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
              <div>
                <label className="text-text-dim text-[10px] block mb-1">Category</label>
                <select
                  value={newProd.category}
                  onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                >
                  <option value="Components">Components</option>
                  <option value="Audio">Audio</option>
                  <option value="Computers">Computers</option>
                  <option value="Peripherals">Peripherals</option>
                  <option value="Monitors">Monitors</option>
                  <option value="Storage">Storage</option>
                  <option value="Accessories">Accessories</option>
                  <option value="General Hardware">General Hardware</option>
                </select>
              </div>
              <div>
                <label className="text-text-dim text-[10px] block mb-1">Unit of Measure</label>
                <input
                  type="text"
                  value={newProd.unit_of_measure}
                  onChange={(e) => setNewProd({ ...newProd, unit_of_measure: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
              <div>
                <label className="text-text-dim text-[10px] block mb-1">Selling Price (IDR) *</label>
                <input
                  type="number"
                  placeholder="1000000"
                  value={newProd.price}
                  onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
              <div>
                <label className="text-text-dim text-[10px] block mb-1">Cost Price (IDR)</label>
                <input
                  type="number"
                  placeholder="800000"
                  value={newProd.cost_price}
                  onChange={(e) => setNewProd({ ...newProd, cost_price: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
              <div>
                <label className="text-text-dim text-[10px] block mb-1">Initial Stock</label>
                <input
                  type="number"
                  value={newProd.initial_stock}
                  onChange={(e) => setNewProd({ ...newProd, initial_stock: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
              <div>
                <label className="text-text-dim text-[10px] block mb-1">Min Threshold Alert</label>
                <input
                  type="number"
                  value={newProd.min_stock_threshold}
                  onChange={(e) => setNewProd({ ...newProd, min_stock_threshold: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
            </div>
            <div>
              <label className="text-text-dim text-[10px] block mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Product specifications..."
                value={newProd.description}
                onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-text-main focus:outline-none focus:border-interactive text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowCreateProduct(false)}
                className="px-3 py-1.5 rounded bg-card border border-border text-text-muted hover:text-text-main"
              >
                Cancel
              </button>
              <button
                disabled={!newProd.name || !newProd.price || createProductMutation.isPending}
                onClick={() => createProductMutation.mutate()}
                className="px-3 py-1.5 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 font-bold disabled:opacity-50"
              >
                Register SKU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Location Modal */}
      {showCreateLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-panel border border-border rounded p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="tech-data font-bold text-sm text-text-main flex items-center gap-2">
                <MapPin size={15} className="text-interactive" />
                Add Warehouse Location Bin
              </h3>
              <button onClick={() => setShowCreateLocation(false)} className="text-text-muted hover:text-text-main">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-text-dim text-[10px] block mb-1">Zone (e.g. ZONE-A)</label>
                <input
                  type="text"
                  value={locForm.zone}
                  onChange={(e) => setLocForm({ ...locForm, zone: e.target.value })}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-text-dim text-[10px] block mb-1">Rack</label>
                  <input
                    type="text"
                    value={locForm.rack}
                    onChange={(e) => setLocForm({ ...locForm, rack: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                  />
                </div>
                <div>
                  <label className="text-text-dim text-[10px] block mb-1">Shelf</label>
                  <input
                    type="text"
                    value={locForm.shelf}
                    onChange={(e) => setLocForm({ ...locForm, shelf: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                  />
                </div>
                <div>
                  <label className="text-text-dim text-[10px] block mb-1">Bin</label>
                  <input
                    type="text"
                    value={locForm.bin}
                    onChange={(e) => setLocForm({ ...locForm, bin: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-text-main focus:outline-none focus:border-interactive"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowCreateLocation(false)}
                className="px-3 py-1.5 rounded bg-card border border-border text-text-muted hover:text-text-main"
              >
                Cancel
              </button>
              <button
                onClick={() => createLocationMutation.mutate()}
                className="px-3 py-1.5 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 font-bold"
              >
                Save Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="heading text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <Package size={18} className="text-interactive" />
            WarehouseFlow Operations & Stock Ledger
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real inventory transactions, location assignments, inbound receiving, and Saga reservations
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowCreateProduct(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 font-bold transition-all shadow-xs"
          >
            <Plus size={14} />
            <span>New SKU Item</span>
          </button>
          <button
            onClick={() => setShowCreateLocation(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-card border border-border text-text-muted hover:text-text-main hover:border-interactive transition-all"
          >
            <MapPin size={14} />
            <span>Add Storage Bin</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>PHYSICAL ON-HAND STOCK</span>
            <Layers size={14} className="text-interactive" />
          </div>
          <div className="text-lg font-bold text-text-main tech-data">{totalStock} Units</div>
          <div className="text-[10px] text-text-muted">Total inventory physically in warehouse</div>
        </div>

        <div className="p-3 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>AVAILABLE INVENTORY</span>
            <CheckCircle2 size={14} className="text-success" />
          </div>
          <div className="text-lg font-bold text-success tech-data">{totalAvailable} Units</div>
          <div className="text-[10px] text-text-muted"><code>available = on_hand - reserved</code></div>
        </div>

        <div className="p-3 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>SAGA RESERVED</span>
            <RotateCcw size={14} className="text-interactive" />
          </div>
          <div className="text-lg font-bold text-interactive tech-data">{totalReserved} Units</div>
          <div className="text-[10px] text-text-muted">Allocated to pending Saga order transactions</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border text-xs">
        <button
          onClick={() => setActiveTab("catalog")}
          className={clsx(
            "px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5",
            activeTab === "catalog" ? "border-interactive text-interactive" : "border-transparent text-text-muted hover:text-text-main"
          )}
        >
          <Package size={14} />
          SKU Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("receiving")}
          className={clsx(
            "px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5",
            activeTab === "receiving" ? "border-interactive text-interactive" : "border-transparent text-text-muted hover:text-text-main"
          )}
        >
          <Truck size={14} />
          Inbound Receiving
        </button>
        <button
          onClick={() => setActiveTab("adjust")}
          className={clsx(
            "px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5",
            activeTab === "adjust" ? "border-interactive text-interactive" : "border-transparent text-text-muted hover:text-text-main"
          )}
        >
          <ClipboardList size={14} />
          Stock Adjustment
        </button>
        <button
          onClick={() => setActiveTab("transfer")}
          className={clsx(
            "px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5",
            activeTab === "transfer" ? "border-interactive text-interactive" : "border-transparent text-text-muted hover:text-text-main"
          )}
        >
          <ArrowRightLeft size={14} />
          Location Transfer
        </button>
        <button
          onClick={() => setActiveTab("movements")}
          className={clsx(
            "px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5",
            activeTab === "movements" ? "border-interactive text-interactive" : "border-transparent text-text-muted hover:text-text-main"
          )}
        >
          <History size={14} />
          Audit Ledger ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab("locations")}
          className={clsx(
            "px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5",
            activeTab === "locations" ? "border-interactive text-interactive" : "border-transparent text-text-muted hover:text-text-main"
          )}
        >
          <MapPin size={14} />
          Storage Bins ({locations.length})
        </button>
      </div>

      {/* TAB 1: SKU Catalog */}
      {activeTab === "catalog" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search SKU or name..."
                  className="w-full bg-panel border border-border rounded px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-interactive pl-8"
                />
                <Search size={13} className="absolute left-2.5 top-2 text-text-dim" />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-panel border border-border rounded px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-interactive"
              >
                <option value="">All Categories</option>
                <option value="Components">Components</option>
                <option value="Audio">Audio</option>
                <option value="Computers">Computers</option>
                <option value="Peripherals">Peripherals</option>
                <option value="Monitors">Monitors</option>
                <option value="Storage">Storage</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
            <div className="text-[11px] text-text-dim">
              Showing {filteredProducts.length} hardware items
            </div>
          </div>

          <div className="rounded bg-panel border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-card/70 border-b border-border text-[10px] text-text-dim uppercase">
                  <tr>
                    <th className="py-2.5 px-3">SKU / Item</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3 text-center">On-Hand</th>
                    <th className="py-2.5 px-3 text-center">Available</th>
                    <th className="py-2.5 px-3 text-center">Reserved</th>
                    <th className="py-2.5 px-3 text-center">Stock Level</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock_available <= (p.min_stock_threshold || 5);
                    const hasLocks = p.stock_reserved > 0;

                    return (
                      <tr key={p.id} className="hover:bg-card/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-text-main">{p.name}</div>
                          <div className="text-[10px] text-text-dim font-mono">{p.sku || p.id}</div>
                        </td>
                        <td className="py-2.5 px-3 text-text-muted">{p.category || "General"}</td>
                        <td className="py-2.5 px-3 font-semibold text-text-main">
                          Rp {p.price.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-text-main">
                          {p.stock}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-success">
                          {p.stock_available}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-interactive">
                          <span className={clsx("px-1.5 py-0.5 rounded border text-[11px]", hasLocks ? "bg-interactive/15 border-interactive/40 text-interactive" : "border-border text-text-dim")}>
                            {p.stock_reserved}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={clsx(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                            isLow ? "bg-failed/15 border-failed/40 text-failed" : "bg-success/15 border-success/40 text-success"
                          )}>
                            {isLow ? "LOW STOCK" : "OPTIMAL"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setRestockProduct(p)}
                            className="px-2.5 py-1 rounded bg-card border border-border text-text-muted hover:text-text-main hover:border-interactive transition-colors text-[11px] font-semibold"
                          >
                            Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Inbound Receiving */}
      {activeTab === "receiving" && (
        <div className="p-4 rounded bg-panel border border-border space-y-4 max-w-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-text-main">
            <Truck size={16} className="text-interactive" />
            Inbound Purchase Order Receiving
          </div>
          <p className="text-xs text-text-muted">
            Physically accept delivered shipments from vendors and replenish inventory ledger.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-text-dim text-[11px] block mb-1">Target Product SKU *</label>
              <select
                value={receiveForm.product_id}
                onChange={(e) => setReceiveForm({ ...receiveForm, product_id: e.target.value })}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku || p.id.slice(0, 8)}) — Current: {p.stock_available}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-text-dim text-[11px] block mb-1">Quantity Received *</label>
                <input
                  type="number"
                  min="1"
                  value={receiveForm.quantity}
                  onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
              <div>
                <label className="text-text-dim text-[11px] block mb-1">Storage Location Bin</label>
                <select
                  value={receiveForm.location_id}
                  onChange={(e) => setReceiveForm({ ...receiveForm, location_id: e.target.value })}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
                >
                  <option value="">-- Main Floor / Unassigned --</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.zone} / {l.rack}-{l.shelf}-{l.bin}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-text-dim text-[11px] block mb-1">PO or Shipment Reference</label>
              <input
                type="text"
                value={receiveForm.reference_id}
                onChange={(e) => setReceiveForm({ ...receiveForm, reference_id: e.target.value })}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
              />
            </div>

            <div>
              <label className="text-text-dim text-[11px] block mb-1">Inspection & Receiving Notes</label>
              <input
                type="text"
                value={receiveForm.reason}
                onChange={(e) => setReceiveForm({ ...receiveForm, reason: e.target.value })}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
              />
            </div>

            <button
              disabled={!receiveForm.product_id || receiveMutation.isPending}
              onClick={() => receiveMutation.mutate()}
              className="px-4 py-2 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 font-bold disabled:opacity-50"
            >
              Confirm Goods Receipt
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Stock Adjustment */}
      {activeTab === "adjust" && (
        <div className="p-4 rounded bg-panel border border-border space-y-4 max-w-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-text-main">
            <ClipboardList size={16} className="text-interactive" />
            Physical Cycle Count Adjustment
          </div>
          <p className="text-xs text-text-muted">
            Reconcile physical warehouse stock with ledger balance. Mandatory audit reason required.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-text-dim text-[11px] block mb-1">Target Product SKU *</label>
              <select
                value={adjustForm.product_id}
                onChange={(e) => {
                  const p = products.find(x => x.id === e.target.value);
                  setAdjustForm({
                    ...adjustForm,
                    product_id: e.target.value,
                    new_quantity: p ? p.stock_available.toString() : "0"
                  });
                }}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku || p.id.slice(0, 8)}) — Current Available: {p.stock_available}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-text-dim text-[11px] block mb-1">New Physical Available *</label>
                <input
                  type="number"
                  min="0"
                  value={adjustForm.new_quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, new_quantity: e.target.value })}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
              <div>
                <label className="text-text-dim text-[11px] block mb-1">Audit Batch Reference</label>
                <input
                  type="text"
                  value={adjustForm.reference_id}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reference_id: e.target.value })}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
                />
              </div>
            </div>

            <div>
              <label className="text-text-dim text-[11px] block mb-1">Mandatory Audit Reason *</label>
              <input
                type="text"
                placeholder="e.g. Q3 Cycle Count variance, Damaged box write-off"
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
              />
            </div>

            <button
              disabled={!adjustForm.product_id || !adjustForm.reason || adjustMutation.isPending}
              onClick={() => adjustMutation.mutate()}
              className="px-4 py-2 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 font-bold disabled:opacity-50"
            >
              Post Stock Adjustment
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Location Transfer */}
      {activeTab === "transfer" && (
        <div className="p-4 rounded bg-panel border border-border space-y-4 max-w-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-text-main">
            <ArrowRightLeft size={16} className="text-interactive" />
            Internal Location Transfer
          </div>
          <p className="text-xs text-text-muted">
            Relocate goods between warehouse zones, racks, or picking bins.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-text-dim text-[11px] block mb-1">Product SKU *</label>
              <select
                value={transferForm.product_id}
                onChange={(e) => setTransferForm({ ...transferForm, product_id: e.target.value })}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku || p.id.slice(0, 8)}) — Available: {p.stock_available}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-text-dim text-[11px] block mb-1">Source Location</label>
                <select
                  value={transferForm.from_location_id}
                  onChange={(e) => setTransferForm({ ...transferForm, from_location_id: e.target.value })}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
                >
                  <option value="">-- Origin Bin / Receiving Area --</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.zone} / {l.rack}-{l.shelf}-{l.bin}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-text-dim text-[11px] block mb-1">Destination Location *</label>
                <select
                  value={transferForm.to_location_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_location_id: e.target.value })}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
                >
                  <option value="">-- Destination Picking Bin --</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.zone} / {l.rack}-{l.shelf}-{l.bin}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-text-dim text-[11px] block mb-1">Transfer Quantity *</label>
              <input
                type="number"
                min="1"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
              />
            </div>

            <div>
              <label className="text-text-dim text-[11px] block mb-1">Reason / Notes</label>
              <input
                type="text"
                value={transferForm.reason}
                onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive"
              />
            </div>

            <button
              disabled={!transferForm.product_id || transferMutation.isPending}
              onClick={() => transferMutation.mutate()}
              className="px-4 py-2 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 font-bold disabled:opacity-50"
            >
              Execute Stock Transfer
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: Audit Ledger Movements */}
      {activeTab === "movements" && (
        <div className="rounded bg-panel border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-card/70 border-b border-border text-[10px] text-text-dim uppercase">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Movement Type</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-center">Diff Qty</th>
                  <th className="py-2.5 px-3 text-center">Balance Transition</th>
                  <th className="py-2.5 px-3">Reference / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {movements.map((m) => {
                  const prod = products.find(p => p.id === m.product_id);
                  const isPositive = m.new_available > m.previous_available;

                  return (
                    <tr key={m.id} className="hover:bg-card/80 transition-colors">
                      <td className="py-2.5 px-3 text-text-muted text-[11px]">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase",
                          m.movement_type.includes("RECEIVING") ? "bg-success/15 border-success/40 text-success" :
                          m.movement_type.includes("RESERVE") ? "bg-interactive/15 border-interactive/40 text-interactive" :
                          m.movement_type.includes("RELEASE") ? "bg-interactive/15 border-interactive/40 text-interactive" :
                          "bg-card border-border text-text-main"
                        )}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-text-main font-semibold">
                        {prod ? prod.name : m.product_id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className={isPositive ? "text-success" : "text-failed"}>
                          {isPositive ? `+${m.quantity}` : `${m.quantity}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-text-dim">
                        {m.previous_available} → <strong className="text-text-main">{m.new_available}</strong>
                      </td>
                      <td className="py-2.5 px-3 text-text-muted text-[11px]">
                        <div><strong className="text-text-main">{m.reference_id || "–"}</strong></div>
                        <div>{m.reason}</div>
                      </td>
                    </tr>
                  );
                })}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-muted text-xs">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: Locations */}
      {activeTab === "locations" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="p-3.5 rounded bg-panel border border-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-interactive text-sm">{loc.zone}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-border text-text-dim font-mono">
                  {loc.warehouse_name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-mono">
                <div className="p-1 rounded bg-background border border-border">
                  <span className="block text-text-dim text-[9px]">RACK</span>
                  <span className="text-text-main font-bold">{loc.rack}</span>
                </div>
                <div className="p-1 rounded bg-background border border-border">
                  <span className="block text-text-dim text-[9px]">SHELF</span>
                  <span className="text-text-main font-bold">{loc.shelf}</span>
                </div>
                <div className="p-1 rounded bg-background border border-border">
                  <span className="block text-text-dim text-[9px]">BIN</span>
                  <span className="text-text-main font-bold">{loc.bin}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

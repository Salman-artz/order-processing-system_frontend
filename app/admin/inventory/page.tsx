"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { toast } from "sonner";
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  TrendingUp,
  X
} from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  stock_available: number;
  stock_reserved: number;
  stock: number;
  price: number;
}

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStock, setFilterStock] = useState<"all" | "low" | "out">("all");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [restockProduct, setRestockProduct] = useState<ProductItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({ name: "", price: "", stock: "" });
  const [editForm, setEditForm] = useState({ name: "", price: "" });
  const [restockQty, setRestockQty] = useState("10");

  // Fetch Products
  const { data: products = [], isLoading, isError, refetch } = useQuery<ProductItem[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await api.get("/products");
      return res.data.products ?? res.data;
    },
  });

  // Create Product Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; price: number; stock: number }) => {
      return await api.post("/products", payload);
    },
    onSuccess: () => {
      toast.success("Product created successfully!");
      setIsAddOpen(false);
      setAddForm({ name: "", price: "", stock: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create product");
    },
  });

  // Update Product Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, price }: { id: string; name: string; price: number }) => {
      return await api.put(`/products/${id}`, { name, price });
    },
    onSuccess: () => {
      toast.success("Product updated successfully!");
      setEditingProduct(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update product");
    },
  });

  // Restock Mutation
  const restockMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      try {
        return await api.patch(`/products/${id}/stock`, { quantity });
      } catch (e) {
        return await api.post(`/products/${id}/restock`, { quantity });
      }
    },
    onSuccess: () => {
      toast.success("Stock replenished successfully!");
      setRestockProduct(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to restock product");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      toast.success("Product deleted successfully!");
      setDeletingProduct(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete product");
    },
  });

  // Filtered products
  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    const available = p.stock_available ?? p.stock ?? 0;
    if (filterStock === "low") return available > 0 && available <= 10;
    if (filterStock === "out") return available === 0;
    return true;
  });

  // Calculations
  const totalProducts = products.length;
  const totalAvailableStock = products.reduce((sum, p) => sum + (p.stock_available ?? p.stock ?? 0), 0);
  const totalReservedStock = products.reduce((sum, p) => sum + (p.stock_reserved ?? 0), 0);
  const lowStockCount = products.filter((p) => (p.stock_available ?? p.stock ?? 0) <= 10).length;

  return (
    <div className="space-y-8" data-testid="admin-inventory-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading text-3xl font-bold text-text-main flex items-center gap-3">
            <Package className="text-interactive" size={32} />
            Inventory & Stock Management
          </h1>
          <p className="text-text-muted mt-1">
            Manage product catalog, pricing, and live inventory levels across services.
          </p>
        </div>
        <button
          data-testid="btn-add-product"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 bg-interactive hover:bg-interactive-hover text-background px-4 py-2.5 rounded-lg font-semibold transition-all shadow-sm shadow-interactive/20 cursor-pointer"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-panel border border-border p-5 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-interactive/10 flex items-center justify-center text-interactive">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Total SKUs</p>
            <p className="text-2xl font-bold text-text-main mt-0.5" data-testid="stat-total-skus">{totalProducts}</p>
          </div>
        </div>

        <div className="bg-panel border border-border p-5 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center text-success">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Available Stock</p>
            <p className="text-2xl font-bold text-success mt-0.5">{totalAvailableStock} units</p>
          </div>
        </div>

        <div className="bg-panel border border-border p-5 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Locked / Reserved</p>
            <p className="text-2xl font-bold text-warning mt-0.5">{totalReservedStock} units</p>
          </div>
        </div>

        <div className="bg-panel border border-border p-5 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-failed/10 flex items-center justify-center text-failed">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Low / Out of Stock</p>
            <p className="text-2xl font-bold text-failed mt-0.5">{lowStockCount} items</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-panel border border-border p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-inventory"
            className="w-full bg-background border border-border pl-9 pr-4 py-2 rounded-lg text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-interactive"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterStock("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterStock === "all" ? "bg-interactive text-background" : "bg-background border border-border text-text-muted hover:text-text-main"
            }`}
          >
            All Stock
          </button>
          <button
            onClick={() => setFilterStock("low")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterStock === "low" ? "bg-warning text-background" : "bg-background border border-border text-text-muted hover:text-text-main"
            }`}
          >
            Low Stock (≤10)
          </button>
          <button
            onClick={() => setFilterStock("out")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterStock === "out" ? "bg-failed text-background" : "bg-background border border-border text-text-muted hover:text-text-main"
            }`}
          >
            Out of Stock (0)
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 bg-background border border-border hover:bg-border rounded-lg text-text-muted hover:text-text-main transition-colors ml-auto cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-text-muted">Loading inventory catalog...</div>
        ) : isError ? (
          <div className="p-12 text-center text-failed">Failed to fetch inventory catalog.</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-muted" data-testid="empty-inventory">
            No products found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="inventory-table">
              <thead className="bg-background border-b border-border text-xs uppercase font-semibold text-text-muted">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Available Stock</th>
                  <th className="px-6 py-4">Reserved Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => {
                  const available = p.stock_available ?? p.stock ?? 0;
                  const isLow = available > 0 && available <= 10;
                  const isOut = available === 0;

                  return (
                    <tr key={p.id} className="hover:bg-interactive/5 transition-colors" data-testid={`product-row-${p.id}`}>
                      <td className="px-6 py-4 font-semibold text-text-main">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-border flex items-center justify-center text-text-muted shrink-0">
                            <Package size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-text-main">{p.name}</p>
                            <p className="text-xs text-text-muted font-mono">{p.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-text-main">
                        Rp {Number(p.price).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        <span className={isOut ? "text-failed" : isLow ? "text-warning" : "text-success"}>
                          {available} units
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted font-medium">
                        {p.stock_reserved ?? 0} units
                      </td>
                      <td className="px-6 py-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-failed/10 text-failed border border-failed/20">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            data-testid={`btn-restock-${p.id}`}
                            onClick={() => {
                              setRestockProduct(p);
                              setRestockQty("10");
                            }}
                            className="flex items-center gap-1 bg-interactive/10 hover:bg-interactive/20 text-interactive px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Replenish stock"
                          >
                            <TrendingUp size={14} />
                            Restock
                          </button>
                          <button
                            data-testid={`btn-edit-${p.id}`}
                            onClick={() => {
                              setEditingProduct(p);
                              setEditForm({ name: p.name, price: String(p.price) });
                            }}
                            className="p-1.5 text-text-muted hover:text-text-main hover:bg-border rounded-lg transition-colors cursor-pointer"
                            title="Edit details"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            data-testid={`btn-delete-${p.id}`}
                            onClick={() => setDeletingProduct(p)}
                            className="p-1.5 text-text-muted hover:text-failed hover:bg-failed/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Add Product ────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="heading text-xl font-bold text-text-main">Add New Product</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-text-muted hover:text-text-main p-1">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  name: addForm.name,
                  price: parseFloat(addForm.price) || 0,
                  stock: parseInt(addForm.stock) || 0,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-text-muted mb-1.5">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mechanical Keyboard Pro"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  data-testid="input-add-product-name"
                  className="w-full bg-background border border-border px-3.5 py-2.5 rounded-lg text-sm text-text-main focus:outline-none focus:border-interactive"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-muted mb-1.5">Price (IDR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  placeholder="e.g. 1500000"
                  value={addForm.price}
                  onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                  data-testid="input-add-product-price"
                  className="w-full bg-background border border-border px-3.5 py-2.5 rounded-lg text-sm text-text-main focus:outline-none focus:border-interactive"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-muted mb-1.5">Initial Stock</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 50"
                  value={addForm.stock}
                  onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                  data-testid="input-add-product-stock"
                  className="w-full bg-background border border-border px-3.5 py-2.5 rounded-lg text-sm text-text-main focus:outline-none focus:border-interactive"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="btn-submit-add-product"
                  className="bg-interactive hover:bg-interactive-hover text-background px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Product ───────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="heading text-xl font-bold text-text-main">Edit Product Details</h3>
              <button onClick={() => setEditingProduct(null)} className="text-text-muted hover:text-text-main p-1">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate({
                  id: editingProduct.id,
                  name: editForm.name,
                  price: parseFloat(editForm.price) || 0,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-text-muted mb-1.5">Product Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  data-testid="input-edit-product-name"
                  className="w-full bg-background border border-border px-3.5 py-2.5 rounded-lg text-sm text-text-main focus:outline-none focus:border-interactive"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-muted mb-1.5">Price (IDR)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  data-testid="input-edit-product-price"
                  className="w-full bg-background border border-border px-3.5 py-2.5 rounded-lg text-sm text-text-main focus:outline-none focus:border-interactive"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="btn-submit-edit-product"
                  className="bg-interactive hover:bg-interactive-hover text-background px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Restock Product ────────────────────────────────────── */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="heading text-xl font-bold text-text-main">Replenish Stock</h3>
              <button onClick={() => setRestockProduct(null)} className="text-text-muted hover:text-text-main p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-background border border-border rounded-xl flex items-center justify-between">
              <div>
                <p className="font-semibold text-text-main">{restockProduct.name}</p>
                <p className="text-xs text-text-muted mt-0.5">Current available units</p>
              </div>
              <span className="text-xl font-bold text-interactive">
                {restockProduct.stock_available ?? restockProduct.stock ?? 0}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                restockMutation.mutate({
                  id: restockProduct.id,
                  quantity: parseInt(restockQty) || 0,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-text-muted mb-1.5">
                  Quantity to Add
                </label>
                <div className="flex gap-2 mb-2">
                  {[5, 10, 25, 50].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setRestockQty(String(qty))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        restockQty === String(qty)
                          ? "bg-interactive text-background"
                          : "bg-background border border-border text-text-muted hover:text-text-main"
                      }`}
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  data-testid="input-restock-qty"
                  className="w-full bg-background border border-border px-3.5 py-2.5 rounded-lg text-sm text-text-main focus:outline-none focus:border-interactive"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-main cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restockMutation.isPending}
                  data-testid="btn-submit-restock"
                  className="bg-interactive hover:bg-interactive-hover text-background px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {restockMutation.isPending ? "Replenishing..." : "Add Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ───────────────────────────────── */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-failed">
              <AlertTriangle size={24} />
              <h3 className="heading text-xl font-bold">Delete Product</h3>
            </div>

            <p className="text-sm text-text-muted">
              Are you sure you want to remove <span className="font-semibold text-text-main">{deletingProduct.name}</span> from the inventory? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 text-sm text-text-muted hover:text-text-main cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                data-testid="btn-confirm-delete"
                onClick={() => deleteMutation.mutate(deletingProduct.id)}
                className="bg-failed hover:bg-failed/90 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

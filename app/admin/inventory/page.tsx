"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductService, ProductItem } from "@/services/product.service";
import { toast } from "sonner";
import { 
  Package, 
  Plus, 
  RotateCcw, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  History, 
  X,
  Server
} from "lucide-react";
import clsx from "clsx";

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [restockProduct, setRestockProduct] = useState<ProductItem | null>(null);
  const [restockQty, setRestockQty] = useState("10");

  // Fetch Products via Domain Service
  const { data: products = [], isLoading } = useQuery<ProductItem[]>({
    queryKey: ["admin-products"],
    queryFn: () => ProductService.getProducts(),
    staleTime: 30_000,
  });

  // Restock Mutation
  const restockMutation = useMutation({
    mutationFn: async ({ id, qty }: { id: string; qty: number }) => {
      await ProductService.restockProduct(id, qty);
    },
    onSuccess: () => {
      toast.success("Stock replenished successfully!");
      setRestockProduct(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products-cockpit"] });
    },
    onError: () => {
      toast.error("Failed to replenish stock");
    },
  });

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const totalReserved = products.reduce((acc, p) => acc + p.stock_reserved, 0);
  const totalAvailable = products.reduce((acc, p) => acc + p.stock_available, 0);

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Restock Modal */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-panel border border-border rounded p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="tech-data font-bold text-sm text-text-main flex items-center gap-2">
                <RotateCcw size={15} className="text-interactive" />
                Restock SKU Inventory
              </h3>
              <button onClick={() => setRestockProduct(null)} className="text-text-muted hover:text-text-main">
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-text-muted">
              Replenishing inventory for: <strong className="text-text-main">{restockProduct.name}</strong>
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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="heading text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <Package size={18} className="text-interactive" />
            Inventory Stock Ledger & Saga Locks
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Distributed stock reservation and automated rollback compensation managed by <code>inventory-service</code>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border text-success font-semibold">
            <ShieldCheck size={13} className="text-success" />
            ISOLATED POSTGRESQL INSTANCE
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>TOTAL POSTGRES STOCK</span>
            <Layers size={14} className="text-interactive" />
          </div>
          <div className="text-lg font-bold text-text-main tech-data">{totalStock} Units</div>
          <div className="text-[10px] text-text-muted">Aggregated across all catalog SKUs</div>
        </div>

        <div className="p-3 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>AVAILABLE (UNLOCKED)</span>
            <CheckCircle2 size={14} className="text-success" />
          </div>
          <div className="text-lg font-bold text-success tech-data">{totalAvailable} Units</div>
          <div className="text-[10px] text-text-muted">Available for incoming checkout reservations</div>
        </div>

        <div className="p-3 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>RESERVED (SAGA LOCKS)</span>
            <RotateCcw size={14} className="text-interactive" />
          </div>
          <div className="text-lg font-bold text-interactive tech-data">{totalReserved} Units</div>
          <div className="text-[10px] text-text-muted">Subject to auto-rollback upon payment timeout/failure</div>
        </div>
      </div>

      {/* Rollback Compensation Architecture Banner */}
      <div className="p-3 rounded bg-card/60 border border-border text-xs space-y-1">
        <div className="flex items-center gap-2 text-interactive font-bold">
          <History size={14} />
          <span>SAGA TWO-PHASE ROLLBACK ARCHITECTURE IN INVENTORY:</span>
        </div>
        <p className="text-[11px] text-text-muted leading-relaxed">
          When an order is initialized, <code>inventory-service</code> increments <code>stock_reserved</code> and decrements <code>stock_available</code> within a PostgreSQL ACID transaction. 
          If a <code>payment.failed</code> NATS JetStream event arrives, the consumer instantly triggers a compensatory transaction: 
          <code>stock_reserved</code> is restored back into <code>stock_available</code> without human intervention.
        </p>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU name, component..."
            className="w-full bg-panel border border-border rounded px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-interactive pl-8"
          />
          <Search size={13} className="absolute left-2.5 top-2 text-text-dim" />
        </div>
        <div className="text-[11px] text-text-dim">
          Showing {filteredProducts.length} hardware items
        </div>
      </div>

      {/* Inventory Stock Table */}
      <div className="rounded bg-panel border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-card/70 border-b border-border text-[10px] text-text-dim uppercase">
              <tr>
                <th className="py-2.5 px-3">Hardware Component SKU</th>
                <th className="py-2.5 px-3">Price (IDR)</th>
                <th className="py-2.5 px-3 text-center">Total Stock</th>
                <th className="py-2.5 px-3 text-center">Available Stock</th>
                <th className="py-2.5 px-3 text-center">Reserved (Saga Lock)</th>
                <th className="py-2.5 px-3 text-center">Health Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredProducts.map((p) => {
                const isLow = p.stock_available <= 5;
                const hasLocks = p.stock_reserved > 0;

                return (
                  <tr key={p.id} className="hover:bg-card/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-text-main">{p.name}</div>
                      <div className="text-[10px] text-text-dim font-mono">{p.id}</div>
                    </td>
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
  );
}

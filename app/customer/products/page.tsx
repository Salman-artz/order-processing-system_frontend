"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductService, ProductItem } from "@/services/product.service";
import { OrderService } from "@/services/order.service";
import { SagaService, SagaEventItem, MicroserviceNode, TraceSpan } from "@/services/saga.service";
import TraceDrawer from "@/components/TraceDrawer";
import {
  Package,
  ShoppingCart,
  CheckCircle2,
  ArrowRight,
  Activity,
  Server,
  Terminal
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";

export default function OperationsCockpitPage() {
  const queryClient = useQueryClient();

  // Selected item in catalog
  const [selectedProductId, setSelectedProductId] = useState<string>("4120ce5d-ac77-45f1-bd50-c5bc5d2725ad");
  const [quantity, setQuantity] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastCorrelationId, setLastCorrelationId] = useState<string>("");

  // Trace Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerOrderId, setDrawerOrderId] = useState<string>("ord-8f92a104");
  const [drawerSpans, setDrawerSpans] = useState<TraceSpan[]>([]);
  const [drawerPayload, setDrawerPayload] = useState<Record<string, any>>({});

  // 1. Fetch Products via Domain Service (0 direct fetch in component)
  const { data: products = [], isLoading: isProductsLoading } = useQuery<ProductItem[]>({
    queryKey: ["products-cockpit"],
    queryFn: () => ProductService.getProducts(),
    staleTime: 60_000,
  });

  // 2. Fetch Microservices Node status via real health checks
  const { data: microservices = SagaService.getMicroservicesHealth() } = useQuery<MicroserviceNode[]>({
    queryKey: ["microservices-health-cockpit"],
    queryFn: () => SagaService.getMicroservicesHealthAsync(),
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  // 3. Live Events stream state
  const [events, setEvents] = useState<SagaEventItem[]>(SagaService.getSagaEvents());

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0] || null;
  const totalPrice = (selectedProduct?.price || 0) * quantity;

  // Order Mutation (Commit Flow)
  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;
      setIsSubmitting(true);

      const res = await OrderService.createOrder({
        items: [{ product_id: selectedProduct.id, quantity, price: selectedProduct.price }],
      });
      return res;
    },
    onSuccess: async (order: any) => {
      const orderId = order?.id || `ord-${Math.random().toString(36).substring(2, 6)}`;
      const corrId = `corr-${orderId.substring(0, 8)}`;
      setLastCorrelationId(corrId);

      // If connected to real backend, query real timeline after brief delay for saga completion
      if (process.env.NEXT_PUBLIC_USE_MOCK !== "true" && order?.id) {
        setIsSubmitting(false);

        const timeline = await OrderService.getOrderTimeline(order.id);
        if (timeline && timeline.length > 0) {
          const freshEvents: SagaEventItem[] = timeline.map((tl, idx) => {
            const timeDate = tl.createdAt ? new Date(tl.createdAt) : new Date();
            const timeStr = `${String(timeDate.getHours()).padStart(2, "0")}:${String(timeDate.getMinutes()).padStart(2, "0")}:${String(timeDate.getSeconds()).padStart(2, "0")}.${String(timeDate.getMilliseconds()).padStart(3, "0")}`;
            const evt = tl.eventType || "order.processed";
            const sSource = evt.includes("stock") || evt.includes("inventory") 
              ? "inventory-service" 
              : evt.includes("payment") 
              ? "payment-service" 
              : "order-service";
            return {
              id: `evt-${tl.id || Date.now()}-${idx}`,
              timestamp: timeStr,
              subject: evt,
              correlationId: corrId,
              serviceSource: sSource,
              status: evt.includes("failed") 
                ? "ROLLBACK" 
                : evt.includes("released") || evt.includes("cancel")
                ? "COMPENSATED"
                : "COMMITTED",
              latencyMs: 12 + idx * 8,
              payload: tl.payload || { order_id: order.id, event: evt },
            };
          });
          setEvents((prev) => [...freshEvents, ...prev]);
        }
        toast.success("Saga Choreography Committed!", {
          description: `Real Order ${order.id.substring(0, 8)} completed via NATS JetStream.`,
        });
        queryClient.invalidateQueries({ queryKey: ["products-cockpit"] });
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        return;
      }

      setIsSubmitting(false);
      toast.success("Order created", {
        description: `Order ${order?.id || ""} submitted to backend.`,
      });
      queryClient.invalidateQueries({ queryKey: ["products-cockpit"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => {
      setIsSubmitting(false);
      toast.error("Failed to place order.");
    },
  });

  const handleOpenTrace = (orderId: string, corrId: string, payload?: Record<string, any>) => {
    setDrawerOrderId(orderId);
    setDrawerSpans(SagaService.getTraceForOrder(orderId));
    setDrawerPayload(payload || { order_id: orderId, correlation_id: corrId });
    setIsDrawerOpen(true);
  };

  return (
    <div className="h-full flex flex-col gap-3 select-none overflow-hidden">
      {/* Trace Drawer */}
      <TraceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        orderId={drawerOrderId}
        correlationId={lastCorrelationId}
        traceSpans={drawerSpans}
        rawPayload={drawerPayload}
      />

      {/* Main Split Workbench: Panel Kiri (Storefront) & Panel Kanan (Telemetry + Stream) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* ========================================================================= */}
        {/* PANEL KIRI (5 Columns): Catalog, Cart, and Execution Buttons              */}
        {/* ========================================================================= */}
        <section className="lg:col-span-5 flex flex-col h-full bg-panel border border-border rounded overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-border bg-card/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={15} className="text-interactive" />
              <h2 className="tech-data font-bold text-xs uppercase tracking-tight text-text-main">
                Customer Storefront & Saga Trigger
              </h2>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border text-text-dim">
              POSTGRES LEDGER
            </span>
          </div>

          {/* Catalog List (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider flex justify-between px-1">
              <span>Hardware SKU / Component</span>
              <span>Available / Reserved Stock</span>
            </div>

            {products.map((p) => {
              const isSelected = selectedProductId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProductId(p.id)}
                  className={clsx(
                    "p-2.5 rounded border transition-all cursor-pointer font-mono text-xs flex items-center justify-between",
                    isSelected
                      ? "bg-card border-interactive shadow-xs text-text-main"
                      : "bg-card/40 border-border text-text-muted hover:border-interactive/40 hover:text-text-main"
                  )}
                >
                  <div className="space-y-0.5 max-w-[65%]">
                    <div className="font-semibold text-xs truncate text-text-main flex items-center gap-1.5">
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-interactive shrink-0" />}
                      <span className="truncate">{p.name}</span>
                    </div>
                    <p className="text-[10px] text-text-dim truncate">{p.description}</p>
                    <div className="text-interactive font-bold text-xs pt-0.5">
                      Rp {p.price.toLocaleString("id-ID")}
                    </div>
                  </div>

                  {/* Stock Metrics */}
                  <div className="text-right space-y-0.5 shrink-0">
                    <div className="text-[11px] font-bold text-success">
                      {p.stock_available} <span className="text-[10px] font-normal text-text-dim">avail</span>
                    </div>
                    <div className="text-[10px] text-interactive font-mono">
                      {p.stock_reserved} <span className="text-text-dim">locked</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Summary & Order Action Buttons */}
          <div className="p-3 border-t border-border bg-card/30 space-y-2.5 shrink-0">
            {/* Quantity Selector */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted">Quantity Allocation:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-6 h-6 rounded bg-card border border-border flex items-center justify-center font-bold hover:border-interactive transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold text-text-main">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(selectedProduct?.stock_available || 10, q + 1))}
                  className="w-6 h-6 rounded bg-card border border-border flex items-center justify-center font-bold hover:border-interactive transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total calculation */}
            <div className="p-2.5 rounded bg-background border border-border flex items-center justify-between font-mono text-xs">
              <span className="text-text-muted">Estimated Settlement Total:</span>
              <span className="text-sm font-bold text-interactive tech-data">
                Rp {totalPrice.toLocaleString("id-ID")}
              </span>
            </div>

            {/* Action Button: Place Order */}
            <button
              disabled={isSubmitting}
              onClick={() => placeOrderMutation.mutate()}
              className={clsx(
                "w-full py-2.5 px-3 rounded font-bold border transition-all flex items-center justify-center gap-1.5 text-xs font-mono",
                isSubmitting
                  ? "bg-card border-border text-text-dim cursor-not-allowed"
                  : "bg-success/15 border-success/50 text-success hover:bg-success/25 hover:border-success"
              )}
            >
              <ShoppingCart size={14} />
              <span>Place Order</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PANEL KANAN (7 Columns): Microservices Health & Real-time Event Stream    */}
        {/* ========================================================================= */}
        <section className="lg:col-span-7 flex flex-col h-full gap-3 min-h-0 overflow-hidden">
          {/* PANEL KANAN ATAS: Microservices Topology & Live Saga Progress */}
          <div className="bg-panel border border-border rounded p-3 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-text-main flex items-center gap-1.5">
                <Server size={14} className="text-interactive" />
                DISTRIBUTED MICROSERVICES TOPOLOGY (NATS EVENT BUS)
              </span>
              <span className="text-[10px] text-text-muted">
                Correlation ID: <strong className="text-interactive font-mono">{lastCorrelationId}</strong>
              </span>
            </div>

            {/* 4 Microservices Nodes Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
              {microservices.map((node) => {
                return (
                  <div
                    key={node.id}
                    className="p-2 rounded border border-border transition-all bg-card/60"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-text-main truncate">{node.name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                    </div>
                    <div className="text-[10px] text-text-dim flex justify-between">
                      <span>Port {node.port}</span>
                      <span className="text-text-main font-semibold">{node.latency}</span>
                    </div>
                    <div className="text-[9px] text-text-muted mt-1 truncate">
                      {node.database}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 rounded bg-background border border-border font-mono text-[10px] text-text-muted">
              Order state and saga events come from backend APIs and NATS JetStream.
            </div>
          </div>

          {/* PANEL KANAN BAWAH: Real-time Event Stream Table (Scrollable) */}
          <div className="flex-1 bg-panel border border-border rounded flex flex-col min-h-0 overflow-hidden">
            <div className="p-2.5 border-b border-border bg-card/40 flex items-center justify-between shrink-0 font-mono text-xs">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-interactive" />
                <span className="font-bold text-text-main uppercase tracking-tight">
                  Real-time NATS JetStream Event Stream
                </span>
              </div>
              <span className="text-[10px] text-text-muted">
                Click any row to inspect <strong className="text-interactive">Trace & JSON Payload</strong>
              </span>
            </div>

            {/* Stream Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead className="bg-card/70 border-b border-border text-[10px] text-text-dim uppercase sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Event Topic / Subject</th>
                    <th className="py-2 px-3">Correlation ID</th>
                    <th className="py-2 px-3">Publisher Node</th>
                    <th className="py-2 px-3 text-right">Saga State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {events.map((evt) => {
                    const isRollback = evt.status === "ROLLBACK";
                    const isCompensated = evt.status === "COMPENSATED";
                    const isCommitted = evt.status === "COMMITTED";

                    return (
                      <tr
                        key={evt.id}
                        onClick={() => handleOpenTrace(evt.payload?.order_id || "ord-8f92a104", evt.correlationId, evt.payload)}
                        className="hover:bg-card/80 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-3 text-text-muted text-[11px] whitespace-nowrap">
                          {evt.timestamp}
                        </td>
                        <td className="py-2 px-3 font-semibold text-text-main whitespace-nowrap">
                          <code className={clsx(
                            "px-1 py-0.5 rounded text-[11px] border",
                            isRollback ? "bg-failed/10 border-failed/30 text-failed" :
                            isCompensated ? "bg-interactive/10 border-interactive/30 text-interactive" :
                            "bg-background border-border text-text-main"
                          )}>
                            {evt.subject}
                          </code>
                        </td>
                        <td className="py-2 px-3 text-text-dim text-[11px] truncate max-w-[120px]">
                          {evt.correlationId}
                        </td>
                        <td className="py-2 px-3 text-text-muted text-[11px]">
                          {evt.serviceSource}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span
                            className={clsx(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                              isCommitted ? "bg-success/15 border-success/40 text-success" :
                              isRollback ? "bg-failed/15 border-failed/40 text-failed" :
                              isCompensated ? "bg-interactive/15 border-interactive/40 text-interactive" :
                              "bg-card border-border text-text-muted"
                            )}
                          >
                            {evt.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

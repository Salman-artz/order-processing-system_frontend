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
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Activity, 
  Server, 
  Terminal, 
  Radio, 
  Zap,
  Info
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";

export default function OperationsCockpitPage() {
  const queryClient = useQueryClient();

  // Selected item in catalog
  const [selectedProductId, setSelectedProductId] = useState<string>("4120ce5d-ac77-45f1-bd50-c5bc5d2725ad");
  const [quantity, setQuantity] = useState<number>(1);

  // Active Saga simulation states
  const [activeSagaStep, setActiveSagaStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulatedFailure, setSimulatedFailure] = useState<boolean>(false);
  const [lastCorrelationId, setLastCorrelationId] = useState<string>("corr-8f92-a104");

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

  // 2. Fetch Microservices Node status
  const microservices = SagaService.getMicroservicesHealth();

  // 3. Live Events stream state
  const [events, setEvents] = useState<SagaEventItem[]>(SagaService.getSagaEvents());

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0] || null;
  const totalPrice = (selectedProduct?.price || 0) * quantity;

  // Order Mutation (Commit Flow)
  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;
      setIsSimulating(true);
      setSimulatedFailure(false);
      setActiveSagaStep(1);

      const res = await OrderService.createOrder({
        items: [{ product_id: selectedProduct.id, quantity, price: selectedProduct.price }],
      });
      return res;
    },
    onSuccess: (order) => {
      const corrId = `corr-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
      setLastCorrelationId(corrId);

      // Simulate Saga Choreography Steps progression
      setTimeout(() => setActiveSagaStep(2), 500);  // inventory.reserved
      setTimeout(() => setActiveSagaStep(3), 1100); // payment.success
      setTimeout(() => {
        setActiveSagaStep(4); // order.completed
        setIsSimulating(false);
        toast.success("Saga Choreography Committed!", {
          description: `Order ${order?.id || "ORD-OK"} completed via NATS JetStream.`,
        });

        // Prepend fresh events to stream
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
        const freshEvents: SagaEventItem[] = [
          {
            id: `evt-${Date.now()}-1`,
            timestamp: timeStr,
            subject: "order.created",
            correlationId: corrId,
            serviceSource: "order-service",
            status: "COMMITTED",
            latencyMs: 12,
            payload: { order_id: order?.id, customer_id: "usr-admin-01", total: totalPrice, items_count: quantity },
          },
          {
            id: `evt-${Date.now()}-2`,
            timestamp: timeStr,
            subject: "inventory.reserved",
            correlationId: corrId,
            serviceSource: "inventory-service",
            status: "COMMITTED",
            latencyMs: 16,
            payload: { order_id: order?.id, sku: selectedProduct?.name, quantity, stock_locked: quantity },
          },
          {
            id: `evt-${Date.now()}-3`,
            timestamp: timeStr,
            subject: "payment.success",
            correlationId: corrId,
            serviceSource: "payment-service",
            status: "COMMITTED",
            latencyMs: 34,
            payload: { order_id: order?.id, status: "SETTLED", gateway: "Midtrans Snap" },
          },
          {
            id: `evt-${Date.now()}-4`,
            timestamp: timeStr,
            subject: "order.completed",
            correlationId: corrId,
            serviceSource: "order-service",
            status: "COMMITTED",
            latencyMs: 10,
            payload: { order_id: order?.id, final_state: "COMPLETED" },
          },
        ];
        setEvents((prev) => [...freshEvents, ...prev]);
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      }, 1600);
    },
    onError: () => {
      setIsSimulating(false);
      toast.error("Failed to place order.");
    },
  });

  // Simulate Failure Mutation (Rollback Flow)
  const simulateFailureMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;
      setIsSimulating(true);
      setSimulatedFailure(true);
      setActiveSagaStep(1);

      const res = await OrderService.simulateFailureOrder({
        items: [{ product_id: selectedProduct.id, quantity, price: selectedProduct.price }],
      });
      return res;
    },
    onSuccess: (order) => {
      const corrId = `corr-fail-${Math.random().toString(36).substring(2, 6)}`;
      setLastCorrelationId(corrId);

      // Simulate Saga Rollback flow:
      // 1: Order Created -> 2: Stock Reserved -> 3: Payment Failed -> 4: Compensation: Stock Released -> Order Cancelled
      setTimeout(() => setActiveSagaStep(2), 500);  // inventory.reserved
      setTimeout(() => setActiveSagaStep(3), 1100); // payment.failed
      setTimeout(() => {
        setActiveSagaStep(4); // stock compensated & order.cancelled
        setIsSimulating(false);
        toast.error("Saga Compensation Rollback Triggered!", {
          description: "Payment threshold exceeded. Reserved stock unlocked back to inventory.",
        });

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
        const freshEvents: SagaEventItem[] = [
          {
            id: `evt-${Date.now()}-f1`,
            timestamp: timeStr,
            subject: "order.created",
            correlationId: corrId,
            serviceSource: "order-service",
            status: "PENDING",
            latencyMs: 14,
            payload: { order_id: order?.id, total: totalPrice, simulation: "LIMIT_EXCEEDED" },
          },
          {
            id: `evt-${Date.now()}-f2`,
            timestamp: timeStr,
            subject: "inventory.reserved",
            correlationId: corrId,
            serviceSource: "inventory-service",
            status: "COMMITTED",
            latencyMs: 18,
            payload: { order_id: order?.id, sku: selectedProduct?.name, stock_locked: quantity },
          },
          {
            id: `evt-${Date.now()}-f3`,
            timestamp: timeStr,
            subject: "payment.failed",
            correlationId: corrId,
            serviceSource: "payment-service",
            status: "ROLLBACK",
            latencyMs: 48,
            compensationReason: "Simulated balance limit exceeded (> Rp 10.000.000)",
            payload: { order_id: order?.id, reason: "Transaction limit exceeded", gross_amount: totalPrice },
          },
          {
            id: `evt-${Date.now()}-f4`,
            timestamp: timeStr,
            subject: "inventory.released",
            correlationId: corrId,
            serviceSource: "inventory-service",
            status: "COMPENSATED",
            latencyMs: 22,
            compensationReason: `SAGA COMPENSATION: Released ${quantity}x lock on ${selectedProduct?.name} back to PostgreSQL`,
            payload: { order_id: order?.id, action: "COMPENSATION_STOCK_RELEASE" },
          },
          {
            id: `evt-${Date.now()}-f5`,
            timestamp: timeStr,
            subject: "order.cancelled",
            correlationId: corrId,
            serviceSource: "order-service",
            status: "ROLLBACK",
            latencyMs: 12,
            payload: { order_id: order?.id, final_state: "CANCELLED", rollback: "SUCCESSFUL" },
          },
        ];
        setEvents((prev) => [...freshEvents, ...prev]);
      }, 1700);
    },
    onError: () => {
      setIsSimulating(false);
      toast.error("Simulation trigger failed.");
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

            {/* Action Buttons: Place Order vs Simulate Failure */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {/* Normal Flow */}
              <button
                disabled={isSimulating}
                onClick={() => placeOrderMutation.mutate()}
                className={clsx(
                  "py-2.5 px-3 rounded font-bold border transition-all flex items-center justify-center gap-1.5",
                  isSimulating
                    ? "bg-card border-border text-text-dim cursor-not-allowed"
                    : "bg-success/15 border-success/50 text-success hover:bg-success/25 hover:border-success"
                )}
              >
                <CheckCircle2 size={14} />
                <span>Place Order (Commit)</span>
              </button>

              {/* Force Rollback Failure */}
              <button
                disabled={isSimulating}
                onClick={() => simulateFailureMutation.mutate()}
                className={clsx(
                  "py-2.5 px-3 rounded font-bold border transition-all flex items-center justify-center gap-1.5",
                  isSimulating
                    ? "bg-card border-border text-text-dim cursor-not-allowed"
                    : "bg-failed/15 border-failed/50 text-failed hover:bg-failed/25 hover:border-failed"
                )}
              >
                <RotateCcw size={14} />
                <span>Simulate Failure</span>
              </button>
            </div>

            <div className="text-[10px] font-mono text-text-dim text-center">
              * Click "Simulate Failure" to trigger immediate Saga Compensation & Inventory Rollback
            </div>
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
              {microservices.map((node, index) => {
                const isActiveHop = isSimulating && activeSagaStep === index + 1;
                return (
                  <div
                    key={node.id}
                    className={clsx(
                      "p-2 rounded border transition-all bg-card/60",
                      isActiveHop ? "border-interactive bg-interactive/10 shadow-xs" : "border-border"
                    )}
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

            {/* Live Saga Progress Indicator */}
            <div className="p-2.5 rounded bg-background border border-border font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-text-dim uppercase tracking-wider">
                <span>Choreography Transaction Progress:</span>
                <span className={clsx("font-bold", simulatedFailure ? "text-failed" : "text-success")}>
                  {isSimulating ? "IN FLIGHT..." : simulatedFailure ? "ROLLBACK COMPLETED" : "READY / COMMITTED"}
                </span>
              </div>

              {/* Progress Stepper Bar */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className={clsx("p-1.5 rounded border text-[10px]", activeSagaStep >= 1 ? "bg-card border-success text-success font-bold" : "border-border text-text-dim")}>
                  1. OrderCreated
                </div>
                <div className={clsx("p-1.5 rounded border text-[10px]", activeSagaStep >= 2 ? "bg-card border-success text-success font-bold" : "border-border text-text-dim")}>
                  2. StockReserved
                </div>
                <div className={clsx("p-1.5 rounded border text-[10px]", 
                  activeSagaStep >= 3 
                    ? (simulatedFailure ? "bg-failed/15 border-failed text-failed font-bold" : "bg-card border-success text-success font-bold") 
                    : "border-border text-text-dim"
                )}>
                  3. {simulatedFailure ? "PaymentFailed" : "PaymentSuccess"}
                </div>
                <div className={clsx("p-1.5 rounded border text-[10px]", 
                  activeSagaStep >= 4 
                    ? (simulatedFailure ? "bg-card border-interactive text-interactive font-bold" : "bg-card border-success text-success font-bold") 
                    : "border-border text-text-dim"
                )}>
                  4. {simulatedFailure ? "StockRollback" : "OrderCompleted"}
                </div>
              </div>
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

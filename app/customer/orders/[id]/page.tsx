"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { Order, OrderStatus } from "@/types";
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { useOrderSocket } from "@/lib/hooks/useOrderSocket";
import SagaTimeline from "@/components/SagaTimeline";
import { formatDistanceToNow } from "date-fns";

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                   */
/* -------------------------------------------------------------------------- */
const MOCK_ORDER: Order = {
  id: "mock-order-001",
  userId: "1",
  status: "PENDING",
  totalAmount: 1200,
  items: [{ productId: "p1", quantity: 1, price: 1200 }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_STATUSES: OrderStatus[] = [
  "PENDING",
  "RESERVED",
  "PAID",
  "COMPLETED",
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Order Created",
  RESERVED: "Stock Reserved",
  PAID: "Payment Processed",
  COMPLETED: "Order Completed",
  CANCELLED: "Order Cancelled",
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */
export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [liveStatus, setLiveStatus] = useState<OrderStatus | null>(null);
  const prevStatusRef = useRef<OrderStatus | null>(null);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------------------------------------------------------------------- */
  /*  Initial fetch                                                           */
  /* ---------------------------------------------------------------------- */
  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
        // Start mock status progression after data loads
        setTimeout(() => startMockProgression(), 300);
        return { ...MOCK_ORDER, id };
      }
      const res = await api.get(`/orders/${id}`);
      return res.data.order ?? res.data;
    },
    refetchInterval: (query) => {
      const current = query.state.data?.status;
      if (current === "COMPLETED" || current === "CANCELLED") {
        return false;
      }
      return 1000;
    },
    staleTime: 5_000,
  });

  const { data: products = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products");
      const list = res.data.products ?? res.data;
      return Array.isArray(list) ? list : [];
    },
    staleTime: 60_000,
  });

  const getProductName = (prodId?: string) => {
    if (!prodId) return "Unknown Product";
    const found = products.find((p) => p.id === prodId);
    return found ? found.name : prodId;
  };

  /* ---------------------------------------------------------------------- */
  /*  Status change handler (shared by WS and mock timer)                    */
  /* ---------------------------------------------------------------------- */
  const handleStatusChange = useCallback(
    (newStatus: OrderStatus) => {
      const prev = prevStatusRef.current;
      if (prev === newStatus) return; // no-op if unchanged

      prevStatusRef.current = newStatus;
      setLiveStatus(newStatus);

      // Update TanStack Query cache so the list page stays in sync
      queryClient.setQueryData<Order>(["order", id], (old) =>
        old ? { ...old, status: newStatus } : old
      );

      // Toast notification on status change
      const label = STATUS_LABELS[newStatus] ?? newStatus;
      if (newStatus === "COMPLETED") {
        toast.success(`✅ ${label}`, {
          description: `Order ${id.slice(0, 8)}… is now complete.`,
        });
      } else if (newStatus === "CANCELLED") {
        toast.error(`❌ ${label}`, {
          description: "Your order was cancelled. Stock has been released.",
        });
      } else {
        toast.info(`⚡ ${label}`, {
          description: `Order is progressing — status updated to ${newStatus}.`,
        });
      }
    },
    [id, queryClient]
  );

  /* ---------------------------------------------------------------------- */
  /*  Mock progression (only when NEXT_PUBLIC_USE_MOCK is true / demo mode)  */
  /* ---------------------------------------------------------------------- */
  const startMockProgression = useCallback(() => {
    if (mockTimerRef.current) return; // already running
    let idx = 0;
    handleStatusChange(MOCK_STATUSES[idx]);
    mockTimerRef.current = setInterval(() => {
      if (idx < MOCK_STATUSES.length - 1) {
        idx++;
        handleStatusChange(MOCK_STATUSES[idx]);
      } else {
        clearInterval(mockTimerRef.current!);
        mockTimerRef.current = null;
      }
    }, 3000);
  }, [handleStatusChange]);

  /* ---------------------------------------------------------------------- */
  /*  Real WebSocket (only active when NOT in mock mode)                     */
  /* ---------------------------------------------------------------------- */
  useOrderSocket({
    orderId: id,
    enabled: process.env.NEXT_PUBLIC_USE_MOCK !== "true",
    onStatusChange: (update) => handleStatusChange(update.status),
  });

  /* ---------------------------------------------------------------------- */
  /*  Derive display status                                                   */
  /* ---------------------------------------------------------------------- */
  const displayStatus = liveStatus ?? order?.status ?? "PENDING";

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                  */
  /* ---------------------------------------------------------------------- */
  if (isLoading || !order) {
    return (
      <div data-testid="order-details-loading" className="space-y-4 animate-pulse">
        <div className="h-8 bg-panel rounded-md w-1/3" />
        <div className="h-48 bg-panel rounded-md" />
        <div className="h-32 bg-panel rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading text-2xl font-bold">Order Details</h1>
          <p data-testid="order-details-id" className="tech-data text-text-muted text-sm mt-1 break-all">{order.id}</p>
        </div>
        <div className="text-xs text-text-muted">
          {(() => {
            const rawDate = order.createdAt || order.created_at;
            if (!rawDate) return "–";
            const d = new Date(rawDate);
            return isNaN(d.getTime()) ? "–" : formatDistanceToNow(d, { addSuffix: true });
          })()}
        </div>
      </div>

      {/* Saga Timeline with animated status transitions */}
      <div data-testid="saga-progress-section" className="bg-panel border border-border rounded-md p-6">
        <h2 className="heading text-base font-semibold text-text-muted mb-8 uppercase tracking-wider text-xs">
          Saga Progress
        </h2>
        {/* AnimatePresence key forces re-mount on status change → triggers enter animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={displayStatus}
            initial={{ opacity: 0.6, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <SagaTimeline status={displayStatus} />
          </motion.div>
        </AnimatePresence>

        {/* Current Status Badge */}
        <div className="mt-6 flex items-center gap-3">
          <span className="text-text-muted text-sm">Current status:</span>
          <StatusBadge status={displayStatus} />
        </div>
      </div>

      {/* Order Items */}
      <div data-testid="order-details-items" className="bg-panel border border-border rounded-md p-6">
        <h2 className="heading text-base font-semibold mb-4">Items</h2>
        <div className="space-y-3">
          {(order.items ?? []).map((item, i) => {
            const prodId = item.productId || item.product_id;
            return (
              <div
                key={i}
                data-testid={`order-item-row-${i}`}
                className="flex justify-between items-center bg-background p-3 rounded-md border border-border"
              >
                <div>
                  <p className="font-medium text-sm text-text-main">{getProductName(prodId)}</p>
                  <p className="tech-data text-xs text-text-muted mt-0.5">{prodId}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-text-muted">×{item.quantity}</span>
                  <span className="tech-data font-bold text-success">
                    Rp {((item.price ?? 0) * (item.quantity ?? 1)).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            );
          })}
          {(!order.items || order.items.length === 0) && (
            <p className="text-xs text-text-muted">No individual item details.</p>
          )}
        </div>
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
          <span className="font-bold">Total</span>
          <span data-testid="order-details-total" className="tech-data text-success text-xl font-bold">
            Rp {Number(order.totalAmount ?? order.total_amount ?? 0).toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      {/* Midtrans Payment Gateway Section */}
      <div data-testid="midtrans-gateway-section" className="bg-panel border border-border rounded-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="heading text-base font-semibold">Payment Gateway (Midtrans Snap)</h2>
            <p className="text-xs text-text-muted mt-0.5">Channels: QRIS, GoPay, BCA/Mandiri/BNI Virtual Account, Credit Card</p>
          </div>
          <span className="tech-data text-xs px-2.5 py-1 rounded bg-interactive/10 text-interactive border border-interactive/30">
            Midtrans Gateway
          </span>
        </div>

        {displayStatus === "COMPLETED" ? (
          <div data-testid="midtrans-status-paid" className="bg-success/10 border border-success/30 rounded p-4 text-xs text-success flex items-center gap-2">
            <span>✅</span>
            <span>Pembayaran lunas terverifikasi oleh Midtrans webhook settlement.</span>
          </div>
        ) : displayStatus === "CANCELLED" ? (
          <div data-testid="midtrans-status-failed" className="bg-failed/10 border border-failed/30 rounded p-4 text-xs text-failed flex items-center gap-2">
            <span>❌</span>
            <span>Transaksi dibatalkan / ditolak oleh Midtrans payment gateway.</span>
          </div>
        ) : (
          <div className="bg-background border border-border rounded p-4 space-y-3">
            <p className="text-xs text-text-muted">
              Silakan selesaikan pembayaran pesanan Anda melalui Midtrans Snap.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                data-testid="btn-midtrans-pay"
                onClick={async () => {
                  try {
                    await api.post("/payments/midtrans/simulate", { order_id: id, status: "settlement" });
                    toast.success("Midtrans payment successful!");
                  } catch {
                    toast.error("Gagal memproses simulasi Midtrans");
                  }
                }}
                className="bg-interactive text-white text-xs px-4 py-2 rounded font-medium hover:bg-interactive/90 transition-colors"
              >
                💳 Pay with Midtrans (Simulate Settlement)
              </button>
              <button
                type="button"
                data-testid="btn-midtrans-cancel"
                onClick={async () => {
                  try {
                    await api.post("/payments/midtrans/simulate", { order_id: id, status: "deny" });
                    toast.info("Midtrans payment cancelled / denied.");
                  } catch {
                    toast.error("Gagal memproses simulasi");
                  }
                }}
                className="bg-panel border border-failed/40 text-failed text-xs px-4 py-2 rounded font-medium hover:bg-failed/10 transition-colors"
              >
                ✕ Cancel Payment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                              */
/* -------------------------------------------------------------------------- */
function StatusBadge({ status }: { status: OrderStatus }) {
  const colorMap: Record<OrderStatus, string> = {
    PENDING: "text-pending border-pending/30 bg-pending/10",
    RESERVED: "text-interactive border-interactive/30 bg-interactive/10",
    PAID: "text-interactive border-interactive/30 bg-interactive/10",
    COMPLETED: "text-success border-success/30 bg-success/10",
    CANCELLED: "text-failed border-failed/30 bg-failed/10",
  };

  return (
    <motion.span
      key={status}
      data-testid="status-badge"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`tech-data text-xs font-semibold px-3 py-1 rounded border ${colorMap[status]}`}
    >
      {status}
    </motion.span>
  );
}

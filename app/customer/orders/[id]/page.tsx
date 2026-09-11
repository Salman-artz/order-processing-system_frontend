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
      return res.data;
    },
    staleTime: 30_000,
  });

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
      <div className="space-y-4 animate-pulse">
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
          <p className="tech-data text-text-muted text-sm mt-1 break-all">{order.id}</p>
        </div>
        <div className="text-xs text-text-muted">
          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
        </div>
      </div>

      {/* Saga Timeline with animated status transitions */}
      <div className="bg-panel border border-border rounded-md p-6">
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
      <div className="bg-panel border border-border rounded-md p-6">
        <h2 className="heading text-base font-semibold mb-4">Items</h2>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-background p-3 rounded-md border border-border"
            >
              <div>
                <span className="tech-data text-xs text-text-muted">Product</span>
                <p className="font-medium tech-data text-sm mt-0.5">{item.productId}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-text-muted">×{item.quantity}</span>
                <span className="tech-data font-bold text-success">
                  Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
          <span className="font-bold">Total</span>
          <span className="tech-data text-success text-xl font-bold">
            Rp {order.totalAmount.toLocaleString("id-ID")}
          </span>
        </div>
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
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`tech-data text-xs font-semibold px-3 py-1 rounded border ${colorMap[status]}`}
    >
      {status}
    </motion.span>
  );
}

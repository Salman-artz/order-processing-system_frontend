"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderService } from "@/services/order.service";
import { SagaService, TraceSpan } from "@/services/saga.service";
import SagaTimeline from "@/components/SagaTimeline";
import TraceDrawer from "@/components/TraceDrawer";
import { 
  ArrowLeft, 
  Terminal, 
  RotateCcw, 
  CheckCircle2, 
  Truck, 
  Box, 
  Check, 
  XCircle,
  Clock
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { toast } from "sonner";

export default function AdminOrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState("");

  const { data: order, isLoading: isOrderLoading } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => OrderService.getOrderById(id),
    staleTime: 5_000,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["admin-order-timeline", id],
    queryFn: () => OrderService.getOrderTimeline(id),
    staleTime: 5_000,
  });

  // Fulfillment Advance Mutation
  const fulfillMutation = useMutation({
    mutationFn: async (nextStatus: string) => {
      return OrderService.advanceFulfillment(id, nextStatus, actionNotes || `Status updated to ${nextStatus}`);
    },
    onSuccess: (updated) => {
      toast.success(`Fulfillment advanced to ${updated.status}`);
      setActionNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-timeline", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update fulfillment");
    },
  });

  // Cancel Order Mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const reason = prompt("Enter cancellation reason for audit trail:") || "Cancelled by warehouse operator";
      return OrderService.cancelOrder(id, reason);
    },
    onSuccess: () => {
      toast.success("Order cancelled and compensatory rollback initiated!");
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-timeline", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to cancel order");
    },
  });

  const traceSpans: TraceSpan[] = SagaService.getTraceForOrder(id);

  if (isOrderLoading || !order) {
    return <div className="text-xs font-mono text-text-muted p-4">Loading order telemetry...</div>;
  }

  const amt = Number(order.totalAmount || order.total_amount || 0);
  const rawDate = order.createdAt || order.created_at;
  const dateStr = rawDate ? new Date(rawDate).toLocaleString() : "–";

  const status = order.status;
  const canPick = status === "CONFIRMED" || status === "PENDING" || status === "INVENTORY_RESERVED";
  const canPack = status === "PICKING";
  const canDispatch = status === "PACKED";
  const canComplete = status === "DISPATCHED";
  const canCancel = status !== "DISPATCHED" && status !== "COMPLETED" && status !== "CANCELLED";

  return (
    <div className="space-y-4 font-mono select-none max-w-4xl mx-auto">
      <TraceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        orderId={order.id}
        traceSpans={traceSpans}
      />

      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-1.5 rounded bg-panel border border-border text-text-muted hover:text-text-main hover:border-interactive transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="heading text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
              Warehouse Fulfillment & Saga Inspector
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Order ID: <span className="text-interactive font-mono">{order.id}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDrawerOpen(true)}
          className="px-3 py-1.5 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 transition-colors text-xs font-bold flex items-center gap-1.5"
        >
          <Terminal size={14} />
          <span>Inspect Trace Spans</span>
        </button>
      </div>

      {/* Fulfillment Action Control Bar */}
      <div className="p-3.5 rounded bg-panel border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-text-dim text-[11px] block">Current Fulfillment Status:</span>
          <span className="font-bold text-interactive text-sm">{status}</span>
        </div>

        <div className="flex items-center gap-2">
          {canPick && (
            <button
              onClick={() => fulfillMutation.mutate("PICKING")}
              disabled={fulfillMutation.isPending}
              className="px-3 py-1.5 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 font-bold flex items-center gap-1.5"
            >
              <Box size={14} />
              <span>Start Picking</span>
            </button>
          )}

          {canPack && (
            <button
              onClick={() => fulfillMutation.mutate("PACKED")}
              disabled={fulfillMutation.isPending}
              className="px-3 py-1.5 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 font-bold flex items-center gap-1.5"
            >
              <Box size={14} />
              <span>Mark Packed</span>
            </button>
          )}

          {canDispatch && (
            <button
              onClick={() => fulfillMutation.mutate("DISPATCHED")}
              disabled={fulfillMutation.isPending}
              className="px-3 py-1.5 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 font-bold flex items-center gap-1.5"
            >
              <Truck size={14} />
              <span>Dispatch Carrier Shipment</span>
            </button>
          )}

          {canComplete && (
            <button
              onClick={() => fulfillMutation.mutate("COMPLETED")}
              disabled={fulfillMutation.isPending}
              className="px-3 py-1.5 rounded bg-success/15 border border-success/50 text-success hover:bg-success/25 font-bold flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Confirm Delivery Complete</span>
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="px-3 py-1.5 rounded bg-failed/15 border border-failed/50 text-failed hover:bg-failed/25 font-bold flex items-center gap-1.5"
            >
              <XCircle size={14} />
              <span>Cancel & Rollback</span>
            </button>
          )}
        </div>
      </div>

      {/* State Graph */}
      <div className="p-4 rounded bg-panel border border-border space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-text-main uppercase tracking-wider">
            Choreography State Graph
          </span>
          <span className={clsx(
            "text-[10px] font-bold px-2 py-0.5 rounded border uppercase",
            order.status === "COMPLETED" ? "bg-success/15 border-success/40 text-success" :
            order.status === "CANCELLED" ? "bg-failed/15 border-failed/40 text-failed" :
            "bg-interactive/15 border-interactive/40 text-interactive"
          )}>
            Status: {order.status}
          </span>
        </div>

        <SagaTimeline status={order.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded bg-panel border border-border space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-text-main border-b border-border pb-2">
            Ledger Metadata
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-text-dim">Amount:</span>
              <span className="font-bold text-text-main tech-data">Rp {amt.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-dim">Timestamp:</span>
              <span className="text-text-muted">{dateStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-dim">Broker:</span>
              <span className="text-interactive font-semibold">NATS JetStream</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 p-4 rounded bg-panel border border-border space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-text-main border-b border-border pb-2">
            NATS Event Journal & Saga Logs
          </h3>
          <div className="space-y-2">
            {timeline.map((logItem: any, idx: number) => (
              <div
                key={logItem.id || idx}
                className="p-2.5 rounded bg-card/60 border border-border text-xs flex items-center justify-between font-mono"
              >
                <div>
                  <div className="font-semibold text-text-main flex items-center gap-1.5">
                    {logItem.status === "SUCCESS" && <CheckCircle2 size={13} className="text-success" />}
                    {logItem.status === "FAILED" && <RotateCcw size={13} className="text-failed" />}
                    {logItem.status === "COMPENSATED" && <RotateCcw size={13} className="text-interactive" />}
                    <code>{logItem.eventType || logItem.event_type}</code>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {logItem.payload?.action || logItem.payload?.reason || logItem.payload?.notes || "Event recorded"}
                  </div>
                </div>

                <span className={clsx(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase",
                  logItem.status === "SUCCESS" ? "bg-success/10 border-success/30 text-success" :
                  logItem.status === "FAILED" ? "bg-failed/10 border-failed/30 text-failed" :
                  "bg-interactive/10 border-interactive/30 text-interactive"
                )}>
                  {logItem.status || "COMMITTED"}
                </span>
              </div>
            ))}
            {timeline.length === 0 && (
              <div className="text-text-muted text-xs py-3">
                No saga timeline logs available for this order.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

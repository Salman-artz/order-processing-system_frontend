"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrderService } from "@/services/order.service";
import { SagaService, TraceSpan } from "@/services/saga.service";
import { Order } from "@/types";
import Link from "next/link";
import SagaTimeline from "@/components/SagaTimeline";
import TraceDrawer from "@/components/TraceDrawer";
import { FileText, ArrowRight, Filter, Search, Terminal } from "lucide-react";
import clsx from "clsx";

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerOrderId, setDrawerOrderId] = useState("ord-8f92a104");
  const [drawerSpans, setDrawerSpans] = useState<TraceSpan[]>([]);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders"],
    queryFn: () => OrderService.listAllOrders(),
    staleTime: 10_000,
  });

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = filter === "ALL" ? true : o.status === filter;
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleOpenTrace = (orderId: string) => {
    setDrawerOrderId(orderId);
    setDrawerSpans(SagaService.getTraceForOrder(orderId));
    setIsDrawerOpen(true);
  };

  if (isLoading) {
    return <div className="text-xs font-mono text-text-muted p-4">Loading distributed orders...</div>;
  }

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Trace Drawer */}
      <TraceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        orderId={drawerOrderId}
        traceSpans={drawerSpans}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="heading text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <FileText size={18} className="text-interactive" />
            Distributed Orders Registry
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Audit and inspect individual transaction sagas, event spans, and compensatory rollbacks
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 text-xs">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter Order ID..."
              className="bg-panel border border-border rounded px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-interactive pl-8"
            />
            <Search size={13} className="absolute left-2.5 top-2 text-text-dim" />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-panel border border-border rounded px-3 py-1.5 text-xs text-text-main focus:outline-none focus:border-interactive"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled / Rollback</option>
            <option value="RESERVED">Reserved</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded bg-panel border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-card/70 border-b border-border text-[10px] text-text-dim uppercase">
              <tr>
                <th className="py-2.5 px-3">Order Identifier</th>
                <th className="py-2.5 px-3">Date / Timestamp</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3 w-1/3">Saga Status Flow</th>
                <th className="py-2.5 px-3 text-right">Telemetry Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredOrders.map((order) => {
                const amt = Number(order.totalAmount || order.total_amount || 0);
                const rawDate = order.createdAt || order.created_at;
                const dateStr = rawDate ? new Date(rawDate).toLocaleString() : "–";

                return (
                  <tr key={order.id} className="hover:bg-card/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-text-main">
                      <Link href={`/customer/orders/${order.id}`} className="text-interactive hover:underline">
                        {order.id}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-text-muted text-[11px]">{dateStr}</td>
                    <td className="py-2.5 px-3 font-bold text-text-main">
                      Rp {amt.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2.5 px-3">
                      <SagaTimeline status={order.status} compact />
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenTrace(order.id)}
                        className="px-2 py-1 rounded bg-card border border-border text-text-muted hover:text-text-main hover:border-interactive transition-colors text-[11px]"
                      >
                        Trace Spans
                      </button>
                      <Link
                        href={`/customer/orders/${order.id}`}
                        className="px-2 py-1 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 transition-colors text-[11px] font-semibold"
                      >
                        Timeline View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-muted text-xs">
                    No orders matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

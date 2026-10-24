"use client";

import { useQuery } from "@tanstack/react-query";
import { OrderService } from "@/services/order.service";
import { Order } from "@/types";
import Link from "next/link";
import SagaTimeline from "@/components/SagaTimeline";
import { ShoppingCart, ArrowRight, ShieldCheck, Clock } from "lucide-react";

export default function CustomerOrdersPage() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["customer-orders"],
    queryFn: () => OrderService.listCustomerOrders(),
    staleTime: 10_000,
  });

  if (isLoading) {
    return <div className="text-xs font-mono text-text-muted p-4">Loading customer orders...</div>;
  }

  return (
    <div className="space-y-4 font-mono select-none max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="heading text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <ShoppingCart size={18} className="text-interactive" />
            My Orders & Saga Execution History
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Distributed order lifecycle tracked across NATS JetStream events
          </p>
        </div>

        <Link
          href="/customer/products"
          className="px-3 py-1.5 rounded bg-card border border-border text-xs text-interactive hover:border-interactive transition-colors font-semibold"
        >
          + New Order
        </Link>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((order) => {
          const amt = Number(order.totalAmount || order.total_amount || 0);
          const rawDate = order.createdAt || order.created_at;
          const dateStr = rawDate ? new Date(rawDate).toLocaleString() : "–";

          return (
            <Link
              key={order.id}
              href={`/customer/orders/${order.id}`}
              className="block p-4 rounded bg-panel border border-border hover:border-interactive transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-main tech-data">{order.id}</span>
                    <span className="text-[10px] text-text-dim flex items-center gap-1">
                      <Clock size={11} /> {dateStr}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-interactive tech-data mt-1">
                    Rp {amt.toLocaleString("id-ID")}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-interactive font-semibold">
                  <span>View Timeline</span>
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Saga Timeline Component */}
              <div>
                <SagaTimeline status={order.status} compact />
              </div>
            </Link>
          );
        })}

        {orders.length === 0 && (
          <div className="p-8 text-center text-text-muted rounded bg-panel border border-border text-xs">
            No orders placed yet. Visit the Live Operations Cockpit to place orders.
          </div>
        )}
      </div>
    </div>
  );
}

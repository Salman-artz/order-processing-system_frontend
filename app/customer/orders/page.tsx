"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { Order } from "@/types";
import Link from "next/link";
import SagaTimeline from "@/components/SagaTimeline";

export default function CustomerOrdersPage() {
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["customer-orders"],
    queryFn: async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
        return [
          { id: "mock-order-p1", userId: "1", status: "RESERVED", totalAmount: 1200, items: [], createdAt: new Date().toISOString() },
          { id: "mock-order-2", userId: "1", status: "COMPLETED", totalAmount: 45, items: [], createdAt: new Date().toISOString() },
        ];
      }
      const res = await api.get("/orders");
      const list = res.data.orders ?? res.data;
      return Array.isArray(list) ? list : [];
    },
  });

  if (isLoading) return <div data-testid="orders-loading" className="text-text-muted">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <h1 className="heading text-2xl font-bold">My Orders</h1>

      <div data-testid="customer-orders-list" className="space-y-4">
        {orders?.map((order) => {
          const amt = Number(order.totalAmount ?? order.total_amount ?? 0);
          const rawDate = order.createdAt || order.created_at;
          let dateDisplay = "–";
          if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) dateDisplay = d.toLocaleDateString();
          }
          return (
            <Link href={`/customer/orders/${order.id}`} key={order.id} data-testid={`order-card-${order.id}`} className="block">
              <div className="bg-panel border border-border hover:border-interactive transition-colors rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 data-testid={`order-id-${order.id}`} className="tech-data font-bold">{order.id}</h3>
                  <p className="text-xs text-text-muted mt-1">
                    {dateDisplay}
                  </p>
                  <div data-testid={`order-amount-${order.id}`} className="tech-data text-success mt-2">Rp {amt.toLocaleString("id-ID")}</div>
                </div>

                <div className="w-full md:w-1/2">
                  <SagaTimeline status={order.status} compact />
                </div>
              </div>
            </Link>
          );
        })}
        {(!orders || orders.length === 0) && (
          <p data-testid="empty-orders-state" className="text-text-muted">No orders found.</p>
        )}
      </div>
    </div>
  );
}

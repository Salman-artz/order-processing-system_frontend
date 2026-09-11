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
      return res.data;
    },
  });

  if (isLoading) return <div className="text-text-muted">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <h1 className="heading text-2xl font-bold">My Orders</h1>

      <div className="space-y-4">
        {orders?.map((order) => (
          <Link href={`/orders/${order.id}`} key={order.id} className="block">
            <div className="bg-panel border border-border hover:border-interactive transition-colors rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="tech-data font-bold">{order.id}</h3>
                <p className="text-xs text-text-muted mt-1">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
                <div className="tech-data text-success mt-2">${order.totalAmount}</div>
              </div>
              
              <div className="w-full md:w-1/2">
                <SagaTimeline status={order.status} compact />
              </div>
            </div>
          </Link>
        ))}
        {orders?.length === 0 && (
          <p className="text-text-muted">No orders found.</p>
        )}
      </div>
    </div>
  );
}

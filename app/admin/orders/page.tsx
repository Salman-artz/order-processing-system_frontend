"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { Order } from "@/types";
import Link from "next/link";
import SagaTimeline from "@/components/SagaTimeline";
import { useState } from "react";

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState("ALL");

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
        return [
          { id: "mock-order-1", userId: "user-1", status: "PENDING", totalAmount: 150, items: [], createdAt: new Date().toISOString() },
          { id: "mock-order-2", userId: "user-2", status: "RESERVED", totalAmount: 300, items: [], createdAt: new Date().toISOString() },
          { id: "mock-order-3", userId: "user-1", status: "COMPLETED", totalAmount: 1200, items: [], createdAt: new Date().toISOString() },
          { id: "mock-order-4", userId: "user-3", status: "CANCELLED", totalAmount: 45, items: [], createdAt: new Date().toISOString() },
        ];
      }
      const res = await api.get("/admin/orders");
      const list = res.data.orders ?? res.data;
      return Array.isArray(list) ? list : [];
    },
  });

  const filteredOrders = Array.isArray(orders) ? orders.filter(o => filter === "ALL" ? true : o.status === filter) : [];

  if (isLoading) return <div data-testid="admin-orders-loading" className="text-text-muted">Loading orders...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="heading text-2xl font-bold">All Orders</h1>
        <select 
          data-testid="select-status-filter"
          className="bg-panel border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-interactive"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="RESERVED">Reserved</option>
          <option value="PAID">Paid</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="bg-panel rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table data-testid="table-admin-orders" className="w-full text-left text-sm">
            <thead className="bg-border text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium w-1/2">Saga Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders?.map((order) => {
                const amt = Number(order.totalAmount ?? order.total_amount ?? 0);
                const rawDate = order.createdAt || order.created_at;
                let dateDisplay = "–";
                if (rawDate) {
                  const d = new Date(rawDate);
                  if (!isNaN(d.getTime())) dateDisplay = d.toLocaleDateString();
                }
                return (
                  <tr key={order.id} data-testid={`admin-order-row-${order.id}`} className="hover:bg-border/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${order.id}`} className="tech-data text-interactive hover:underline">
                        {order.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {dateDisplay}
                    </td>
                    <td className="px-4 py-3 tech-data font-bold">
                      Rp {amt.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      <SagaTimeline status={order.status} compact />
                    </td>
                  </tr>
                );
              })}
              {(!filteredOrders || filteredOrders.length === 0) && (
                <tr>
                  <td colSpan={4} data-testid="empty-admin-orders-state" className="px-4 py-8 text-center text-text-muted">
                    No orders found.
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

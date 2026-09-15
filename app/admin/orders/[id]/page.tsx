"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { Order, SagaLog } from "@/types";
import { useParams } from "next/navigation";
import clsx from "clsx";

export default function AdminOrderDetailsPage() {
  const { id } = useParams();

  const { data: order, isLoading } = useQuery<Order & { sagaLogs?: SagaLog[] }>({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
        return { 
          id: id as string, 
          userId: "user-1", 
          status: "COMPLETED", 
          totalAmount: 1200, 
          items: [{ productId: "p1", quantity: 1, price: 1200 }], 
          createdAt: new Date().toISOString(),
          sagaLogs: [
            { id: "l1", orderId: id as string, eventType: "ORDER_CREATE", status: "SUCCESS", createdAt: new Date(Date.now() - 10000).toISOString() },
            { id: "l2", orderId: id as string, eventType: "STOCK_RESERVE", status: "SUCCESS", createdAt: new Date(Date.now() - 8000).toISOString() },
            { id: "l3", orderId: id as string, eventType: "PAYMENT_PROCESS", status: "SUCCESS", createdAt: new Date(Date.now() - 5000).toISOString() },
          ]
        };
      }
      try {
        const adminRes = await api.get(`/admin/orders/${id}`);
        if (adminRes.data?.sagaLogs || adminRes.data?.items) {
          return adminRes.data;
        }
      } catch {
        // continue to separate fetch
      }

      const [orderRes, timelineRes] = await Promise.allSettled([
        api.get(`/orders/${id}`),
        api.get(`/admin/orders/${id}/timeline`),
      ]);
      const orderData = orderRes.status === "fulfilled" ? (orderRes.value.data.order ?? orderRes.value.data) : {};
      const timelineData = timelineRes.status === "fulfilled" ? (timelineRes.value.data.timeline ?? timelineRes.value.data) : [];
      return {
        ...orderData,
        sagaLogs: Array.isArray(orderData.sagaLogs) ? orderData.sagaLogs : (Array.isArray(timelineData) ? timelineData : []),
      };
    },
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

  if (isLoading || !order) return <div data-testid="admin-order-details-loading" className="text-text-muted">Loading order...</div>;

  const getProductName = (prodId?: string) => {
    if (!prodId) return "Unknown Product";
    const found = products.find((p) => p.id === prodId);
    return found ? found.name : `Product ${prodId}`;
  };

  const totalAmount = Number(order.totalAmount ?? order.total_amount ?? 0);
  const items = order.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="heading text-2xl font-bold">Admin Order Details</h1>
          <p data-testid="admin-order-id" className="tech-data text-text-muted mt-1">{order.id}</p>
        </div>
        <div data-testid="admin-order-status-badge" className={clsx(
          "px-3 py-1 rounded-full text-xs font-bold",
          order.status === "COMPLETED" ? "bg-success/20 text-success" :
          order.status === "CANCELLED" ? "bg-failed/20 text-failed" :
          "bg-pending/20 text-pending"
        )}>
          {order.status}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div data-testid="admin-order-items" className="bg-panel border border-border rounded-md p-6">
            <h3 className="heading text-lg font-bold mb-4">Items</h3>
            <div className="space-y-3">
              {items.map((item, i) => {
                const prodId = item.productId || item.product_id;
                return (
                  <div key={i} data-testid={`admin-order-item-${i}`} className="flex justify-between items-center bg-background p-3 rounded-md border border-border">
                    <div>
                      <p className="font-medium text-sm text-text-main">{getProductName(prodId)}</p>
                      <p className="tech-data text-xs text-text-muted mt-0.5">{prodId}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-text-muted">x{item.quantity}</span>
                      <span className="tech-data font-bold">Rp {((item.price ?? 0) * (item.quantity ?? 1)).toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="text-xs text-text-muted">No individual item details.</p>
              )}
            </div>
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
              <span className="font-bold">Total</span>
              <span data-testid="admin-order-total" className="tech-data text-success text-xl font-bold">Rp {totalAmount.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>

        <div data-testid="admin-saga-logs-section" className="bg-panel border border-border rounded-md p-6 h-fit">
          <h3 className="heading text-lg font-bold mb-6">Saga Execution Logs</h3>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {order.sagaLogs?.map((log) => {
              const eventName = log.eventType || log.event_type || "UNKNOWN";
              const logStatus = log.status || (eventName.includes("fail") || eventName.includes("cancel") ? "FAILED" : "SUCCESS");
              const rawDate = log.createdAt || log.created_at;
              let dateDisplay = "–";
              if (rawDate) {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) dateDisplay = d.toLocaleTimeString();
              }
              return (
                <div key={log.id} data-testid={`admin-saga-log-${eventName.toLowerCase()}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-border bg-panel text-text-muted group-[.is-active]:border-success group-[.is-active]:bg-success group-[.is-active]:text-panel shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  </div>

                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-md border border-border bg-background">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-sm">{eventName}</div>
                      <div className={clsx(
                        "text-xs font-bold",
                        logStatus === "SUCCESS" ? "text-success" : "text-failed"
                      )}>
                        {logStatus}
                      </div>
                    </div>
                    <div className="text-text-muted text-xs tech-data">
                      {dateDisplay}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {(!order.sagaLogs || order.sagaLogs.length === 0) && (
              <p data-testid="empty-saga-logs" className="text-sm text-text-muted text-center relative z-10">No logs available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

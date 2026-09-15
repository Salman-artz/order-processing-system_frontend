"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { Order } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Mock data — deterministic for demo                                          */
/* -------------------------------------------------------------------------- */
const MOCK_ORDERS: Order[] = [
  { id: "o1", userId: "u1", status: "COMPLETED",  totalAmount: 1200000,  items: [], createdAt: "2026-08-21T10:00:00Z", updatedAt: "" },
  { id: "o2", userId: "u2", status: "PENDING",     totalAmount: 4500000,  items: [], createdAt: "2026-08-22T10:00:00Z", updatedAt: "" },
  { id: "o3", userId: "u3", status: "CANCELLED",   totalAmount: 950000,   items: [], createdAt: "2026-08-22T11:00:00Z", updatedAt: "" },
  { id: "o4", userId: "u4", status: "COMPLETED",   totalAmount: 8750000,  items: [], createdAt: "2026-08-23T09:00:00Z", updatedAt: "" },
  { id: "o5", userId: "u5", status: "COMPLETED",   totalAmount: 1350000,  items: [], createdAt: "2026-08-23T14:00:00Z", updatedAt: "" },
  { id: "o6", userId: "u6", status: "RESERVED",    totalAmount: 2850000,  items: [], createdAt: "2026-08-24T08:00:00Z", updatedAt: "" },
  { id: "o7", userId: "u7", status: "COMPLETED",   totalAmount: 425000,   items: [], createdAt: "2026-08-24T15:00:00Z", updatedAt: "" },
  { id: "o8", userId: "u8", status: "CANCELLED",   totalAmount: 28500000, items: [], createdAt: "2026-08-25T10:00:00Z", updatedAt: "" },
  { id: "o9", userId: "u9", status: "COMPLETED",   totalAmount: 5200000,  items: [], createdAt: "2026-08-26T10:00:00Z", updatedAt: "" },
  { id: "o10",userId: "u1", status: "PENDING",     totalAmount: 1750000,  items: [], createdAt: "2026-08-27T09:00:00Z", updatedAt: "" },
];

const PIE_COLORS: Record<string, string> = {
  COMPLETED: "#2DD4BF",
  PENDING:   "#F5A623",
  CANCELLED: "#F0453D",
  RESERVED:  "#6366F1",
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */
function groupByDay(orders: Order[]) {
  const map: Record<string, { day: string; revenue: number; count: number }> = {};
  for (const o of orders) {
    const rawDate = o.createdAt || o.created_at;
    let day = "Recent";
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        day = d.toLocaleDateString("en", { weekday: "short", day: "numeric" });
      }
    }
    if (!map[day]) map[day] = { day, revenue: 0, count: 0 };
    const amt = Number(o.totalAmount ?? o.total_amount ?? 0);
    if (o.status === "COMPLETED") map[day].revenue += amt;
    map[day].count += 1;
  }
  return Object.values(map);
}

function groupByStatus(orders: Order[]) {
  const map: Record<string, number> = {};
  for (const o of orders) {
    map[o.status] = (map[o.status] ?? 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function calcSuccessRate(orders: Order[]) {
  const terminal = orders.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED");
  if (terminal.length === 0) return null;
  return ((orders.filter((o) => o.status === "COMPLETED").length / terminal.length) * 100).toFixed(1);
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */
export default function AdminDashboardPage() {
  // Poll every 10s — lightweight refresh without manual reload
  const { data: orders = [], dataUpdatedAt } = useQuery<Order[]>({
    queryKey: ["admin-dashboard-orders"],
    queryFn: async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return MOCK_ORDERS;
      const res = await api.get("/admin/orders");
      return res.data.orders ?? res.data;
    },
    refetchInterval: 10_000,          // ← poll every 10 seconds
    refetchIntervalInBackground: false, // pause polling when tab is hidden
    staleTime: 8_000,
  });

  const completed  = orders.filter((o) => o.status === "COMPLETED");
  const pending    = orders.filter((o) => o.status === "PENDING" || o.status === "RESERVED");
  const revenue    = completed.reduce((sum, o) => sum + Number(o.totalAmount ?? o.total_amount ?? 0), 0);
  const successRate = calcSuccessRate(orders);

  const byDay    = groupByDay(orders);
  const byStatus = groupByStatus(orders);

  const lastRefreshed = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "–";

  return (
    <div data-testid="admin-dashboard" className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="heading text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
          <span>Auto-refreshing every 10s · Last: <span className="tech-data">{lastRefreshed}</span></span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard testId="metric-total-orders" label="Total Orders"   value={orders.length.toString()}    color="text-interactive" />
        <KpiCard testId="metric-revenue" label="Revenue (COMPLETED)" value={`Rp ${(revenue / 1_000_000).toFixed(1)}M`} color="text-success" />
        <KpiCard testId="metric-pending-orders" label="Pending / In-flight" value={pending.length.toString()}  color="text-pending" />
        <KpiCard
          testId="metric-success-rate"
          label="Payment Success Rate"
          value={successRate ? `${successRate}%` : "–"}
          color={successRate && parseFloat(successRate) >= 70 ? "text-success" : "text-failed"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart: daily revenue + order count */}
        <div data-testid="chart-revenue-container" className="lg:col-span-2 bg-panel border border-border p-6 rounded-md">
          <h3 className="heading text-sm font-semibold text-text-muted uppercase tracking-wider mb-6">
            Revenue & Orders by Day
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byDay} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2A44" vertical={false} />
              <XAxis dataKey="day" stroke="#8B95A8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#8B95A8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#8B95A8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: "#1F2A44", opacity: 0.5 }}
                contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", color: "#E8ECF4", fontSize: 12 }}
              />
              <Bar yAxisId="left" dataKey="revenue" fill="#2DD4BF" radius={[4, 4, 0, 0]} name="Revenue (Rp)" />
              <Bar yAxisId="right" dataKey="count"   fill="#6366F1" radius={[4, 4, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart: status distribution */}
        <div data-testid="chart-status-container" className="bg-panel border border-border p-6 rounded-md">
          <h3 className="heading text-sm font-semibold text-text-muted uppercase tracking-wider mb-6">
            Order Status Mix
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={byStatus}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {byStatus.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={PIE_COLORS[entry.name] ?? "#8B95A8"}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#8B95A8", fontSize: 11 }}>{value}</span>
                )}
              />
              <Tooltip
                contentStyle={{ background: "#131B2E", border: "1px solid #1F2A44", color: "#E8ECF4", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders table */}
      <div data-testid="table-recent-orders" className="bg-panel border border-border rounded-md">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="heading text-sm font-semibold">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Order ID</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-right px-6 py-3 font-medium">Amount</th>
                <th className="text-right px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order) => {
                const amt = Number(order.totalAmount ?? order.total_amount ?? 0);
                const rawDate = order.createdAt || order.created_at;
                let dateDisplay = "–";
                if (rawDate) {
                  const d = new Date(rawDate);
                  if (!isNaN(d.getTime())) dateDisplay = d.toLocaleDateString();
                }
                return (
                  <tr key={order.id} data-testid={`recent-order-row-${order.id}`} className="border-b border-border/50 last:border-0 hover:bg-background/50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="tech-data text-interactive">{order.id}</span>
                    </td>
                    <td className="px-6 py-3">
                      <StatusPill status={order.status} />
                    </td>
                    <td className="px-6 py-3 text-right tech-data font-bold">
                      Rp {amt.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-3 text-right text-text-muted text-xs">
                      {dateDisplay}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                              */
/* -------------------------------------------------------------------------- */
function KpiCard({ testId, label, value, color }: { testId?: string; label: string; value: string; color: string }) {
  return (
    <div data-testid={testId} className="bg-panel border border-border rounded-md p-5">
      <p className="text-text-muted text-xs font-medium mb-2">{label}</p>
      <p className={`tech-data text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    COMPLETED: "text-success border-success/30 bg-success/10",
    PENDING:   "text-pending border-pending/30 bg-pending/10",
    CANCELLED: "text-failed border-failed/30 bg-failed/10",
    RESERVED:  "text-interactive border-interactive/30 bg-interactive/10",
  };
  return (
    <span className={`tech-data text-[10px] font-semibold px-2 py-0.5 rounded border ${cls[status] ?? "text-text-muted border-border"}`}>
      {status}
    </span>
  );
}

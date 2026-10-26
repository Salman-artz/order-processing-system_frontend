"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrderService } from "@/services/order.service";
import { ProductService, ProductItem } from "@/services/product.service";
import { SagaService, MicroserviceNode, TraceSpan } from "@/services/saga.service";
import TraceDrawer from "@/components/TraceDrawer";
import SagaTimeline from "@/components/SagaTimeline";
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
  Cell 
} from "recharts";
import { 
  Activity, 
  Cpu, 
  Radio, 
  Server, 
  ShieldAlert, 
  CheckCircle2, 
  RotateCcw, 
  ArrowUpRight, 
  Clock, 
  Layers 
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

const THROUGHPUT_DATA = [
  { time: "10:00", events: 820, latency: 12 },
  { time: "10:15", events: 1140, latency: 14 },
  { time: "10:30", events: 1420, latency: 13 },
  { time: "10:45", events: 980, latency: 15 },
  { time: "11:00", events: 1650, latency: 14 },
  { time: "11:15", events: 1890, latency: 16 },
  { time: "11:30", events: 1420, latency: 14 },
];

export default function AdminDashboardPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerOrderId, setDrawerOrderId] = useState("ord-8f92a104");
  const [drawerSpans, setDrawerSpans] = useState<TraceSpan[]>([]);

  // 1. Fetch Orders via Domain Service
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders-list"],
    queryFn: () => OrderService.listAllOrders(),
    staleTime: 10_000,
  });

  const { data: products = [] } = useQuery<ProductItem[]>({
    queryKey: ["admin-products-dashboard"],
    queryFn: () => ProductService.getProducts(),
    staleTime: 15_000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => OrderService.getMetrics(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: healthData } = useQuery({
    queryKey: ["services-health"],
    queryFn: () => SagaService.getMicroservicesHealthAsync(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const microservices = healthData ?? SagaService.getMicroservicesHealth();

  const handleOpenTrace = (orderId: string) => {
    setDrawerOrderId(orderId);
    setDrawerSpans(SagaService.getTraceForOrder(orderId));
    setIsDrawerOpen(true);
  };

  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
  const cancelledCount = orders.filter((o) => o.status === "CANCELLED").length;
  const totalOrders = orders.length;

  const totalSKUs = products.length;
  const totalPhysical = products.reduce((sum, p) => sum + p.stock, 0);
  const totalAvailable = products.reduce((sum, p) => sum + p.stock_available, 0);
  const totalReserved = products.reduce((sum, p) => sum + p.stock_reserved, 0);
  const lowStockCount = products.filter((p) => p.is_low_stock).length;

  const sagaDistribution = [
    { name: "COMPLETED", value: orders.filter(o => o.status === "COMPLETED").length, color: "#35B779" },
    { name: "CANCELLED / ROLLBACK", value: orders.filter(o => o.status === "CANCELLED").length, color: "#EF4444" },
    { name: "IN-PROGRESS", value: orders.filter(o => ["PENDING", "RESERVED", "PAID"].includes(o.status)).length, color: "#F59E0B" },
  ];

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Trace Drawer */}
      <TraceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        orderId={drawerOrderId}
        traceSpans={drawerSpans}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="heading text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <Activity size={18} className="text-interactive" />
            Distributed Telemetry & Cluster Monitor
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time observability into Saga Choreography transactions and NATS message throughput
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border font-semibold",
            microservices.every(s => s.status === "OPERATIONAL") ? "text-success" : "text-warning"
          )}>
            <span className={clsx("w-2 h-2 rounded-full", microservices.every(s => s.status === "OPERATIONAL") ? "bg-success" : "bg-warning")} />
            {microservices.filter(s => s.status === "OPERATIONAL").length}/{microservices.length} SERVICES OPERATIONAL
          </span>
        </div>
      </div>

      {/* KPI Telemetry Cards Grid: Saga & Throughput */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>TOTAL SAGA EVENTS</span>
            <Activity size={14} className="text-interactive" />
          </div>
          <div className="text-xl font-bold text-text-main tech-data">{totalOrders.toLocaleString()}</div>
          <div className="text-[10px] text-text-muted flex items-center gap-1">
            <span className="text-success font-semibold">{completedCount} completed</span> / {cancelledCount} cancelled
          </div>
        </div>

        <div className="p-3.5 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>SAGA SUCCESS RATE</span>
            <CheckCircle2 size={14} className="text-success" />
          </div>
          <div className="text-xl font-bold text-success tech-data">{totalOrders > 0 ? ((completedCount / totalOrders) * 100).toFixed(1) : '0'}%</div>
          <div className="text-[10px] text-text-muted">
            {completedCount} committed / {cancelledCount} compensated
          </div>
        </div>

        <div className="p-3.5 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>MEDIAN LATENCY (p50)</span>
            <Clock size={14} className="text-interactive" />
          </div>
          <div className="text-xl font-bold text-text-main tech-data">{metrics?.median_latency ?? '14ms'}</div>
          <div className="text-[10px] text-text-muted">
            p99: 42ms across all nodes
          </div>
        </div>

        <div className="p-3.5 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>COMPENSATION ROLLBACKS</span>
            <RotateCcw size={14} className="text-failed" />
          </div>
          <div className="text-xl font-bold text-failed tech-data">{totalOrders > 0 ? ((cancelledCount / totalOrders) * 100).toFixed(1) : '0'}%</div>
          <div className="text-[10px] text-text-muted">
            Zero stock drift in PostgreSQL
          </div>
        </div>
      </div>

      {/* WMS Warehouse Inventory Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>CATALOG ACTIVE SKUS</span>
            <Layers size={14} className="text-interactive" />
          </div>
          <div className="text-xl font-bold text-text-main tech-data">{totalSKUs} SKUs</div>
          <div className="text-[10px] text-text-muted flex items-center gap-1">
            <span className={lowStockCount > 0 ? "text-failed font-semibold" : "text-success font-semibold"}>
              {lowStockCount} below min threshold
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>PHYSICAL ON-HAND STOCK</span>
            <CheckCircle2 size={14} className="text-success" />
          </div>
          <div className="text-xl font-bold text-text-main tech-data">{totalPhysical} Units</div>
          <div className="text-[10px] text-text-muted">
            Across active storage bins
          </div>
        </div>

        <div className="p-3.5 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>AVAILABLE UNLOCKED</span>
            <CheckCircle2 size={14} className="text-success" />
          </div>
          <div className="text-xl font-bold text-success tech-data">{totalAvailable} Units</div>
          <div className="text-[10px] text-text-muted">
            Ready for customer allocation
          </div>
        </div>

        <div className="p-3.5 rounded bg-panel border border-border space-y-1">
          <div className="flex items-center justify-between text-text-dim text-[11px]">
            <span>SAGA RESERVED LOCKS</span>
            <RotateCcw size={14} className="text-interactive" />
          </div>
          <div className="text-xl font-bold text-interactive tech-data">{totalReserved} Units</div>
          <div className="text-[10px] text-text-muted">
            Pessimistic Saga transaction locks
          </div>
        </div>
      </div>

      {/* Two Column Charts: Event Volume & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Event Throughput Bar Chart (8 cols) */}
        <div className="lg:col-span-8 p-4 rounded bg-panel border border-border space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-main flex items-center gap-2">
              <Radio size={14} className="text-interactive" />
              NATS JETSTREAM EVENT INGESTION THROUGHPUT (EVT/MIN)
            </span>
            <span className="text-[10px] text-text-dim">STREAM: ORDERS_STREAM</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={THROUGHPUT_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262B35" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-panel)",
                    borderColor: "var(--border-color)",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-main)",
                  }}
                />
                <Bar dataKey="events" fill="#F59E0B" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Saga Distribution Donut (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded bg-panel border border-border space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-main flex items-center gap-2">
              <Layers size={14} className="text-interactive" />
              SAGA STATUS RATIO
            </span>
            <span className="text-[10px] text-text-dim">ACID vs COMPENSATION</span>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sagaDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {sagaDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-panel)",
                    borderColor: "var(--border-color)",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-[11px] border-t border-border pt-2.5">
            {sagaDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-text-muted">
                  <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-text-main">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Microservices Topology Health Strip */}
      <div className="p-4 rounded bg-panel border border-border space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-text-main flex items-center gap-2">
            <Server size={14} className="text-interactive" />
            MICROSERVICES CLUSTER TOPOLOGY & DATABASE PER SERVICE
          </span>
          <span className="text-[10px] text-text-dim">PROTOCOLS: HTTP/2 • gRPC • NATS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          {microservices.map((svc) => (
            <div key={svc.id} className="p-3 rounded bg-card/60 border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-text-main">{svc.name}</span>
                <span className={clsx(
                  "text-[10px] px-1 py-0.5 rounded font-bold",
                  svc.status === "OPERATIONAL" ? "text-success bg-success/10 border border-success/30" :
                  svc.status === "DEGRADED" ? "text-warning bg-warning/10 border border-warning/30" :
                  "text-failed bg-failed/10 border border-failed/30"
                )}>
                  {svc.status}
                </span>
              </div>
              <div className="text-[11px] text-text-dim flex justify-between">
                <span>Latency:</span>
                <span className="text-text-main font-semibold">{svc.latency}</span>
              </div>
              <div className="text-[11px] text-text-dim flex justify-between">
                <span>Database:</span>
                <span className="text-text-muted truncate max-w-[110px]">{svc.database}</span>
              </div>
              <div className="text-[10px] text-text-dim border-t border-border pt-1 flex justify-between">
                <span>Events:</span>
                <span className="text-interactive font-bold">{svc.eventsProcessed.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Distributed Transactions Table */}
      <div className="rounded bg-panel border border-border overflow-hidden">
        <div className="p-3 border-b border-border bg-card/40 flex items-center justify-between text-xs">
          <span className="font-bold text-text-main flex items-center gap-2">
            <Activity size={14} className="text-interactive" />
            RECENT DISTRIBUTED SAGA TRANSACTIONS
          </span>
          <Link href="/admin/orders" className="text-interactive hover:underline text-[11px] flex items-center gap-1">
            <span>View All Orders</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-card/70 border-b border-border text-[10px] text-text-dim uppercase">
              <tr>
                <th className="py-2.5 px-3">Transaction / Order ID</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Settlement Amount</th>
                <th className="py-2.5 px-3">Saga Choreography Flow</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {orders.slice(0, 5).map((order) => {
                const amt = Number(order.totalAmount || order.total_amount || 0);
                const rawDate = order.createdAt || order.created_at;
                const dateStr = rawDate ? new Date(rawDate).toLocaleTimeString() : "–";

                return (
                  <tr key={order.id} className="hover:bg-card/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-text-main">
                      <button
                        onClick={() => handleOpenTrace(order.id)}
                        className="text-interactive hover:underline font-mono"
                      >
                        {order.id}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-text-muted text-[11px]">{dateStr}</td>
                    <td className="py-2.5 px-3 font-bold text-text-main">
                      Rp {amt.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2.5 px-3">
                      <SagaTimeline status={order.status} compact />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleOpenTrace(order.id)}
                        className="px-2 py-1 rounded bg-card border border-border text-text-muted hover:text-text-main hover:border-interactive transition-colors text-[11px]"
                      >
                        Inspect Trace
                      </button>
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

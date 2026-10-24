"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText, 
  Activity, 
  Layers, 
  Database,
  Terminal
} from "lucide-react";
import clsx from "clsx";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const customerLinks = [
    { name: "Live Operations Cockpit", href: "/customer/products", icon: Terminal, badge: "SIMULATOR" },
    { name: "Customer Orders & Saga", href: "/customer/orders", icon: ShoppingCart },
  ];

  const adminLinks = [
    { name: "Telemetry Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, badge: "METRICS" },
    { name: "Inventory & Rollback", href: "/admin/inventory", icon: Package, badge: "POSTGRES" },
    { name: "Distributed Orders", href: "/admin/orders", icon: FileText },
    { name: "Live Operations Cockpit", href: "/customer/products", icon: Terminal },
  ];

  const links = isAdmin ? adminLinks : customerLinks;

  return (
    <aside data-testid="sidebar" className="w-60 h-full bg-panel border-r border-border flex flex-col shrink-0 select-none">
      {/* Topology summary */}
      <div className="p-3.5 border-b border-border bg-card/40">
        <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-1.5">
          <span className="flex items-center gap-1.5 font-semibold text-text-main">
            <Activity size={13} className="text-success" /> CLUSTER TOPOLOGY
          </span>
          <span className="text-[10px] text-success bg-success/10 px-1 py-0.5 rounded border border-success/30 font-bold">
            HEALTHY
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-text-muted">
          <div className="p-1.5 rounded bg-background border border-border">
            <span className="block text-text-dim">Services</span>
            <span className="text-text-main font-bold">4 Microservices</span>
          </div>
          <div className="p-1.5 rounded bg-background border border-border">
            <span className="block text-text-dim">Message Broker</span>
            <span className="text-interactive font-bold">NATS JetStream</span>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-mono tracking-wider text-text-dim uppercase px-2 mb-2">
          Navigation Control
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/customer/products" && pathname.startsWith(link.href));
          const testId = `nav-link-${link.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

          return (
            <Link
              key={link.href}
              href={link.href}
              data-testid={testId}
              className={clsx(
                "flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-all border",
                isActive
                  ? "bg-card border-interactive/50 text-interactive shadow-xs"
                  : "border-transparent text-text-muted hover:bg-card hover:border-border hover:text-text-main"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} className={isActive ? "text-interactive" : "text-text-muted"} />
                <span>{link.name}</span>
              </div>
              {link.badge && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-background border border-border text-text-dim">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System environment footer */}
      <div className="p-3 border-t border-border bg-card/20 text-[11px] font-mono text-text-muted space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-text-dim">Active Account:</span>
          <span className="text-text-main truncate max-w-[110px]" title={user?.email}>{user?.email || "guest@ops.io"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-dim">Consistency:</span>
          <span className="text-success">Eventual (Saga)</span>
        </div>
      </div>
    </aside>
  );
}

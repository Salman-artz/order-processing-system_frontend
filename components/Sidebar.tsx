"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText, 
  Layers,
  Database,
  Terminal
} from "lucide-react";
import clsx from "clsx";

interface NavLinkItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

interface NavSection {
  title: string;
  links: NavLinkItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const navSections: NavSection[] = [
    {
      title: "OVERVIEW",
      links: [
        { name: "Executive Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, badge: "METRICS" },
        { name: "Operations Cockpit", href: "/customer/products", icon: Terminal, badge: "LIVE" },
      ],
    },
    {
      title: "WAREHOUSE",
      links: [
        { name: "Inventory & SKUs", href: "/admin/inventory", icon: Package, badge: "LEDGER" },
      ],
    },
    {
      title: "COMMERCE & SAGA",
      links: [
        { name: "Order Fulfillment", href: "/admin/orders", icon: FileText },
        { name: "Customer Portal", href: "/customer/orders", icon: ShoppingCart },
      ],
    },
  ];

  return (
    <aside data-testid="sidebar" className="w-60 h-full bg-panel border-r border-border flex flex-col shrink-0 select-none">
      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {navSections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <div className="text-[10px] font-mono tracking-wider text-text-dim uppercase px-2 mb-1">
              {sec.title}
            </div>
            {sec.links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/customer/products" && pathname.startsWith(link.href));
              const testId = `nav-link-${link.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-testid={testId}
                  className={clsx(
                    "flex items-center justify-between px-3 py-1.5 rounded text-xs font-medium transition-all border",
                    isActive
                      ? "bg-card border-interactive/50 text-interactive shadow-xs"
                      : "border-transparent text-text-muted hover:bg-card hover:border-border hover:text-text-main"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={isActive ? "text-interactive" : "text-text-muted"} />
                    <span>{link.name}</span>
                  </div>
                  {link.badge && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-background border border-border text-text-dim">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
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

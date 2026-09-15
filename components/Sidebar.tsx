"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { LayoutDashboard, Package, ShoppingCart, LogOut, FileText } from "lucide-react";
import clsx from "clsx";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const customerLinks = [
    { name: "Products", href: "/customer/products", icon: Package },
    { name: "My Orders", href: "/customer/orders", icon: ShoppingCart },
  ];

  const adminLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Inventory", href: "/admin/inventory", icon: Package },
    { name: "All Orders", href: "/admin/orders", icon: FileText },
  ];

  const links = isAdmin ? adminLinks : customerLinks;

  return (
    <div data-testid="sidebar" className="w-64 h-full bg-panel border-r border-border flex flex-col shrink-0">
      <div className="p-6 border-b border-border">
        <h1 className="heading text-xl font-bold text-success">OPS</h1>
        <p data-testid="user-email" className="text-sm text-text-muted mt-1">{user?.email}</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.href);
          const testId = `nav-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              data-testid={testId}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                isActive 
                  ? "bg-interactive/10 text-interactive" 
                  : "text-text-muted hover:bg-border hover:text-text-main"
              )}
            >
              <Icon size={20} />
              <span className="font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          data-testid="btn-logout"
          onClick={() => {
            logout();
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('logged_out', 'true');
              window.location.href = "/login";
            }
          }}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-failed hover:bg-failed/10 rounded-md transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

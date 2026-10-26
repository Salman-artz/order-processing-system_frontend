"use client";

import { useThemeStore } from "@/lib/store/useThemeStore";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Sun, Moon, Cpu, Radio, ShieldCheck, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, login, logout } = useAuthStore();
  const router = useRouter();

  const handleRoleToggle = () => {
    if (user?.role === "ADMIN") {
      login("mock-cust-token", { id: "usr-cust-01", email: "customer@ops.io", role: "CUSTOMER" });
      router.push("/customer/products");
    } else {
      login("mock-admin-token", { id: "usr-admin-01", email: "admin@ops.io", role: "ADMIN" });
      router.push("/admin/dashboard");
    }
  };

  return (
    <header className="h-14 border-b border-border bg-panel px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* Brand & Emblem */}
      <div className="flex items-center gap-3">
        <Link href={user?.role === "ADMIN" ? "/admin/dashboard" : "/customer/products"} className="flex items-center gap-2.5">
          <img
            src="/brand/warehouseflow-icon.svg"
            alt="WarehouseFlow"
            className="w-7 h-7 object-contain"
          />
          <div className="flex flex-col">
            <span className="tech-data font-bold tracking-tight text-sm text-text-main flex items-center gap-1.5">
              Warehouse<span className="text-interactive font-extrabold">Flow</span>
            </span>
            <span className="text-[10px] text-text-muted font-mono tracking-wider">
              From Inventory to Delivery, in Real Time.
            </span>
          </div>
        </Link>
      </div>

      {/* Middle Telemetry Badges */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
        {/* NATS JetStream status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-card border border-border">
          <Radio size={13} className="text-success" />
          <span className="text-text-muted">NATS JetStream:</span>
          <span className="text-success font-semibold">CONNECTED</span>
          <span className="text-text-dim text-[11px]">(4 Consumers)</span>
        </div>

        {/* Throughput */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-card border border-border">
          <Cpu size={13} className="text-interactive" />
          <span className="text-text-muted">Throughput:</span>
          <span className="text-text-main font-semibold">1,420 evt/s</span>
          <span className="text-text-dim text-[11px]">(p99: 14ms)</span>
        </div>

        {/* Environment */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border text-text-muted">
          <ShieldCheck size={13} className="text-success" />
          <span>PostgreSQL (DB-per-Service)</span>
        </div>
      </div>

      {/* Controls & User */}
      <div className="flex items-center gap-2.5">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-card border border-border text-text-muted hover:text-text-main hover:border-interactive transition-colors text-xs font-mono"
        >
          {theme === "dark" ? <Sun size={14} className="text-interactive" /> : <Moon size={14} className="text-interactive" />}
          <span className="capitalize">{theme}</span>
        </button>

        {/* Role Switcher */}
        <button
          onClick={handleRoleToggle}
          title="Switch role between Admin & Customer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-card border border-border text-xs font-mono text-text-muted hover:text-text-main hover:border-interactive transition-colors"
        >
          <UserIcon size={13} className="text-interactive" />
          <span>Role: <strong className="text-interactive">{user?.role || "CUSTOMER"}</strong></span>
        </button>

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          title="Sign out"
          className="p-1.5 rounded bg-card border border-border text-failed/80 hover:text-failed hover:border-failed/40 transition-colors"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}

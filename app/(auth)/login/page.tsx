"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { useThemeStore } from "@/lib/store/useThemeStore";
import { toast } from "sonner";
import { Sun, Moon, ShieldCheck, Radio, Cpu, ArrowRight, Lock, Mail } from "lucide-react";
import clsx from "clsx";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useThemeStore();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "admin@ops.io",
      password: "password123",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await AuthService.login(data);
      toast.success("Authenticated Successfully", {
        description: `Welcome back, ${res.user.email} (${res.user.role})`,
      });
      router.replace(res.user.role === "ADMIN" ? "/admin/dashboard" : "/customer/products");
    } catch (err: any) {
      toast.error("Authentication Failed", {
        description: err.response?.data?.error || "Invalid credentials provided.",
      });
    }
  };

  const handleQuickLogin = async (role: "ADMIN" | "CUSTOMER") => {
    setLoadingRole(role);
    const email = role === "ADMIN" ? "admin@ops.io" : "customer@ops.io";
    setValue("email", email);
    setValue("password", "password123");
    try {
      const res = await AuthService.login({ email, password: "password123" });
      toast.success("Demo Session Activated", {
        description: `Logged in as ${role}: ${email}`,
      });
      router.replace(role === "ADMIN" ? "/admin/dashboard" : "/customer/products");
    } catch (err: any) {
      toast.error("Login failed");
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-background p-4 sm:p-8 select-none font-mono">
      {/* Top Header / Switcher */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-panel border border-border flex items-center justify-center font-bold text-interactive text-sm shadow-xs">
            ⚡
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-text-main flex items-center gap-1.5">
              OPS<span className="text-text-dim">/</span>MICROSERVICES
            </span>
            <span className="block text-[10px] text-text-muted">DISTRIBUTED SAGA TELEMETRY</span>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-panel border border-border text-xs text-text-muted hover:text-text-main hover:border-interactive transition-colors"
        >
          {theme === "dark" ? <Sun size={14} className="text-interactive" /> : <Moon size={14} className="text-interactive" />}
          <span className="capitalize">{theme} Mode</span>
        </button>
      </div>

      {/* Main Login Box */}
      <div className="w-full max-w-md mx-auto my-auto">
        <div className="bg-panel border border-border rounded p-6 sm:p-8 shadow-xl space-y-6">
          {/* Header */}
          <div className="space-y-1 text-center">
            <h1 className="heading text-xl font-bold text-text-main tracking-tight">
              Enterprise Operations Console
            </h1>
            <p className="text-xs text-text-muted">
              Authenticate to manage distributed Saga transactions
            </p>
          </div>

          {/* Quick Demo Selector */}
          <div className="p-3 rounded bg-background border border-border space-y-2">
            <div className="text-[10px] text-text-dim uppercase tracking-wider flex justify-between">
              <span>Quick Demo Profiles:</span>
              <span className="text-success font-semibold">Ready to Test</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                disabled={loadingRole !== null}
                onClick={() => handleQuickLogin("ADMIN")}
                className="py-2 px-3 rounded bg-panel border border-border hover:border-interactive text-text-main transition-all font-semibold flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={13} className="text-interactive" />
                <span>Admin Lead</span>
              </button>
              <button
                type="button"
                disabled={loadingRole !== null}
                onClick={() => handleQuickLogin("CUSTOMER")}
                className="py-2 px-3 rounded bg-panel border border-border hover:border-interactive text-text-main transition-all font-semibold flex items-center justify-center gap-1.5"
              >
                <Mail size={13} className="text-interactive" />
                <span>Customer</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-[11px] text-text-muted uppercase tracking-wider block">
                Engineering Identity (Email)
              </label>
              <div className="relative">
                <input
                  type="email"
                  {...register("email")}
                  placeholder="name@ops.io"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive transition-colors pl-8 text-xs font-mono"
                />
                <Mail size={14} className="absolute left-2.5 top-2.5 text-text-dim" />
              </div>
              {errors.email && <p className="text-[10px] text-failed">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-text-muted uppercase tracking-wider block">
                Access Token / Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  {...register("password")}
                  placeholder="••••••••••••"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-text-main focus:outline-none focus:border-interactive transition-colors pl-8 text-xs font-mono"
                />
                <Lock size={14} className="absolute left-2.5 top-2.5 text-text-dim" />
              </div>
              {errors.password && <p className="text-[10px] text-failed">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded bg-interactive/15 border border-interactive/50 text-interactive hover:bg-interactive/25 hover:border-interactive transition-all font-bold flex items-center justify-center gap-2 mt-2"
            >
              <span>{isSubmitting ? "Authenticating..." : "Sign In to Cluster"}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Telemetry Footer Meta */}
          <div className="pt-4 border-t border-border/60 text-[10px] text-text-dim space-y-1 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="flex items-center gap-1">
                <Radio size={11} className="text-success" /> NATS JetStream 2.10
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Cpu size={11} className="text-interactive" /> Go Fiber Microservices
              </span>
            </div>
            <div>PostgreSQL Multi-Database Pattern • gRPC Ready</div>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <div className="max-w-4xl w-full mx-auto text-center text-[10px] text-text-dim">
        OPS Distributed Order Processing System • Engineering Portfolio Architecture
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthService } from "@/services/auth.service";
import { useThemeStore } from "@/lib/store/useThemeStore";
import { toast } from "sonner";
import { Sun, Moon, Radio, Cpu, ArrowRight, Lock, Mail } from "lucide-react";
import clsx from "clsx";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useThemeStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
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

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-background p-4 sm:p-8 select-none font-mono">
      {/* Top Header / Switcher */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/brand/warehouseflow-logo-horizontal.svg"
            alt="WarehouseFlow"
            className="h-8 object-contain"
          />
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
              WarehouseFlow Console
            </h1>
            <p className="text-xs text-text-muted">
              From Inventory to Delivery, in Real Time.
            </p>
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

            <div className="text-center pt-2 text-text-dim text-[11px]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-interactive hover:underline">
                Create Account
              </Link>
            </div>
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
        WarehouseFlow Distributed WMS & Order Fulfillment • Saga Choreography & NATS JetStream
      </div>
    </div>
  );
}

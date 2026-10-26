"use client";

import { OrderStatus } from "@/types";
import { Check, X, AlertTriangle, ArrowRight, ShieldAlert, RotateCcw } from "lucide-react";
import clsx from "clsx";

interface SagaTimelineProps {
  status: OrderStatus;
  compact?: boolean;
}

interface Step {
  id: string;
  label: string;
  service: string;
  latency: string;
  description: string;
}

const STEPS: Step[] = [
  { id: "PENDING", label: "Order Created", service: "order-service", latency: "12ms", description: "Order persisted as PENDING" },
  { id: "RESERVED", label: "Stock Reserved", service: "inventory-service", latency: "18ms", description: "PostgreSQL stock lock acquired" },
  { id: "PAID", label: "Payment Processed", service: "payment-service", latency: "35ms", description: "Midtrans settlement verified" },
  { id: "COMPLETED", label: "Saga Completed", service: "order-service", latency: "10ms", description: "Order marked COMPLETED" },
];

function getActiveIndex(status: OrderStatus): number {
  switch (status) {
    case "PENDING":
      return 0;
    case "INVENTORY_RESERVED":
    case "RESERVED":
      return 1;
    case "PAYMENT_PENDING":
    case "PAID":
    case "CONFIRMED":
      return 2;
    case "PICKING":
    case "PACKED":
    case "DISPATCHED":
    case "COMPLETED":
      return 3;
    case "CANCELLED":
    case "PAYMENT_FAILED":
    case "COMPENSATION_PENDING":
    case "COMPENSATION_FAILED":
      return 1; // Stock was reserved, then rolled back
    default:
      return 0;
  }
}

export default function SagaTimeline({ status, compact = false }: SagaTimelineProps) {
  const isCancelled = status === "CANCELLED" || status === "PAYMENT_FAILED" || status === "COMPENSATION_FAILED" || status === "COMPENSATION_PENDING";
  const activeIndex = getActiveIndex(status);

  if (compact) {
    return (
      <div className="flex items-center gap-2 font-mono text-xs">
        <div className="flex items-center gap-1">
          {STEPS.map((s, idx) => {
            const isDone = !isCancelled && idx <= activeIndex;
            const isFailed = isCancelled && idx === 2; // Payment failed
            const isCompensated = isCancelled && idx === 1; // Stock compensated
            
            return (
              <div key={s.id} className="flex items-center">
                <span
                  title={`${s.label} (${s.service})`}
                  className={clsx(
                    "w-2 h-2 rounded-xs border transition-colors",
                    isDone ? "bg-success border-success" :
                    isFailed ? "bg-failed border-failed" :
                    isCompensated ? "bg-interactive border-interactive" :
                    "bg-card border-border"
                  )}
                />
                {idx < STEPS.length - 1 && <span className="w-2.5 h-[1px] bg-border mx-0.5" />}
              </div>
            );
          })}
        </div>
        <span
          className={clsx(
            "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
            status === "COMPLETED" ? "bg-success/15 border-success/40 text-success" :
            status === "CANCELLED" ? "bg-failed/15 border-failed/40 text-failed" :
            status === "RESERVED" ? "bg-interactive/15 border-interactive/40 text-interactive" :
            "bg-card border-border text-text-muted"
          )}
        >
          {status}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Visual Step Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        {STEPS.map((step, idx) => {
          const isPassed = !isCancelled ? idx <= activeIndex : idx <= 1;
          const isCurrent = !isCancelled && idx === activeIndex;
          const isFailPoint = isCancelled && idx === 2;
          const isCompensatedNode = isCancelled && idx === 1;

          return (
            <div
              key={step.id}
              className={clsx(
                "p-3 rounded border font-mono text-xs transition-all relative",
                isPassed && !isCancelled ? "bg-card border-success/40 text-text-main" :
                isFailPoint ? "bg-failed/10 border-failed/60 text-failed" :
                isCompensatedNode ? "bg-card border-interactive/60 text-interactive" :
                "bg-card/40 border-border text-text-muted"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-text-dim uppercase tracking-wider">Step 0{idx + 1}</span>
                <span className="text-[10px] px-1 rounded bg-background border border-border">
                  {step.latency}
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                {isPassed && !isCancelled && <Check size={13} className="text-success" />}
                {isFailPoint && <X size={13} className="text-failed" />}
                {isCompensatedNode && <RotateCcw size={13} className="text-interactive" />}
                <span>{step.label}</span>
              </div>

              <p className="text-[11px] text-text-muted leading-tight mb-1.5">
                {step.description}
              </p>

              <div className="text-[10px] text-text-dim flex items-center justify-between border-t border-border/60 pt-1.5">
                <span>Node:</span>
                <span className="text-text-main font-semibold">{step.service}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compensation Rollback Banner (if cancelled) */}
      {isCancelled && (
        <div className="p-3.5 rounded bg-failed/10 border border-failed/40 text-failed text-xs font-mono flex items-start gap-3">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold tracking-tight">SAGA COMPENSATION TRIGGERED & EXECUTED:</div>
            <p className="text-text-muted leading-relaxed">
              Payment gateway rejected authorization (simulated threshold &gt; Rp 10.000.000). 
              An asynchronous <code className="text-failed bg-failed/10 px-1 py-0.5 rounded border border-failed/30">payment.failed</code> event was dispatched over NATS JetStream. 
              <strong className="text-interactive"> inventory-service</strong> executed automatic rollback: reserved stock restored back to PostgreSQL ledger.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

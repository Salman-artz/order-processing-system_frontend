"use client";

import { motion } from "framer-motion";
import { OrderStatus } from "@/types";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";

interface SagaTimelineProps {
  status: OrderStatus;
  compact?: boolean;
}

interface Step {
  id: OrderStatus | "AWAITING_PAYMENT";
  label: string;
  subLabel?: string;
}

const STEPS: Step[] = [
  { id: "PENDING", label: "Order Created", subLabel: "Saga initiated" },
  { id: "RESERVED", label: "Stock Reserved", subLabel: "Inventory locked" },
  { id: "AWAITING_PAYMENT", label: "Payment", subLabel: "Processing..." },
  { id: "COMPLETED", label: "Completed", subLabel: "Order fulfilled" },
];

/** Map a runtime OrderStatus to the step index it has reached */
function getActiveIndex(status: OrderStatus): number {
  switch (status) {
    case "PENDING":       return 0;
    case "RESERVED":      return 1;
    case "PAID":          return 2;
    case "COMPLETED":     return 3;
    case "CANCELLED":     return -1; // special case handled below
    default:              return 0;
  }
}

export default function SagaTimeline({ status, compact = false }: SagaTimelineProps) {
  const isCancelled = status === "CANCELLED";
  const activeIndex = isCancelled ? -1 : getActiveIndex(status);

  if (compact) {
    return <CompactTimeline status={status} activeIndex={activeIndex} isCancelled={isCancelled} />;
  }

  return (
    <div data-testid="saga-timeline" className="w-full">
      <div className="relative flex items-start justify-between">
        {/* Track line behind nodes */}
        <div className="absolute top-4 left-0 right-0 h-[2px] bg-border mx-[16px]" />

        {STEPS.map((step, index) => {
          const isCompleted  = !isCancelled && index < activeIndex;
          const isActive     = !isCancelled && index === activeIndex;
          const isUnreached  = !isCompleted && !isActive;
          const isFinalFail  = isCancelled && index === activeIndex + 1; // first unreached → show X

          return (
            <div key={step.id} data-testid={`saga-step-${step.id.toLowerCase()}`} className="relative z-10 flex flex-col items-center gap-2 flex-1">
              {/* Node */}
              <Node
                isCompleted={isCompleted}
                isActive={isActive}
                isCancelled={isCancelled && index === 0} // mark first node when order is cancelled
                isFinalFail={isFinalFail}
                isUnreached={isUnreached && !isFinalFail}
              />

              {/* Labels */}
              <div className="text-center">
                <p
                  className={`text-xs font-semibold transition-colors duration-300 ${
                    isCompleted ? "text-success"
                    : isActive   ? "text-pending"
                    : isCancelled && index <= 0 ? "text-failed"
                    : "text-text-muted"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5 hidden sm:block">
                  {step.subLabel}
                </p>
              </div>

              {/* Connector line (filled portion) */}
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    absolute top-4 left-1/2 right-0 h-[2px] -z-10 transition-all duration-500
                    ${isCompleted ? "bg-success" : "bg-border"}
                  `}
                  style={{ width: "100%", transform: "translateY(-50%)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Cancelled banner */}
      {isCancelled && (
        <motion.div
          data-testid="saga-cancelled-banner"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex items-center gap-2 text-failed text-sm font-medium bg-failed/10 border border-failed/20 rounded-md px-4 py-2"
        >
          <XMarkIcon className="w-4 h-4 shrink-0" />
          Order was cancelled. Any reserved stock has been released.
        </motion.div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Node component                                                              */
/* -------------------------------------------------------------------------- */
interface NodeProps {
  isCompleted: boolean;
  isActive: boolean;
  isCancelled: boolean;
  isFinalFail: boolean;
  isUnreached: boolean;
}

function Node({ isCompleted, isActive, isCancelled, isFinalFail, isUnreached }: NodeProps) {
  let ring = "border-border bg-background";
  let content: React.ReactNode = null;

  if (isCompleted) {
    ring = "border-success bg-success";
    content = <CheckIcon className="w-3 h-3 text-background" />;
  } else if (isActive) {
    ring = "border-pending bg-pending";
  } else if (isCancelled) {
    ring = "border-failed bg-failed";
    content = <XMarkIcon className="w-3 h-3 text-background" />;
  } else if (isFinalFail) {
    ring = "border-failed/50 bg-failed/10";
    content = <XMarkIcon className="w-3 h-3 text-failed/70" />;
  }

  return (
    <div className="relative">
      {/* Pulse ring — only on the active node, respects prefers-reduced-motion via Tailwind */}
      {isActive && (
        <span
          className="absolute inset-0 rounded-full bg-pending opacity-30 animate-ping motion-reduce:animate-none"
          aria-hidden
        />
      )}
      <motion.div
        layout
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.25, type: "spring", stiffness: 300 }}
        className={`
          relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center
          transition-all duration-300
          ${ring}
        `}
      />
      {/* Render icon after the outer div to overlay it */}
      {content && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {content}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Compact version (for order list cards)                                      */
/* -------------------------------------------------------------------------- */
function CompactTimeline({
  status,
  activeIndex,
  isCancelled,
}: {
  status: OrderStatus;
  activeIndex: number;
  isCancelled: boolean;
}) {
  return (
    <div data-testid="saga-compact-timeline" className="flex items-center gap-1.5" title={`Status: ${status}`}>
      {STEPS.map((step, index) => {
        const isCompleted = !isCancelled && index < activeIndex;
        const isActive    = !isCancelled && index === activeIndex;

        let dot = "bg-border";
        if (isCompleted)            dot = "bg-success";
        else if (isActive)          dot = "bg-pending animate-pulse motion-reduce:animate-none";
        else if (isCancelled)       dot = index === 0 ? "bg-failed" : "bg-failed/20";

        return (
          <div key={step.id} className="flex items-center gap-1.5 last:gap-0">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${dot}`} />
            {index < STEPS.length - 1 && (
              <div
                className={`h-[1px] w-4 transition-colors duration-500 ${
                  isCompleted ? "bg-success" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
      <span data-testid="saga-compact-status" className={`ml-2 tech-data text-[10px] font-semibold ${
        status === "COMPLETED" ? "text-success"
        : status === "CANCELLED" ? "text-failed"
        : status === "PENDING"   ? "text-text-muted"
        : "text-pending"
      }`}>
        {status}
      </span>
    </div>
  );
}

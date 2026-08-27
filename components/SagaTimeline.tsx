import { OrderStatus } from "@/types";
import clsx from "clsx";

interface SagaTimelineProps {
  status: OrderStatus;
  compact?: boolean;
}

const steps = [
  { id: "PENDING", label: "Order Created" },
  { id: "RESERVED", label: "Stock Reserved" },
  { id: "PAID", label: "Payment" },
  { id: "COMPLETED", label: "Completed" },
];

const cancelledStep = { id: "CANCELLED", label: "Cancelled" };

export default function SagaTimeline({ status, compact = false }: SagaTimelineProps) {
  // Determine if cancelled
  const isCancelled = status === "CANCELLED";
  
  // Get active index
  const activeIndex = isCancelled 
    ? -1 
    : steps.findIndex(s => s.id === status);
    
  const displaySteps = isCancelled 
    ? [...steps.slice(0, 1), cancelledStep] // If cancelled right away, or we could just show it at the end
    : steps;

  return (
    <div className={clsx("flex items-center w-full", compact ? "gap-2" : "gap-4")}>
      {steps.map((step, index) => {
        const isCompleted = !isCancelled && index <= activeIndex;
        const isActive = !isCancelled && index === activeIndex;
        const isUnreached = !isCompleted && !isActive;

        let nodeColor = "border-border";
        let bgColor = "bg-transparent";

        if (isCompleted) {
          nodeColor = "border-success";
          bgColor = "bg-success";
        }
        
        if (isActive) {
          nodeColor = "border-pending";
          bgColor = "bg-pending animate-pulse";
        }

        if (isCancelled && index === steps.length - 1) {
          // If cancelled, show a failed state maybe?
        }

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Node */}
            <div className={clsx("flex flex-col items-center gap-2")}>
              <div
                className={clsx(
                  "rounded-full border-2 transition-colors duration-300",
                  compact ? "w-3 h-3" : "w-6 h-6",
                  nodeColor,
                  bgColor
                )}
                title={step.label}
              />
              {!compact && (
                <span className={clsx(
                  "text-xs text-center font-medium",
                  isCompleted ? "text-success" : isActive ? "text-pending" : "text-text-muted"
                )}>
                  {step.label}
                </span>
              )}
            </div>

            {/* Line */}
            {index < steps.length - 1 && (
              <div
                className={clsx(
                  "h-[2px] flex-1 mx-2 transition-colors duration-300",
                  isCompleted && !isActive ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

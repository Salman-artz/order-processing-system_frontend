"use client";

import { useState } from "react";
import { TraceSpan } from "@/services/saga.service";
import { X, Check, AlertTriangle, Copy, Terminal, ChevronRight, ChevronDown, Activity, Clock } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";

interface TraceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  traceSpans: TraceSpan[];
  rawPayload?: Record<string, any>;
  correlationId?: string;
}

export default function TraceDrawer({
  isOpen,
  onClose,
  orderId,
  traceSpans,
  rawPayload,
  correlationId = "corr-8f92-a104",
}: TraceDrawerProps) {
  const [expandedSpanId, setExpandedSpanId] = useState<string | null>(traceSpans[0]?.id || null);
  const [activeTab, setActiveTab] = useState<"spans" | "payload">("spans");

  if (!isOpen) return null;

  const totalDuration = traceSpans.reduce((max, s) => Math.max(max, s.startOffsetMs + s.durationMs), 0) || 100;
  const isFailed = traceSpans.some((s) => s.status === "FAILED" || s.status === "COMPENSATED");

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(rawPayload || {}, null, 2));
    toast.success("Payload copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-2xl h-full bg-panel border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border bg-card/40 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-background border border-border text-interactive">
                TRACE INSPECTOR
              </span>
              <h2 className="tech-data font-bold text-sm text-text-main truncate max-w-sm">
                Trace: {orderId}
              </h2>
            </div>
            <p className="text-[11px] font-mono text-text-muted mt-1">
              Correlation ID: <span className="text-text-main">{correlationId}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-card border border-border text-text-muted hover:text-text-main hover:border-interactive transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Telemetry Summary Strip */}
        <div className="px-4 py-2.5 border-b border-border bg-card/20 grid grid-cols-4 gap-2 text-[11px] font-mono">
          <div className="p-2 rounded bg-background border border-border">
            <span className="block text-text-dim text-[10px]">Total Latency</span>
            <span className="text-text-main font-bold flex items-center gap-1">
              <Clock size={12} className="text-interactive" /> {totalDuration}ms
            </span>
          </div>

          <div className="p-2 rounded bg-background border border-border">
            <span className="block text-text-dim text-[10px]">Spans Recorded</span>
            <span className="text-text-main font-bold flex items-center gap-1">
              <Activity size={12} className="text-success" /> {traceSpans.length} Spans
            </span>
          </div>

          <div className="p-2 rounded bg-background border border-border">
            <span className="block text-text-dim text-[10px]">Saga State</span>
            <span className={clsx("font-bold text-[10px] uppercase", isFailed ? "text-failed" : "text-success")}>
              {isFailed ? "COMPENSATED" : "COMMITTED"}
            </span>
          </div>

          <div className="p-2 rounded bg-background border border-border">
            <span className="block text-text-dim text-[10px]">Transport</span>
            <span className="text-interactive font-bold">NATS JetStream</span>
          </div>
        </div>

        {/* Tabs switcher */}
        <div className="px-4 border-b border-border flex gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab("spans")}
            className={clsx(
              "py-2.5 border-b-2 font-semibold transition-colors",
              activeTab === "spans"
                ? "border-interactive text-interactive"
                : "border-transparent text-text-muted hover:text-text-main"
            )}
          >
            Trace Waterfall ({traceSpans.length})
          </button>
          <button
            onClick={() => setActiveTab("payload")}
            className={clsx(
              "py-2.5 border-b-2 font-semibold transition-colors",
              activeTab === "payload"
                ? "border-interactive text-interactive"
                : "border-transparent text-text-muted hover:text-text-main"
            )}
          >
            NATS Event Payload
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "spans" ? (
            <div className="space-y-2">
              <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider flex justify-between px-1">
                <span>Operation Span & Node</span>
                <span>Timeline Waterfall (0ms – {totalDuration}ms)</span>
              </div>

              {traceSpans.map((span) => {
                const isExpanded = expandedSpanId === span.id;
                const leftPercent = (span.startOffsetMs / totalDuration) * 100;
                const widthPercent = Math.max((span.durationMs / totalDuration) * 100, 3);

                return (
                  <div
                    key={span.id}
                    className={clsx(
                      "rounded border transition-colors bg-card/60",
                      span.status === "FAILED" ? "border-failed/40" :
                      span.status === "COMPENSATED" ? "border-interactive/50" :
                      "border-border hover:border-interactive/40"
                    )}
                  >
                    <div
                      onClick={() => setExpandedSpanId(isExpanded ? null : span.id)}
                      className="p-2.5 cursor-pointer flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 max-w-[55%] truncate">
                        {isExpanded ? <ChevronDown size={14} className="text-text-dim" /> : <ChevronRight size={14} className="text-text-dim" />}
                        <span
                          className={clsx(
                            "w-2 h-2 rounded-xs",
                            span.status === "SUCCESS" ? "bg-success" :
                            span.status === "FAILED" ? "bg-failed" : "bg-interactive"
                          )}
                        />
                        <span className="font-semibold text-text-main truncate">{span.name}</span>
                        <span className="text-[10px] text-text-dim px-1 rounded bg-background border border-border shrink-0">
                          {span.service}
                        </span>
                      </div>

                      {/* Mini Waterfall Bar */}
                      <div className="w-[35%] flex items-center gap-2">
                        <div className="flex-1 h-2 bg-background rounded-xs overflow-hidden relative border border-border/50">
                          <div
                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                            className={clsx(
                              "absolute h-full rounded-xs",
                              span.status === "SUCCESS" ? "bg-success" :
                              span.status === "FAILED" ? "bg-failed" : "bg-interactive"
                            )}
                          />
                        </div>
                        <span className="text-[10px] text-text-dim w-10 text-right shrink-0">
                          {span.durationMs}ms
                        </span>
                      </div>
                    </div>

                    {/* Span Attributes Accordion */}
                    {isExpanded && (
                      <div className="p-3 border-t border-border bg-background/80 text-[11px] font-mono space-y-1.5">
                        <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">
                          Span Attributes & Baggage:
                        </div>
                        {Object.entries(span.attributes).map(([k, v]) => (
                          <div key={k} className="flex items-start justify-between gap-4">
                            <span className="text-text-muted">{k}:</span>
                            <span className="text-text-main text-right break-all font-semibold">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">JetStream JSON Message:</span>
                <button
                  onClick={copyPayload}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-card border border-border text-xs font-mono text-text-muted hover:text-text-main transition-colors"
                >
                  <Copy size={13} />
                  <span>Copy JSON</span>
                </button>
              </div>

              <pre className="p-3.5 rounded bg-background border border-border text-xs font-mono text-text-main overflow-x-auto leading-relaxed">
                {JSON.stringify(rawPayload || {
                  order_id: orderId,
                  correlation_id: correlationId,
                  saga_pattern: "Choreography",
                  broker: "NATS JetStream",
                  stream: "ORDERS_STREAM",
                  status: isFailed ? "CANCELLED" : "COMPLETED",
                  timestamp: new Date().toISOString()
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-border bg-card/30 flex items-center justify-between text-xs font-mono text-text-muted">
          <span>Distributed Context Propagation: <strong className="text-success">W3C TraceContext</strong></span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-card border border-border text-text-main hover:border-interactive transition-colors text-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

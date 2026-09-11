/**
 * useOrderSocket — WebSocket hook with exponential backoff reconnect.
 *
 * Security note: JWT is stored in localStorage (XSS risk). For production,
 * prefer httpOnly cookies. Here we read from localStorage as a fallback since
 * the backend currently issues plain JWT tokens.
 */

import { useEffect, useRef, useCallback } from "react";
import { OrderStatus } from "@/types";

export interface OrderStatusUpdate {
  order_id: string;
  status: OrderStatus;
  event_type?: string;
}

interface UseOrderSocketOptions {
  orderId: string;
  onStatusChange: (update: OrderStatusUpdate) => void;
  enabled?: boolean;
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";
const MAX_RETRIES = 8;
const BASE_DELAY_MS = 500;

export function useOrderSocket({
  orderId,
  onStatusChange,
  enabled = true,
}: UseOrderSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable reference to the callback so we don't need to re-run effect
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    // Clean up any existing socket
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const token = localStorage.getItem("token");
    const url = token
      ? `${WS_BASE}/ws/orders/${orderId}?token=${encodeURIComponent(token)}`
      : `${WS_BASE}/ws/orders/${orderId}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      // URL scheme not supported (e.g. http instead of ws) — bail
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      // Reset backoff on successful connection
      retryCountRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as OrderStatusUpdate;
        if (data.status) {
          onStatusChangeRef.current(data);
        }
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onclose = (evt) => {
      // 1000 = normal closure, 1001 = going away — don't retry these
      if (evt.code === 1000 || evt.code === 1001) return;
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onerror is always followed by onclose, so we let onclose handle retry
      ws.close();
    };
  }, [enabled, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleReconnect = useCallback(() => {
    if (retryCountRef.current >= MAX_RETRIES) return;

    // Exponential backoff: 500ms, 1s, 2s, 4s … up to ~64s
    const delay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current);
    retryCountRef.current += 1;

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    if (!enabled) return;
    connect();

    return () => {
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional unmount
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [enabled, connect, clearReconnectTimer]);
}

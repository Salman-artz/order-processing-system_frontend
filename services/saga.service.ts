export interface SagaEventItem {
  id: string;
  timestamp: string;
  subject: string;
  correlationId: string;
  serviceSource: 'order-service' | 'inventory-service' | 'payment-service' | 'notification-service';
  status: 'COMMITTED' | 'ROLLBACK' | 'PENDING' | 'COMPENSATED';
  latencyMs: number;
  payload: Record<string, any>;
  compensationReason?: string;
}

export interface MicroserviceNode {
  id: string;
  name: string;
  port: number;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
  latency: string;
  database: string;
  eventsProcessed: number;
  type: string;
}

export interface TraceSpan {
  id: string;
  name: string;
  service: string;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED' | 'COMPENSATED';
  startOffsetMs: number;
  attributes: Record<string, string | number | boolean>;
}

export const INITIAL_MICROSERVICES: MicroserviceNode[] = [
  { id: "svc-order", name: "order-service", port: 8001, status: "OPERATIONAL", latency: "2.1ms", database: "pg_orders (ACID)", eventsProcessed: 14209, type: "Presentation & State" },
  { id: "svc-inventory", name: "inventory-service", port: 8002, status: "OPERATIONAL", latency: "3.8ms", database: "pg_inventory (Locks)", eventsProcessed: 14209, type: "Stock Ledger & Saga" },
  { id: "svc-payment", name: "payment-service", port: 8003, status: "OPERATIONAL", latency: "7.4ms", database: "pg_payment (Gateway)", eventsProcessed: 13980, type: "Midtrans & Settlement" },
  { id: "svc-notification", name: "notification-service", port: 8004, status: "OPERATIONAL", latency: "1.9ms", database: "WebSocket / NATS", eventsProcessed: 13980, type: "Realtime Dispatcher" },
];

export const INITIAL_SAGA_EVENTS: SagaEventItem[] = [
  {
    id: "evt-01",
    timestamp: "11:15:32.410",
    subject: "order.created",
    correlationId: "corr-8f92-a104",
    serviceSource: "order-service",
    status: "COMMITTED",
    latencyMs: 12,
    payload: { order_id: "ord-8f92a104", customer_id: "usr-admin-01", total: 1200000, items_count: 1 },
  },
  {
    id: "evt-02",
    timestamp: "11:15:32.428",
    subject: "inventory.reserved",
    correlationId: "corr-8f92-a104",
    serviceSource: "inventory-service",
    status: "COMMITTED",
    latencyMs: 18,
    payload: { order_id: "ord-8f92a104", sku: "WEBCAM-C920", quantity: 1, stock_remaining: 29 },
  },
  {
    id: "evt-03",
    timestamp: "11:15:32.470",
    subject: "payment.success",
    correlationId: "corr-8f92-a104",
    serviceSource: "payment-service",
    status: "COMMITTED",
    latencyMs: 42,
    payload: { order_id: "ord-8f92a104", payment_id: "pay-771a-09c", amount: 1200000, gateway: "Midtrans Snap" },
  },
  {
    id: "evt-04",
    timestamp: "11:15:32.485",
    subject: "order.completed",
    correlationId: "corr-8f92-a104",
    serviceSource: "order-service",
    status: "COMMITTED",
    latencyMs: 15,
    payload: { order_id: "ord-8f92a104", status: "COMPLETED", fulfillment: "READY_FOR_DISPATCH" },
  },
  {
    id: "evt-05",
    timestamp: "11:18:04.112",
    subject: "order.created",
    correlationId: "corr-e41c-7b89",
    serviceSource: "order-service",
    status: "PENDING",
    latencyMs: 14,
    payload: { order_id: "ord-e41c7b89", customer_id: "usr-cust-02", total: 28500000, items_count: 1 },
  },
  {
    id: "evt-06",
    timestamp: "11:18:04.130",
    subject: "inventory.reserved",
    correlationId: "corr-e41c-7b89",
    serviceSource: "inventory-service",
    status: "COMMITTED",
    latencyMs: 18,
    payload: { order_id: "ord-e41c7b89", sku: "GPU-RTX-4090", quantity: 1, stock_locked: 1 },
  },
  {
    id: "evt-07",
    timestamp: "11:18:04.180",
    subject: "payment.failed",
    correlationId: "corr-e41c-7b89",
    serviceSource: "payment-service",
    status: "ROLLBACK",
    latencyMs: 50,
    compensationReason: "Transaction limit exceeded (> Rp 10.000.000 limit threshold)",
    payload: { order_id: "ord-e41c7b89", reason: "Transaction limit exceeded", gross_amount: 28500000 },
  },
  {
    id: "evt-08",
    timestamp: "11:18:04.205",
    subject: "inventory.released",
    correlationId: "corr-e41c-7b89",
    serviceSource: "inventory-service",
    status: "COMPENSATED",
    latencyMs: 25,
    compensationReason: "SAGA COMPENSATION: Released 1x GPU-RTX-4090 lock back to inventory table",
    payload: { order_id: "ord-e41c7b89", action: "COMPENSATION_STOCK_RELEASE", restored_stock: 12 },
  },
  {
    id: "evt-09",
    timestamp: "11:18:04.220",
    subject: "order.cancelled",
    correlationId: "corr-e41c-7b89",
    serviceSource: "order-service",
    status: "ROLLBACK",
    latencyMs: 15,
    payload: { order_id: "ord-e41c7b89", final_state: "CANCELLED", saga_result: "ROLLBACK_SUCCESSFUL" },
  },
];

export class SagaService {
  static getMicroservicesHealth(): MicroserviceNode[] {
    return INITIAL_MICROSERVICES;
  }

  static async getMicroservicesHealthAsync(): Promise<MicroserviceNode[]> {
    const services = [
      { id: "svc-order", name: "order-service", port: 8085, url: "/health", database: "pg_orders (ACID)", type: "Presentation & State" },
      { id: "svc-inventory", name: "inventory-service", port: 8081, url: "http://localhost:8081/health", database: "pg_inventory (Locks)", type: "Stock Ledger & Saga" },
      { id: "svc-payment", name: "payment-service", port: 8082, url: "http://localhost:8082/health", database: "pg_payment (Gateway)", type: "Midtrans & Settlement" },
      { id: "svc-notification", name: "notification-service", port: 8083, url: "http://localhost:8083/health", database: "WebSocket / NATS", type: "Realtime Dispatcher" },
    ];

    const results: MicroserviceNode[] = [];
    for (const svc of services) {
      const start = Date.now();
      try {
        const url = svc.url.startsWith('http') ? svc.url : `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '')}${svc.url}`;
        await fetch(url, { signal: AbortSignal.timeout(3000) });
        const latency = Date.now() - start;
        results.push({
          id: svc.id,
          name: svc.name,
          port: svc.port,
          status: "OPERATIONAL",
          latency: `${latency}ms`,
          database: svc.database,
          eventsProcessed: 0,
          type: svc.type,
        });
      } catch {
        results.push({
          id: svc.id,
          name: svc.name,
          port: svc.port,
          status: "OFFLINE",
          latency: "—",
          database: svc.database,
          eventsProcessed: 0,
          type: svc.type,
        });
      }
    }
    return results;
  }

  static getSagaEvents(): SagaEventItem[] {
    return INITIAL_SAGA_EVENTS;
  }

  static getTraceForOrder(orderId: string): TraceSpan[] {
    if (orderId.includes('fail') || orderId === 'ord-e41c7b89') {
      return [
        {
          id: "span-01",
          name: "POST /api/v1/orders (Create Order)",
          service: "order-service",
          durationMs: 95,
          status: "FAILED",
          startOffsetMs: 0,
          attributes: { "http.status": 200, "saga.initiator": true, "order.id": orderId },
        },
        {
          id: "span-02",
          name: "nats.publish(order.created)",
          service: "order-service",
          durationMs: 4,
          status: "SUCCESS",
          startOffsetMs: 12,
          attributes: { "nats.stream": "ORDERS_STREAM", "nats.subject": "order.created" },
        },
        {
          id: "span-03",
          name: "inventory.reserve_stock (DB Lock)",
          service: "inventory-service",
          durationMs: 18,
          status: "SUCCESS",
          startOffsetMs: 18,
          attributes: { "db.system": "postgresql", "db.statement": "UPDATE inventory SET stock_reserved = stock_reserved + 1" },
        },
        {
          id: "span-04",
          name: "payment.process_charge (Payment Gateway)",
          service: "payment-service",
          durationMs: 38,
          status: "FAILED",
          startOffsetMs: 38,
          attributes: { "error": true, "error.reason": "Transaction limit exceeded (> Rp 10.000.000)" },
        },
        {
          id: "span-05",
          name: "nats.publish(payment.failed)",
          service: "payment-service",
          durationMs: 5,
          status: "FAILED",
          startOffsetMs: 76,
          attributes: { "nats.subject": "payment.failed", "trigger.compensation": true },
        },
        {
          id: "span-06",
          name: "inventory.compensate_release (Rollback)",
          service: "inventory-service",
          durationMs: 12,
          status: "COMPENSATED",
          startOffsetMs: 82,
          attributes: { "compensation.action": "RESTORE_STOCK", "db.statement": "UPDATE inventory SET stock_reserved = stock_reserved - 1" },
        },
        {
          id: "span-07",
          name: "order.mark_cancelled (Finalize)",
          service: "order-service",
          durationMs: 9,
          status: "COMPENSATED",
          startOffsetMs: 95,
          attributes: { "order.status": "CANCELLED" },
        },
      ];
    }

    return [
      {
        id: "span-01",
        name: "POST /api/v1/orders (Create Order)",
        service: "order-service",
        durationMs: 65,
        status: "SUCCESS",
        startOffsetMs: 0,
        attributes: { "http.status": 201, "saga.initiator": true, "order.id": orderId },
      },
      {
        id: "span-02",
        name: "nats.publish(order.created)",
        service: "order-service",
        durationMs: 3,
        status: "SUCCESS",
        startOffsetMs: 10,
        attributes: { "nats.stream": "ORDERS_STREAM", "nats.subject": "order.created" },
      },
      {
        id: "span-03",
        name: "inventory.reserve_stock (DB Lock)",
        service: "inventory-service",
        durationMs: 16,
        status: "SUCCESS",
        startOffsetMs: 14,
        attributes: { "db.system": "postgresql", "db.statement": "UPDATE inventory SET stock_reserved = stock_reserved + 1" },
      },
      {
        id: "span-04",
        name: "payment.process_charge (Midtrans)",
        service: "payment-service",
        durationMs: 25,
        status: "SUCCESS",
        startOffsetMs: 32,
        attributes: { "gateway.settlement": "settlement", "fraud.status": "accept" },
      },
      {
        id: "span-05",
        name: "nats.publish(order.completed)",
        service: "order-service",
        durationMs: 4,
        status: "SUCCESS",
        startOffsetMs: 58,
        attributes: { "nats.subject": "order.completed", "status": "COMPLETED" },
      },
    ];
  }
}

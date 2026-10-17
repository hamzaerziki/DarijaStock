import { describe, it, expect } from "vitest";
import { ORDER_STATUS, ORDER_STATUS_FILTERS, statusMeta, statusLabel, DELIVERY_STAGES } from "./status";

// The exact set the backend emits (backend/app/models/order.py OrderStatus.ALL).
const BACKEND_STATUSES = ["new", "needs_review", "confirmed", "reserved", "preparing", "fulfilled", "cancelled"];

describe("order status", () => {
  it("has a label + tone for every backend status", () => {
    for (const s of BACKEND_STATUSES) {
      const meta = statusMeta(s);
      expect(meta.label).toBeTruthy();
      expect(meta.tone).toBeTruthy();
    }
  });

  it("does not invent statuses the backend cannot return", () => {
    expect(ORDER_STATUS).not.toHaveProperty("draft");
    expect(ORDER_STATUS).not.toHaveProperty("invoiced");
  });

  it("exposes filters identical to the real statuses", () => {
    expect([...ORDER_STATUS_FILTERS].sort()).toEqual([...BACKEND_STATUSES].sort());
  });

  it("maps stages that point into DELIVERY_STAGES", () => {
    for (const s of BACKEND_STATUSES) {
      const { stage } = statusMeta(s);
      if (stage !== null) {
        expect(stage).toBeGreaterThanOrEqual(0);
        expect(stage).toBeLessThan(DELIVERY_STAGES.length);
      }
    }
  });

  it("cancelled is not a progress stage", () => {
    expect(statusMeta("cancelled").stage).toBeNull();
  });

  it("falls back for unknown status", () => {
    expect(statusLabel("whatever")).toBe("whatever");
  });
});

import { describe, expect, it } from "vitest";
import { aggregateReport } from "@/lib/reporting";

describe("Reporting", () => {
  it("aggregates totals", () => {
    const result = aggregateReport([
      { totalHours: 2.5, eveningHours: 1, nightHours: 0 },
      { totalHours: 4, eveningHours: 0.5, nightHours: 1.25 }
    ]);

    expect(result.totalHours).toBe(6.5);
    expect(result.eveningHours).toBe(1.5);
    expect(result.nightHours).toBe(1.25);
  });
});

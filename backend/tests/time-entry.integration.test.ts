import { describe, expect, it } from "vitest";
import {
  splitByMidnightHelsinki,
  calculateOverlapHours,
  parseTimeToMinutes,
  summarizeSplit
} from "@/lib/time-entry";

describe("Time entry creation and split logic", () => {
  it("splits entries across Helsinki midnight", () => {
    const start = new Date("2026-02-10T20:00:00.000Z");
    const end = new Date("2026-02-11T03:00:00.000Z");

    const splits = splitByMidnightHelsinki(start, end);

    expect(splits.length).toBe(2);
    expect(splits[0].localDate).toBe("2026-02-10");
    expect(splits[1].localDate).toBe("2026-02-11");
  });

  it("calculates evening and night overlaps", () => {
    const evening = calculateOverlapHours(
      18 * 60,
      22 * 60,
      parseTimeToMinutes("18:00"),
      parseTimeToMinutes("22:00")
    );

    const night = calculateOverlapHours(
      22 * 60,
      24 * 60,
      parseTimeToMinutes("22:00"),
      parseTimeToMinutes("06:00")
    );

    expect(evening).toBe(4);
    expect(night).toBe(2);
  });

  it("keeps night-hour overlap correct when a segment ends exactly at midnight", () => {
    const start = new Date("2026-02-10T20:00:00.000Z"); // 22:00 Helsinki
    const end = new Date("2026-02-10T22:30:00.000Z"); // 00:30 Helsinki next day

    const splits = splitByMidnightHelsinki(start, end);
    expect(splits.length).toBe(2);

    const firstSummary = summarizeSplit(splits[0], {
      eveningStart: "18:00",
      eveningEnd: "22:00",
      nightStart: "22:00",
      nightEnd: "06:00"
    });

    expect(firstSummary.totalHours).toBe(2);
    expect(firstSummary.nightHours).toBe(2);
  });
});

import { EntryStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { deriveParentStatus } from "@/lib/time-entry";

describe("Approvals", () => {
  it("marks parent approved when all splits are approved", () => {
    expect(deriveParentStatus([EntryStatus.APPROVED, EntryStatus.APPROVED])).toBe(EntryStatus.APPROVED);
  });

  it("marks parent rejected if any split is rejected", () => {
    expect(deriveParentStatus([EntryStatus.APPROVED, EntryStatus.REJECTED])).toBe(EntryStatus.REJECTED);
  });

  it("keeps parent pending while pending splits exist", () => {
    expect(deriveParentStatus([EntryStatus.APPROVED, EntryStatus.PENDING])).toBe(EntryStatus.PENDING);
  });
});

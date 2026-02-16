import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("Auth flow", () => {
  it("hashes and verifies password", async () => {
    const plain = "password123";
    const hash = await hashPassword(plain);

    expect(hash).not.toEqual(plain);
    await expect(verifyPassword(plain, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-pass", hash)).resolves.toBe(false);
  });
});

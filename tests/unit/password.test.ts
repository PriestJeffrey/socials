import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("Argon2id password hashing", () => {
  it("hashes and verifies", async () => {
    const password = "correct-horse-battery";
    const hashed = await hashPassword(password);
    expect(hashed).not.toEqual(password);
    expect(await verifyPassword(password, hashed)).toBe(true);
    expect(await verifyPassword("wrong-password", hashed)).toBe(false);
  });
});

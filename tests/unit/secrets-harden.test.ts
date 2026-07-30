import { describe, expect, it } from "vitest";
import { isWeakSecret, requireStrongSecret } from "@/lib/security/secrets";

describe("gstack secret hardening", () => {
  it("rejects missing, short, and known placeholders", () => {
    expect(isWeakSecret(undefined)).toBe(true);
    expect(isWeakSecret("short")).toBe(true);
    expect(isWeakSecret("dev-cron-secret-change-me")).toBe(true);
    expect(
      isWeakSecret("replace-with-long-random-string-min-32-chars"),
    ).toBe(true);
  });

  it("accepts a strong random-looking secret", () => {
    const strong = "a".repeat(32) + "-not-a-placeholder";
    expect(isWeakSecret(strong)).toBe(false);
    expect(requireStrongSecret("SESSION_SECRET", strong)).toBe(strong);
  });

  it("requireStrongSecret throws on placeholder", () => {
    expect(() =>
      requireStrongSecret("CRON_SECRET", "dev-cron-secret-change-me"),
    ).toThrow(/placeholder|strong/i);
  });
});

import { describe, expect, it } from "vitest";
import { log } from "@/lib/logging/logger";

describe("logger redaction", () => {
  it("does not throw and redacts secret-looking keys", () => {
    const lines: string[] = [];
    const original = console.info;
    console.info = (msg: string) => {
      lines.push(String(msg));
    };
    try {
      log({
        phase: 0,
        component: "auth.login",
        level: "info",
        message: "test",
        meta: { password: "secret", reason: "ok" },
      });
      expect(lines[0]).toContain("[redacted]");
      expect(lines[0]).not.toContain('"secret"');
      expect(lines[0]).toContain("ok");
    } finally {
      console.info = original;
    }
  });
});

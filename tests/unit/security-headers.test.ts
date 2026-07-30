import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "@/lib/security/headers";

describe("phase 8 security headers", () => {
  it("sets baseline L10 headers", () => {
    const headers = buildSecurityHeaders(false);
    const map = Object.fromEntries(headers.map((h) => [h.key, h.value]));
    expect(map["X-Content-Type-Options"]).toBe("nosniff");
    expect(map["X-Frame-Options"]).toBe("DENY");
    expect(map["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(map["Content-Security-Policy"]).toContain(
      "generativelanguage.googleapis.com",
    );
    expect(map["Strict-Transport-Security"]).toBeUndefined();
  });

  it("adds HSTS in production", () => {
    const headers = buildSecurityHeaders(true);
    const hsts = headers.find((h) => h.key === "Strict-Transport-Security");
    expect(hsts?.value).toContain("max-age=");
  });
});

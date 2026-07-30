import { describe, expect, it } from "vitest";
import { getAdapter, listAdapters, oauthPlatforms } from "@/lib/platforms";

describe("phase 4 X honest adapter", () => {
  it("registers four platforms with truthful X flags", () => {
    const ids = listAdapters().map((a) => a.id);
    expect(ids).toEqual([
      "instagram",
      "facebook",
      "linkedin",
      "threads",
      "x",
    ]);

    const x = getAdapter("x");
    expect(x?.capabilities.oauth).toBe(false);
    expect(x?.capabilities.publish).toBe(false);
    expect(x?.capabilities.manualCopy).toBe(true);
  });

  it("oauthPlatforms excludes X", () => {
    expect(oauthPlatforms().every((a) => a.id !== "x")).toBe(true);
    expect(oauthPlatforms().every((a) => a.capabilities.oauth)).toBe(true);
  });

  it("rejects OAuth and publish for X", async () => {
    const x = getAdapter("x")!;
    await expect(x.beginOAuth("u1")).rejects.toThrow(/no OAuth/i);
    await expect(x.publish("c1", {})).rejects.toThrow(/not available|copy/i);
    await expect(
      x.fetchMetrics("u1", "c1", { from: new Date(), to: new Date() }),
    ).rejects.toThrow(/not connected|unavailable/i);
  });
});

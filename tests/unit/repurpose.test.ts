import { describe, expect, it } from "vitest";
import { previewForPlatform, repurposeBody } from "@/lib/content/repurpose";

describe("repurposeBody", () => {
  it("truncates X to 280", () => {
    const long = "a".repeat(400);
    expect(repurposeBody(long, "x").length).toBeLessThanOrEqual(280);
  });

  it("adds LinkedIn closer", () => {
    expect(repurposeBody("Hello world", "linkedin")).toContain("Curious how this lands");
  });
});

describe("previewForPlatform", () => {
  it("trims instagram preview", () => {
    expect(previewForPlatform("x".repeat(600), "instagram").length).toBe(500);
  });
});

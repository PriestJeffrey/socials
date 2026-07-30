import { describe, expect, it } from "vitest";
import { getLinkedInConfig } from "@/lib/platforms/linkedin/config";

describe("linkedin fixture flag isolation", () => {
  it("does not follow META_USE_FIXTURES", () => {
    const prevMeta = process.env.META_USE_FIXTURES;
    const prevLi = process.env.LINKEDIN_USE_FIXTURES;
    process.env.META_USE_FIXTURES = "true";
    process.env.LINKEDIN_USE_FIXTURES = "false";
    expect(getLinkedInConfig().useFixtures).toBe(false);
    process.env.LINKEDIN_USE_FIXTURES = "true";
    expect(getLinkedInConfig().useFixtures).toBe(true);
    process.env.META_USE_FIXTURES = prevMeta;
    process.env.LINKEDIN_USE_FIXTURES = prevLi;
  });
});

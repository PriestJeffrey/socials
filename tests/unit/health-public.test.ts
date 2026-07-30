import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { getPublicLiveness } from "@/lib/health/types";

describe("health public surface", () => {
  it("public liveness has no fixture/config strings", async () => {
    const live = await getPublicLiveness();
    expect(live).toMatchObject({ phase: 11 });
    expect(live).toHaveProperty("ok");
    expect(live).toHaveProperty("status");
    expect(JSON.stringify(live)).not.toMatch(/FIXTURE|SECRET|GEMINI|META_/i);
  });

  it("anonymous GET /api/health returns liveness only", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.phase).toBe(11);
    expect(body).not.toHaveProperty("subsystems");
    expect(JSON.stringify(body)).not.toMatch(/Fixture mode|APP_SECRET|CLIENT_SECRET/i);
  });
});

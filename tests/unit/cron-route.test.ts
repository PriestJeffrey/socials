import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/cron/route";
import { NextRequest } from "next/server";

describe("cron route auth", () => {
  it("returns 503 when CRON_SECRET unset", async () => {
    const prev = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    const res = await POST(
      new NextRequest("http://localhost/api/cron", { method: "POST" }),
    );
    expect(res.status).toBe(503);
    process.env.CRON_SECRET = prev;
  });

  it("returns 401 on bad secret", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const res = await GET(
      new NextRequest("http://localhost/api/cron", {
        method: "GET",
        headers: { authorization: "Bearer wrong" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 503 on known placeholder CRON_SECRET", async () => {
    process.env.CRON_SECRET = "dev-cron-secret-change-me";
    const res = await POST(
      new NextRequest("http://localhost/api/cron", {
        method: "POST",
        headers: { authorization: "Bearer dev-cron-secret-change-me" },
      }),
    );
    expect(res.status).toBe(503);
  });
});

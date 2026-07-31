import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platforms/instagram/config", () => ({
  getMetaConfig: vi.fn(() => ({
    useFixtures: false,
    configured: true,
    appId: "app",
    appSecret: "secret",
    redirectUri: "http://localhost/cb",
    graphVersion: "v21.0",
  })),
}));

import { publishIgMedia } from "@/lib/platforms/instagram/meta-client";

describe("publishIgMedia container poll", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function jsonResponse(body: unknown, ok = true, status = 200) {
    return {
      ok,
      status,
      json: async () => body,
    };
  }

  it("fails IMAGE when status_code empty but status indicates ERROR", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "container1" })) // create
      .mockResolvedValueOnce(
        jsonResponse({ status_code: "", status: "ERROR: bad image url" }),
      );

    await expect(
      publishIgMedia({
        igUserId: "ig1",
        accessToken: "tok",
        caption: "hi",
        mediaUrl: "https://cdn.example.com/a.jpg",
      }),
    ).rejects.toThrow(/bad image|container failed/i);
  });

  it("times out VIDEO clearly when never FINISHED", async () => {
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      fn: TimerHandler,
    ) => {
      if (typeof fn === "function") fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "container_v" }))
      .mockResolvedValue(
        jsonResponse({ status_code: "IN_PROGRESS", status: "processing" }),
      );

    await expect(
      publishIgMedia({
        igUserId: "ig1",
        accessToken: "tok",
        caption: "hi",
        mediaUrl: "https://cdn.example.com/clip.mp4",
      }),
    ).rejects.toThrow(/timed out/i);
  });

  it("publishes IMAGE when empty status_code and no error", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "container1" }))
      .mockResolvedValueOnce(jsonResponse({ status_code: "", status: "" }))
      .mockResolvedValueOnce(jsonResponse({ id: "media99" }))
      .mockResolvedValueOnce(
        jsonResponse({ permalink: "https://instagram.com/p/x" }),
      );

    const result = await publishIgMedia({
      igUserId: "ig1",
      accessToken: "tok",
      caption: "hi",
      mediaUrl: "https://cdn.example.com/a.jpg",
    });
    expect(result.platformPostId).toBe("media99");
    expect(result.permalink).toBe("https://instagram.com/p/x");
  });
});

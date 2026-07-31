import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    draft: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    socialConnection: {
      findFirst: vi.fn(),
    },
    post: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit/log", () => ({
  writeAudit: vi.fn(),
}));

vi.mock("@/lib/crypto/aes", () => ({
  decryptAesGcm: vi.fn(() => "token"),
}));

vi.mock("@/lib/platforms/instagram/config", () => ({
  getMetaConfig: vi.fn(),
}));

vi.mock("@/lib/platforms/linkedin/config", () => ({
  getLinkedInConfig: vi.fn(),
}));

vi.mock("@/lib/platforms/instagram/meta-client", () => ({
  publishIgMedia: vi.fn(),
}));

vi.mock("@/lib/platforms/facebook/meta-client", () => ({
  publishFbPagePost: vi.fn(),
}));

vi.mock("@/lib/platforms/linkedin/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/platforms/linkedin/client")>();
  return {
    ...actual,
    publishLinkedInUgcPost: vi.fn(),
  };
});

import { prisma } from "@/lib/db/prisma";
import { getMetaConfig } from "@/lib/platforms/instagram/config";
import { getLinkedInConfig } from "@/lib/platforms/linkedin/config";
import { publishIgMedia } from "@/lib/platforms/instagram/meta-client";
import { publishFbPagePost } from "@/lib/platforms/facebook/meta-client";
import { toLinkedInPersonUrn } from "@/lib/platforms/linkedin/client";
import { runPublishDraft } from "@/lib/content/publish";
import { assertPublicHttpsMediaUrl } from "@/lib/security/public-media-url";
import { redactErrorMessage } from "@/lib/security/redact-error";
import { cookieSecure } from "@/lib/security/cookie-secure";

describe("cookieSecure", () => {
  const prev = process.env.COOKIE_SECURE;
  const prevNode = process.env.NODE_ENV;
  afterEach(() => {
    if (prev === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = prev;
    process.env.NODE_ENV = prevNode;
  });

  it("honors COOKIE_SECURE=false under production NODE_ENV", async () => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SECURE = "false";
    expect(cookieSecure()).toBe(false);
  });

  it("honors COOKIE_SECURE=true", () => {
    process.env.COOKIE_SECURE = "true";
    expect(cookieSecure()).toBe(true);
  });
});

describe("assertPublicHttpsMediaUrl SSRF", () => {
  it("requires https", () => {
    expect(() => assertPublicHttpsMediaUrl("http://cdn.example.com/a.jpg")).toThrow(
      /https/i,
    );
  });

  it("rejects localhost and private IPs", () => {
    expect(() =>
      assertPublicHttpsMediaUrl("https://localhost/img.jpg"),
    ).toThrow(/localhost|private/i);
    expect(() =>
      assertPublicHttpsMediaUrl("https://127.0.0.1/img.jpg"),
    ).toThrow(/private|reserved/i);
    expect(() =>
      assertPublicHttpsMediaUrl("https://192.168.1.10/img.jpg"),
    ).toThrow(/private|reserved/i);
    expect(() =>
      assertPublicHttpsMediaUrl("https://10.0.0.5/img.jpg"),
    ).toThrow(/private|reserved/i);
  });

  it("allows public https CDN URLs", () => {
    expect(assertPublicHttpsMediaUrl("https://cdn.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });
});

describe("toLinkedInPersonUrn", () => {
  it("wraps raw ids and preserves person URNs", () => {
    expect(toLinkedInPersonUrn("abc123")).toBe("urn:li:person:abc123");
    expect(toLinkedInPersonUrn(" urn:li:person:xyz ")).toBe("urn:li:person:xyz");
  });

  it("rejects empty, org URNs, and junk", () => {
    expect(() => toLinkedInPersonUrn("")).toThrow(/missing/i);
    expect(() => toLinkedInPersonUrn("urn:li:organization:1")).toThrow(/person/i);
    expect(() => toLinkedInPersonUrn("urn:li:person:")).toThrow(/empty/i);
    expect(() => toLinkedInPersonUrn("a/b")).toThrow(/invalid/i);
  });
});

describe("redactErrorMessage", () => {
  it("redacts access_token query values", () => {
    const out = redactErrorMessage(
      "Graph error access_token=EAABsecretvalue123&foo=1",
    );
    expect(out).not.toMatch(/EAABsecretvalue123/);
    expect(out).toMatch(/REDACTED/i);
  });
});

describe("runPublishDraft live vs fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLinkedInConfig).mockReturnValue({
      useFixtures: true,
      configured: true,
      clientId: "",
      clientSecret: "",
      redirectUri: "",
    } as ReturnType<typeof getLinkedInConfig>);
  });

  it("rejects live Instagram publish without mediaUrl", async () => {
    vi.mocked(getMetaConfig).mockReturnValue({
      useFixtures: false,
      configured: true,
      appId: "x",
      appSecret: "y",
      redirectUri: "",
      graphVersion: "v21.0",
    });
    vi.mocked(prisma.draft.findFirst).mockResolvedValue({
      id: "d1",
      userId: "u1",
      platform: "instagram",
      body: "hello",
      mediaUrl: null,
      status: "draft",
      publishedPostId: null,
    } as never);
    vi.mocked(prisma.socialConnection.findFirst).mockResolvedValue({
      id: "c1",
      externalAccountId: "ig1",
      accessTokenEnc: "enc",
    } as never);

    await expect(
      runPublishDraft({ userId: "u1", draftId: "d1" }),
    ).rejects.toThrow(/media URL/i);
    expect(publishIgMedia).not.toHaveBeenCalled();
  });

  it("rejects live Instagram private media URLs before claim", async () => {
    vi.mocked(getMetaConfig).mockReturnValue({
      useFixtures: false,
      configured: true,
      appId: "x",
      appSecret: "y",
      redirectUri: "",
      graphVersion: "v21.0",
    });
    vi.mocked(prisma.draft.findFirst).mockResolvedValue({
      id: "d1b",
      userId: "u1",
      platform: "instagram",
      body: "hello",
      mediaUrl: "https://127.0.0.1/secret.jpg",
      status: "draft",
      publishedPostId: null,
    } as never);
    vi.mocked(prisma.socialConnection.findFirst).mockResolvedValue({
      id: "c1",
      externalAccountId: "ig1",
      accessTokenEnc: "enc",
    } as never);

    await expect(
      runPublishDraft({ userId: "u1", draftId: "d1b" }),
    ).rejects.toThrow(/private|reserved/i);
    expect(prisma.draft.updateMany).not.toHaveBeenCalled();
    expect(publishIgMedia).not.toHaveBeenCalled();
  });

  it("marks draft failed when live Facebook publish throws", async () => {
    vi.mocked(getMetaConfig).mockReturnValue({
      useFixtures: false,
      configured: true,
      appId: "x",
      appSecret: "y",
      redirectUri: "",
      graphVersion: "v21.0",
    });
    vi.mocked(prisma.draft.findFirst).mockResolvedValue({
      id: "d3",
      userId: "u1",
      platform: "facebook",
      body: "page post",
      mediaUrl: null,
      status: "draft",
      publishedPostId: null,
      goalTag: null,
    } as never);
    vi.mocked(prisma.socialConnection.findFirst).mockResolvedValue({
      id: "c3",
      externalAccountId: "page1",
      accessTokenEnc: "enc",
    } as never);
    vi.mocked(prisma.draft.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(publishFbPagePost).mockRejectedValue(
      new Error("(#200) access_token=EAABleak Permissions error"),
    );

    await expect(
      runPublishDraft({ userId: "u1", draftId: "d3" }),
    ).rejects.toThrow(/REDACTED|Permissions/i);

    expect(prisma.draft.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "failed" },
      }),
    );
  });

  it("calls Facebook live publish when fixtures off", async () => {
    vi.mocked(getMetaConfig).mockReturnValue({
      useFixtures: false,
      configured: true,
      appId: "x",
      appSecret: "y",
      redirectUri: "",
      graphVersion: "v21.0",
    });
    vi.mocked(prisma.draft.findFirst).mockResolvedValue({
      id: "d2",
      userId: "u1",
      platform: "facebook",
      body: "page post",
      mediaUrl: null,
      status: "draft",
      publishedPostId: null,
      externalPublishId: null,
      goalTag: null,
    } as never);
    vi.mocked(prisma.socialConnection.findFirst).mockResolvedValue({
      id: "c2",
      externalAccountId: "page1",
      accessTokenEnc: "enc",
    } as never);
    vi.mocked(prisma.draft.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.draft.update).mockResolvedValue({} as never);
    vi.mocked(publishFbPagePost).mockResolvedValue({
      platformPostId: "fb_1",
      permalink: "https://facebook.com/1",
    });
    vi.mocked(prisma.post.upsert).mockResolvedValue({ id: "post1" } as never);

    const result = await runPublishDraft({ userId: "u1", draftId: "d2" });
    expect(publishFbPagePost).toHaveBeenCalledWith(
      expect.objectContaining({ pageId: "page1", message: "page post" }),
    );
    expect(result.postId).toBe("post1");
  });
});

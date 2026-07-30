import { getBlueskyConfig } from "@/lib/platforms/bluesky/config";

export type BlueskyPostItem = {
  id: string;
  uri: string;
  text?: string;
  createdAt?: string;
  permalink?: string;
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
};

export type BlueskyInsightPoint = {
  metricKey: string;
  value: number;
};

export function fixtureBlueskySyncPayload(userId: string) {
  const externalAccountId = `bsky_fix_${userId.slice(0, 8)}`;
  const handle = "fixture.bsky.social";
  return {
    accessToken: `fixture_bsky_token_${userId}`,
    refreshToken: `fixture_bsky_refresh_${userId}`,
    externalAccountId,
    displayName: handle,
    did: `did:plc:fixture${userId.slice(0, 8)}`,
    posts: [
      {
        id: `bsky_${userId.slice(0, 6)}_1`,
        uri: `at://did:plc:fixture/app.bsky.feed.post/1`,
        text: "Fixture Bluesky: short hook, invite a reply.",
        createdAt: new Date().toISOString(),
        permalink: `https://bsky.app/profile/${handle}/post/1`,
        likeCount: 42,
        repostCount: 11,
        replyCount: 18,
      },
      {
        id: `bsky_${userId.slice(0, 6)}_2`,
        uri: `at://did:plc:fixture/app.bsky.feed.post/2`,
        text: "Fixture Bluesky: threads beat vanity likes.",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        permalink: `https://bsky.app/profile/${handle}/post/2`,
        likeCount: 27,
        repostCount: 6,
        replyCount: 9,
      },
    ] satisfies BlueskyPostItem[],
    insights: [
      { metricKey: "likes", value: 69 },
      { metricKey: "reposts", value: 17 },
      { metricKey: "replies", value: 27 },
      { metricKey: "posts_7d", value: 2 },
      { metricKey: "engagement_rate", value: 0.055 },
      { metricKey: "followers_delta_7d", value: 14 },
    ] satisfies BlueskyInsightPoint[],
  };
}

export function buildBlueskyOAuthAuthorizeUrl(state: string): string {
  const cfg = getBlueskyConfig();
  if (!cfg.useFixtures) {
    throw new Error(
      "Live Bluesky ATProto OAuth (DPoP) is deferred — set BLUESKY_USE_FIXTURES=true",
    );
  }
  const redirect =
    process.env.BLUESKY_REDIRECT_URI?.trim() ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/bluesky/callback`;
  const u = new URL(redirect);
  u.searchParams.set("code", "fixture_bluesky_code");
  u.searchParams.set("state", state);
  return u.toString();
}

export async function fetchBlueskyAuthorFeed(input: {
  accessToken: string;
  actor: string;
}): Promise<BlueskyPostItem[]> {
  const cfg = getBlueskyConfig();
  const url = new URL(
    `${cfg.serviceUrl}/xrpc/app.bsky.feed.getAuthorFeed`,
  );
  url.searchParams.set("actor", input.actor);
  url.searchParams.set("limit", "25");
  url.searchParams.set("filter", "posts_no_replies");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Bluesky getAuthorFeed failed (${res.status})`);
  }
  const data = (await res.json()) as {
    feed?: Array<{
      post?: {
        uri?: string;
        cid?: string;
        likeCount?: number;
        repostCount?: number;
        replyCount?: number;
        record?: { text?: string; createdAt?: string };
        author?: { handle?: string };
      };
    }>;
  };
  return (data.feed ?? [])
    .map((row) => {
      const post = row.post;
      if (!post?.uri) return null;
      const rkey = post.uri.split("/").pop() ?? post.cid ?? post.uri;
      const handle = post.author?.handle ?? input.actor;
      return {
        id: rkey,
        uri: post.uri,
        text: post.record?.text,
        createdAt: post.record?.createdAt,
        permalink: `https://bsky.app/profile/${handle}/post/${rkey}`,
        likeCount: post.likeCount ?? 0,
        repostCount: post.repostCount ?? 0,
        replyCount: post.replyCount ?? 0,
      } satisfies BlueskyPostItem;
    })
    .filter((p): p is BlueskyPostItem => Boolean(p));
}

export function insightsFromBlueskyPosts(
  posts: BlueskyPostItem[],
): BlueskyInsightPoint[] {
  const likes = posts.reduce((s, p) => s + (p.likeCount ?? 0), 0);
  const reposts = posts.reduce((s, p) => s + (p.repostCount ?? 0), 0);
  const replies = posts.reduce((s, p) => s + (p.replyCount ?? 0), 0);
  const denom = Math.max(1, likes + reposts + replies);
  const eng = (likes + reposts + replies * 1.5) / (denom * 4);
  return [
    { metricKey: "likes", value: likes },
    { metricKey: "reposts", value: reposts },
    { metricKey: "replies", value: replies },
    { metricKey: "posts_7d", value: posts.length },
    { metricKey: "engagement_rate", value: Number(Math.min(1, eng).toFixed(4)) },
    { metricKey: "followers_delta_7d", value: 0 },
  ];
}

/**
 * Overview must read MetricSnapshot / Post from DB (+ CacheStore).
 * Never call PlatformAdapter.fetch* on the Overview request path.
 */
import { prisma } from "@/lib/db/prisma";
import { cacheStore } from "@/lib/cache";
import { contentFatigue, shadowbanHeuristic } from "@/lib/analytics/formulas";

export type OverviewCard = {
  kind: "win" | "issue";
  title: string;
  body: string;
  platform?:
    | "instagram"
    | "facebook"
    | "linkedin"
    | "threads"
    | "tiktok"
    | "youtube"
    | "pinterest"
    | "bluesky"
    | "reddit"
    | "mastodon"
    | "tumblr"
    | "twitch";
  metricKey?: string;
  value?: number;
  why?: string;
};

export type OverviewBoard = {
  userId: string;
  empty: boolean;
  wins: OverviewCard[];
  issues: OverviewCard[];
  syncedAt: string | null;
  why?: string | null;
};

type Snap = { metricKey: string; value: number };

function pushIgCards(byKey: Map<string, Snap>, wins: OverviewCard[], issues: OverviewCard[]) {
  const reach = byKey.get("reach_delta_7d") ?? byKey.get("reach");
  if (reach && reach.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Instagram: reach decay showing up on recent signal",
      platform: "instagram",
      metricKey: reach.metricKey,
      value: reach.value,
    });
  } else if (reach && reach.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Instagram: reach is trending up",
      platform: "instagram",
      metricKey: reach.metricKey,
      value: reach.value,
    });
  }

  const saves = byKey.get("saves_rate");
  if (saves && saves.value >= 0.05) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Instagram: save rate looks healthy on recent posts",
      platform: "instagram",
      metricKey: saves.metricKey,
      value: saves.value,
    });
  }

  const eng = byKey.get("engagement_rate");
  if (eng && eng.value > 0 && eng.value < 0.02) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Instagram: engagement rate is soft — tighten the hook",
      platform: "instagram",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }
}

function pushFbCards(byKey: Map<string, Snap>, wins: OverviewCard[], issues: OverviewCard[]) {
  const fans = byKey.get("page_fans_delta_7d");
  if (fans && fans.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Facebook: Page fans declining over 7 days",
      platform: "facebook",
      metricKey: fans.metricKey,
      value: fans.value,
    });
  } else if (fans && fans.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Facebook: Page fans growing",
      platform: "facebook",
      metricKey: fans.metricKey,
      value: fans.value,
    });
  }

  const organic = byKey.get("organic_share_ratio");
  if (organic && organic.value >= 0.6) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Facebook: organic share of reach looks strong",
      platform: "facebook",
      metricKey: organic.metricKey,
      value: organic.value,
    });
  } else if (organic && organic.value > 0 && organic.value < 0.35) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Facebook: too paid-heavy — organic share is soft",
      platform: "facebook",
      metricKey: organic.metricKey,
      value: organic.value,
    });
  }

  const impressions = byKey.get("page_impressions");
  if (
    impressions &&
    impressions.value > 0 &&
    !wins.some((w) => w.platform === "facebook") &&
    !issues.some((i) => i.platform === "facebook")
  ) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Facebook Page is delivering impressions",
      platform: "facebook",
      metricKey: impressions.metricKey,
      value: impressions.value,
    });
  }
}

function pushLiCards(byKey: Map<string, Snap>, wins: OverviewCard[], issues: OverviewCard[]) {
  const dwell = byKey.get("dwell_proxy");
  if (dwell && dwell.value >= 0.55) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "LinkedIn: dwell proxy looks strong — docs/carousels holding attention",
      platform: "linkedin",
      metricKey: dwell.metricKey,
      value: dwell.value,
    });
  }

  const comments = byKey.get("comment_quality");
  if (comments && comments.value >= 0.6) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "LinkedIn: comment quality signal is healthy",
      platform: "linkedin",
      metricKey: comments.metricKey,
      value: comments.value,
    });
  }

  const velocity = byKey.get("first_hour_velocity");
  if (velocity && velocity.value > 0 && velocity.value < 0.025) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "LinkedIn: first-hour velocity is soft — sharpen the opening line",
      platform: "linkedin",
      metricKey: velocity.metricKey,
      value: velocity.value,
    });
  }

  const impressions = byKey.get("impressions");
  const reach = byKey.get("reach");
  if (impressions && reach) {
    const sb = shadowbanHeuristic({
      impressions: impressions.value,
      reach: reach.value,
    });
    if (sb.flag) {
      issues.push({
        kind: "issue",
        title: "Broken",
        body: `Heuristic: ${sb.reason}`,
        platform: "linkedin",
        metricKey: "shadowban_heuristic",
        value: sb.score,
      });
    }
  }

  const posts7d = byKey.get("posts_7d");
  const eng = byKey.get("engagement_rate");
  const prior = byKey.get("engagement_rate_prior");
  if (posts7d && eng) {
    const fatigue = contentFatigue({
      postCount: posts7d.value,
      windowDays: 7,
      avgEngagementRate: eng.value,
      priorAvgEngagementRate: prior?.value,
    });
    if (fatigue.flag) {
      issues.push({
        kind: "issue",
        title: "Broken",
        body: `Content fatigue: ${fatigue.reason}`,
        platform: "linkedin",
        metricKey: "content_fatigue",
        value: fatigue.score,
      });
    }
  }
}

function pushThreadsCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.03) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Threads: engagement rate looks healthy",
      platform: "threads",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.015) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Threads: engagement is soft — lead with a sharper hook",
      platform: "threads",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }

  const replies = byKey.get("replies");
  if (replies && replies.value >= 20) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Threads: replies are flowing — keep the conversation open",
      platform: "threads",
      metricKey: replies.metricKey,
      value: replies.value,
    });
  }

  const followers = byKey.get("followers_delta_7d");
  if (followers && followers.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Threads: follower delta is negative on recent signal",
      platform: "threads",
      metricKey: followers.metricKey,
      value: followers.value,
    });
  } else if (followers && followers.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Threads: followers are trending up",
      platform: "threads",
      metricKey: followers.metricKey,
      value: followers.value,
    });
  }
}

function pushTikTokCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.05) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "TikTok: engagement rate looks strong",
      platform: "tiktok",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.02) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "TikTok: engagement is soft — tighten the opening hook",
      platform: "tiktok",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }

  const watch = byKey.get("avg_watch_ratio");
  if (watch && watch.value > 0 && watch.value < 0.25) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "TikTok: watch ratio is low — cut the first three seconds tighter",
      platform: "tiktok",
      metricKey: watch.metricKey,
      value: watch.value,
    });
  } else if (watch && watch.value >= 0.4) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "TikTok: watch ratio looks healthy",
      platform: "tiktok",
      metricKey: watch.metricKey,
      value: watch.value,
    });
  }

  const followers = byKey.get("followers_delta_7d");
  if (followers && followers.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "TikTok: follower delta is negative on recent signal",
      platform: "tiktok",
      metricKey: followers.metricKey,
      value: followers.value,
    });
  } else if (followers && followers.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "TikTok: followers are trending up",
      platform: "tiktok",
      metricKey: followers.metricKey,
      value: followers.value,
    });
  }
}

function pushYouTubeCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.05) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "YouTube: engagement rate looks strong",
      platform: "youtube",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.02) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "YouTube: engagement is soft — tighten the opening hook",
      platform: "youtube",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }

  const watch = byKey.get("avg_view_duration_proxy");
  if (watch && watch.value > 0 && watch.value < 0.25) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "YouTube: view duration proxy is low — cut the intro tighter",
      platform: "youtube",
      metricKey: watch.metricKey,
      value: watch.value,
    });
  } else if (watch && watch.value >= 0.4) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "YouTube: view duration proxy looks healthy",
      platform: "youtube",
      metricKey: watch.metricKey,
      value: watch.value,
    });
  }

  const subs = byKey.get("subscribers_delta_7d");
  if (subs && subs.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "YouTube: subscriber delta is negative on recent signal",
      platform: "youtube",
      metricKey: subs.metricKey,
      value: subs.value,
    });
  } else if (subs && subs.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "YouTube: subscribers are trending up",
      platform: "youtube",
      metricKey: subs.metricKey,
      value: subs.value,
    });
  }
}

function pushPinterestCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  const saves = byKey.get("save_rate");
  if (saves && saves.value >= 0.03) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Pinterest: save rate looks healthy",
      platform: "pinterest",
      metricKey: saves.metricKey,
      value: saves.value,
    });
  } else if (saves && saves.value > 0 && saves.value < 0.01) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Pinterest: save rate is soft — tighten the pin hook",
      platform: "pinterest",
      metricKey: saves.metricKey,
      value: saves.value,
    });
  }

  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.05) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Pinterest: engagement rate looks strong",
      platform: "pinterest",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.02) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Pinterest: engagement is soft — test a clearer CTA",
      platform: "pinterest",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }

  const outbound = byKey.get("outbound_clicks");
  if (outbound && outbound.value > 50) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Pinterest: outbound clicks are moving",
      platform: "pinterest",
      metricKey: outbound.metricKey,
      value: outbound.value,
    });
  }
}

function pushBlueskyCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.03) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Bluesky: engagement rate looks healthy",
      platform: "bluesky",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.015) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Bluesky: engagement is soft — lead with a sharper hook",
      platform: "bluesky",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }

  const replies = byKey.get("replies");
  if (replies && replies.value >= 20) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Bluesky: replies are flowing — keep the conversation open",
      platform: "bluesky",
      metricKey: replies.metricKey,
      value: replies.value,
    });
  }

  const reposts = byKey.get("reposts");
  if (reposts && reposts.value >= 15) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Bluesky: reposts are moving — lean into shareable takes",
      platform: "bluesky",
      metricKey: reposts.metricKey,
      value: reposts.value,
    });
  }

  const followers = byKey.get("followers_delta_7d");
  if (followers && followers.value < 0) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Bluesky: follower delta is negative on recent signal",
      platform: "bluesky",
      metricKey: followers.metricKey,
      value: followers.value,
    });
  } else if (followers && followers.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Bluesky: followers are trending up",
      platform: "bluesky",
      metricKey: followers.metricKey,
      value: followers.value,
    });
  }
}

function pushRedditCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  // comments vs score (engagement_rate ≈ comments / score)
  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.2) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Reddit: comments vs score looks strong — posts are sparking discussion",
      platform: "reddit",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.08) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Reddit: comments vs score is soft — invite debate in the first line",
      platform: "reddit",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }

  const comments = byKey.get("comments");
  const score = byKey.get("score");
  if (comments && score && comments.value >= 20 && score.value > 0) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Reddit: comments are flowing relative to score",
      platform: "reddit",
      metricKey: comments.metricKey,
      value: comments.value,
    });
  }

  const ratio = byKey.get("upvote_ratio");
  if (ratio && ratio.value >= 0.85) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Reddit: upvote ratio looks healthy",
      platform: "reddit",
      metricKey: ratio.metricKey,
      value: ratio.value,
    });
  } else if (ratio && ratio.value > 0 && ratio.value < 0.6) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Reddit: upvote ratio is soft — tighten the title hook",
      platform: "reddit",
      metricKey: ratio.metricKey,
      value: ratio.value,
    });
  }
}

function pushMastodonCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.3) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Mastodon: replies/reblogs vs favourites looks strong — conversation over vanity",
      platform: "mastodon",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.12) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Mastodon: replies/reblogs soft vs favourites — ask one clear question",
      platform: "mastodon",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }

  const replies = byKey.get("replies");
  if (replies && replies.value >= 15) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Mastodon: replies are flowing",
      platform: "mastodon",
      metricKey: replies.metricKey,
      value: replies.value,
    });
  }

  const reblogs = byKey.get("reblogs");
  const favourites = byKey.get("favourites");
  if (reblogs && favourites && reblogs.value > favourites.value * 0.4) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Mastodon: boosts are carrying distribution",
      platform: "mastodon",
      metricKey: reblogs.metricKey,
      value: reblogs.value,
    });
  }
}

function pushTumblrCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  const notes = byKey.get("notes");
  if (notes && notes.value >= 80) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Tumblr: notes look strong — posts are sparking engagement",
      platform: "tumblr",
      metricKey: notes.metricKey,
      value: notes.value,
    });
  } else if (notes && notes.value > 0 && notes.value < 20) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Tumblr: notes are soft — lead with a sharper hook",
      platform: "tumblr",
      metricKey: notes.metricKey,
      value: notes.value,
    });
  }

  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.25) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Tumblr: note engagement rate looks healthy",
      platform: "tumblr",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.08) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Tumblr: note engagement is soft — invite reblogs in the first line",
      platform: "tumblr",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }
}

function pushTwitchCards(
  byKey: Map<string, Snap>,
  wins: OverviewCard[],
  issues: OverviewCard[],
) {
  const views = byKey.get("views");
  if (views && views.value >= 4000) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Twitch: VOD views look strong — titles and hooks are landing",
      platform: "twitch",
      metricKey: views.metricKey,
      value: views.value,
    });
  } else if (views && views.value > 0 && views.value < 500) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Twitch: VOD views are soft — sharpen the first-3-seconds hook",
      platform: "twitch",
      metricKey: views.metricKey,
      value: views.value,
    });
  }

  const eng = byKey.get("engagement_rate");
  if (eng && eng.value >= 0.25) {
    wins.push({
      kind: "win",
      title: "Working",
      body: "Twitch: view engagement rate looks healthy",
      platform: "twitch",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  } else if (eng && eng.value > 0 && eng.value < 0.08) {
    issues.push({
      kind: "issue",
      title: "Broken",
      body: "Twitch: view engagement is soft — lead with a clearer title promise",
      platform: "twitch",
      metricKey: eng.metricKey,
      value: eng.value,
    });
  }
}

export async function readOverview(userId: string): Promise<OverviewBoard> {
  const cacheKey = `overview:v1:${userId}`;
  const cached = await cacheStore.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as OverviewBoard;
    } catch {
      /* rebuild */
    }
  }

  const latest = await prisma.metricSnapshot.findMany({
    where: {
      userId,
      platform: {
        in: [
          "instagram",
          "facebook",
          "linkedin",
          "threads",
          "tiktok",
          "youtube",
          "pinterest",
          "bluesky",
          "reddit",
          "mastodon",
          "tumblr",
          "twitch",
        ],
      },
    },
    orderBy: { capturedAt: "desc" },
    take: 200,
  });

  const igByKey = new Map<string, (typeof latest)[0]>();
  const fbByKey = new Map<string, (typeof latest)[0]>();
  const liByKey = new Map<string, (typeof latest)[0]>();
  const thByKey = new Map<string, (typeof latest)[0]>();
  const ttByKey = new Map<string, (typeof latest)[0]>();
  const ytByKey = new Map<string, (typeof latest)[0]>();
  const pinByKey = new Map<string, (typeof latest)[0]>();
  const bskyByKey = new Map<string, (typeof latest)[0]>();
  const redditByKey = new Map<string, (typeof latest)[0]>();
  const mastodonByKey = new Map<string, (typeof latest)[0]>();
  const tumblrByKey = new Map<string, (typeof latest)[0]>();
  const twitchByKey = new Map<string, (typeof latest)[0]>();
  for (const row of latest) {
    const map =
      row.platform === "facebook"
        ? fbByKey
        : row.platform === "linkedin"
          ? liByKey
          : row.platform === "threads"
            ? thByKey
            : row.platform === "tiktok"
              ? ttByKey
              : row.platform === "youtube"
                ? ytByKey
                : row.platform === "pinterest"
                  ? pinByKey
                  : row.platform === "bluesky"
                    ? bskyByKey
                    : row.platform === "reddit"
                      ? redditByKey
                      : row.platform === "mastodon"
                        ? mastodonByKey
                        : row.platform === "tumblr"
                          ? tumblrByKey
                          : row.platform === "twitch"
                            ? twitchByKey
                            : igByKey;
    if (!map.has(row.metricKey)) map.set(row.metricKey, row);
  }

  const wins: OverviewCard[] = [];
  const issues: OverviewCard[] = [];
  pushIgCards(igByKey, wins, issues);
  pushFbCards(fbByKey, wins, issues);
  pushLiCards(liByKey, wins, issues);
  pushThreadsCards(thByKey, wins, issues);
  pushTikTokCards(ttByKey, wins, issues);
  pushYouTubeCards(ytByKey, wins, issues);
  pushPinterestCards(pinByKey, wins, issues);
  pushBlueskyCards(bskyByKey, wins, issues);
  pushRedditCards(redditByKey, wins, issues);
  pushMastodonCards(mastodonByKey, wins, issues);
  pushTumblrCards(tumblrByKey, wins, issues);
  pushTwitchCards(twitchByKey, wins, issues);

  const conn = await prisma.socialConnection.findFirst({
    where: {
      userId,
      platform: {
        in: [
          "instagram",
          "facebook",
          "linkedin",
          "threads",
          "tiktok",
          "youtube",
          "pinterest",
          "bluesky",
          "reddit",
          "mastodon",
          "tumblr",
          "twitch",
        ],
      },
      status: { in: ["connected", "error"] },
    },
    orderBy: { lastSyncAt: "desc" },
  });

  const empty = wins.length === 0 && issues.length === 0;
  let why: string | null = null;
  if (!empty) {
    try {
      const { explainOverviewWhy } = await import("@/lib/ai/features/overview-why");
      why = await explainOverviewWhy({
        userId,
        cards: [...issues, ...wins],
      });
    } catch {
      why = null;
    }
  }

  const board: OverviewBoard = {
    userId,
    empty,
    wins,
    issues,
    syncedAt: conn?.lastSyncAt?.toISOString() ?? latest[0]?.capturedAt.toISOString() ?? null,
    why,
  };

  await cacheStore.set(cacheKey, JSON.stringify(board), 60_000);
  return board;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getMetaConfig } from "@/lib/platforms/instagram/config";
import {
  disconnectInstagramAction,
  syncInstagramAction,
} from "@/app/actions/instagram";
import {
  disconnectFacebookAction,
  syncFacebookAction,
} from "@/app/actions/facebook";
import {
  disconnectLinkedInAction,
  syncLinkedInAction,
} from "@/app/actions/linkedin";
import { getLinkedInConfig } from "@/lib/platforms/linkedin/config";
import { getThreadsConfig } from "@/lib/platforms/threads/config";
import { getTikTokConfig } from "@/lib/platforms/tiktok/config";
import { getYouTubeConfig } from "@/lib/platforms/youtube/config";
import { getPinterestConfig } from "@/lib/platforms/pinterest/config";
import { getBlueskyConfig } from "@/lib/platforms/bluesky/config";
import { getRedditConfig } from "@/lib/platforms/reddit/config";
import { getMastodonConfig } from "@/lib/platforms/mastodon/config";
import { getTumblrConfig } from "@/lib/platforms/tumblr/config";
import { getTwitchConfig } from "@/lib/platforms/twitch/config";
import { getDiscordConfig } from "@/lib/platforms/discord/config";
import { getSlackConfig } from "@/lib/platforms/slack/config";
import { getVimeoConfig } from "@/lib/platforms/vimeo/config";
import { deleteAccountAction } from "@/app/actions/account";
import {
  disconnectThreadsAction,
  syncThreadsAction,
} from "@/app/actions/threads";
import {
  disconnectTikTokAction,
  syncTikTokAction,
} from "@/app/actions/tiktok";
import {
  disconnectYouTubeAction,
  syncYouTubeAction,
} from "@/app/actions/youtube";
import {
  disconnectPinterestAction,
  syncPinterestAction,
} from "@/app/actions/pinterest";
import {
  disconnectBlueskyAction,
  syncBlueskyAction,
} from "@/app/actions/bluesky";
import {
  disconnectRedditAction,
  syncRedditAction,
} from "@/app/actions/reddit";
import {
  disconnectMastodonAction,
  syncMastodonAction,
} from "@/app/actions/mastodon";
import {
  disconnectTumblrAction,
  syncTumblrAction,
} from "@/app/actions/tumblr";
import {
  disconnectTwitchAction,
  syncTwitchAction,
} from "@/app/actions/twitch";
import {
  disconnectDiscordAction,
  syncDiscordAction,
} from "@/app/actions/discord";
import {
  disconnectSlackAction,
  syncSlackAction,
} from "@/app/actions/slack";
import {
  disconnectVimeoAction,
  syncVimeoAction,
} from "@/app/actions/vimeo";

function PlatformSection({
  title,
  description,
  testIdPrefix,
  connectHref,
  connection,
  configured,
  configHint,
  syncAction,
  disconnectAction,
}: {
  title: string;
  description: string;
  testIdPrefix: string;
  connectHref: string;
  connection: {
    id: string;
    displayName: string | null;
    status: string;
    lastSyncAt: Date | null;
    lastSyncError: string | null;
  } | null;
  configured: boolean;
  configHint: string;
  syncAction: (formData: FormData) => Promise<void>;
  disconnectAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="mt-8 max-w-xl rounded-xl border border-[var(--pb-line)] bg-white/80 p-6">
      <h2 className="font-display text-xl font-semibold text-[var(--pb-ink)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--pb-slate)]">{description}</p>

      {!configured ? (
        <p className="mt-4 text-sm text-[var(--pb-warn)]">{configHint}</p>
      ) : null}

      {connection && connection.status !== "disconnected" ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-[var(--pb-ink)]">
            <span className="font-medium">{connection.displayName ?? title}</span>
            <span className="text-[var(--pb-slate)]"> · {connection.status}</span>
          </p>
          {connection.lastSyncAt ? (
            <p className="text-xs text-[var(--pb-slate)]">
              Last sync {connection.lastSyncAt.toISOString()}
            </p>
          ) : null}
          {connection.lastSyncError ? (
            <p className="text-xs text-[var(--pb-warn)]">{connection.lastSyncError}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <form action={syncAction}>
              <input type="hidden" name="connectionId" value={connection.id} />
              <button
                type="submit"
                data-testid={`${testIdPrefix}-sync`}
                className="rounded-md bg-[var(--pb-pulse)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--pb-pulse-deep)]"
              >
                Sync now
              </button>
            </form>
            <form action={disconnectAction}>
              <input type="hidden" name="connectionId" value={connection.id} />
              <button
                type="submit"
                data-testid={`${testIdPrefix}-disconnect`}
                className="rounded-md border border-[var(--pb-line)] px-4 py-2 text-sm font-semibold text-[var(--pb-ink)] hover:bg-white"
              >
                Disconnect
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <a
            href={connectHref}
            data-testid={`${testIdPrefix}-connect`}
            className={`inline-flex rounded-md px-4 py-2 text-sm font-semibold text-white ${
              configured
                ? "bg-[var(--pb-pulse)] hover:bg-[var(--pb-pulse-deep)]"
                : "pointer-events-none bg-[var(--pb-slate)] opacity-60"
            }`}
          >
            Connect {title}
          </a>
        </div>
      )}
    </section>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : null;
  const connected =
    typeof params.connected === "string" ? params.connected : null;
  const disconnected =
    typeof params.disconnected === "string" ? params.disconnected : null;

  const cfg = getMetaConfig();
  const liCfg = getLinkedInConfig();
  const thCfg = getThreadsConfig();
  const ttCfg = getTikTokConfig();
  const ytCfg = getYouTubeConfig();
  const pinCfg = getPinterestConfig();
  const bskyCfg = getBlueskyConfig();
  const redditCfg = getRedditConfig();
  const mastodonCfg = getMastodonConfig();
  const tumblrCfg = getTumblrConfig();
  const twitchCfg = getTwitchConfig();
  const discordCfg = getDiscordConfig();
  const slackCfg = getSlackConfig();
  const vimeoCfg = getVimeoConfig();
  const [ig, fb, li, th, tt, yt, pin, bsky, reddit, mastodon, tumblr, twitch, discord, slack, vimeo] =
    await Promise.all([
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "instagram" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "facebook" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "linkedin" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "threads" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "tiktok" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "youtube" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "pinterest" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "bluesky" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "reddit" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "mastodon" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "tumblr" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "twitch" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "discord" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "slack" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "vimeo" },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const label = (p: string | null) =>
    p === "facebook"
      ? "Facebook"
      : p === "linkedin"
        ? "LinkedIn"
        : p === "threads"
          ? "Threads"
          : p === "tiktok"
            ? "TikTok"
            : p === "youtube"
              ? "YouTube"
              : p === "pinterest"
                ? "Pinterest"
                : p === "bluesky"
                  ? "Bluesky"
                  : p === "reddit"
                    ? "Reddit"
                    : p === "mastodon"
                      ? "Mastodon"
                      : p === "tumblr"
                        ? "Tumblr"
                        : p === "twitch"
                          ? "Twitch"
                          : p === "discord"
                            ? "Discord"
                            : p === "slack"
                              ? "Slack"
                              : p === "vimeo"
                                ? "Vimeo"
                            : "Instagram";

  return (
    <main>
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        Settings
      </h1>

      {error ? (
        <p
          data-testid="settings-error"
          className="mt-4 rounded-md border border-[var(--pb-warn)]/40 bg-[var(--pb-warn)]/10 px-3 py-2 text-sm text-[var(--pb-warn)]"
        >
          {error}
        </p>
      ) : null}
      {connected ? (
        <p className="mt-4 text-sm text-[var(--pb-ok)]">
          {label(connected)} connected.
        </p>
      ) : null}
      {disconnected ? (
        <p className="mt-4 text-sm text-[var(--pb-slate)]">
          {label(disconnected)} disconnected.
        </p>
      ) : null}

      <PlatformSection
        title="Instagram"
        description="Connect an Instagram Business or Creator account linked to a Facebook Page. Tokens stay encrypted; Overview reads snapshots only."
        testIdPrefix="ig"
        connectHref="/api/oauth/instagram/start"
        connection={ig}
        configured={cfg.configured}
        configHint="Configure META_APP_ID + META_APP_SECRET, or set META_USE_FIXTURES=true."
        syncAction={syncInstagramAction}
        disconnectAction={disconnectInstagramAction}
      />

      <PlatformSection
        title="Facebook"
        description="Connect a Facebook Page. Separate connection from Instagram — same Meta stack, distinct scopes and snapshots."
        testIdPrefix="fb"
        connectHref="/api/oauth/facebook/start"
        connection={fb}
        configured={cfg.configured}
        configHint="Configure META_APP_ID + META_APP_SECRET, or set META_USE_FIXTURES=true."
        syncAction={syncFacebookAction}
        disconnectAction={disconnectFacebookAction}
      />

      <PlatformSection
        title="LinkedIn"
        description="Connect LinkedIn for dwell/comment quality and first-hour velocity signals. Fatigue and shadowban heuristics run on snapshots only."
        testIdPrefix="li"
        connectHref="/api/oauth/linkedin/start"
        connection={li}
        configured={liCfg.configured}
        configHint="Configure LINKEDIN_CLIENT_ID + SECRET, or set LINKEDIN_USE_FIXTURES=true."
        syncAction={syncLinkedInAction}
        disconnectAction={disconnectLinkedInAction}
      />

      <PlatformSection
        title="Threads"
        description="Connect Threads for views/replies/engagement snapshots. Live Graph needs a Meta Threads app; fixtures work locally."
        testIdPrefix="threads"
        connectHref="/api/oauth/threads/start"
        connection={th}
        configured={thCfg.configured}
        configHint="Configure THREADS_APP_ID + SECRET (or META_*), or THREADS_USE_FIXTURES=true."
        syncAction={syncThreadsAction}
        disconnectAction={disconnectThreadsAction}
      />

      <PlatformSection
        title="TikTok"
        description="Connect TikTok for video list + engagement snapshots (Display API). Live Content Posting needs TikTok app audit — fixtures for local UAT."
        testIdPrefix="tiktok"
        connectHref="/api/oauth/tiktok/start"
        connection={tt}
        configured={ttCfg.configured}
        configHint="Configure TIKTOK_CLIENT_KEY + SECRET, or TIKTOK_USE_FIXTURES=true."
        syncAction={syncTikTokAction}
        disconnectAction={disconnectTikTokAction}
      />

      <PlatformSection
        title="YouTube"
        description="Connect YouTube for channel video stats (Data API v3 readonly). Live upload deferred — fixtures for local UAT."
        testIdPrefix="youtube"
        connectHref="/api/oauth/youtube/start"
        connection={yt}
        configured={ytCfg.configured}
        configHint="Configure YOUTUBE_CLIENT_ID + SECRET, or YOUTUBE_USE_FIXTURES=true."
        syncAction={syncYouTubeAction}
        disconnectAction={disconnectYouTubeAction}
      />

      <PlatformSection
        title="Pinterest"
        description="Connect Pinterest for pin + board read metrics (API v5). Live pin create deferred — fixtures for local UAT."
        testIdPrefix="pinterest"
        connectHref="/api/oauth/pinterest/start"
        connection={pin}
        configured={pinCfg.configured}
        configHint="Configure PINTEREST_APP_ID + SECRET, or PINTEREST_USE_FIXTURES=true."
        syncAction={syncPinterestAction}
        disconnectAction={disconnectPinterestAction}
      />

      <PlatformSection
        title="Bluesky"
        description="Connect Bluesky for replies/reposts/engagement snapshots (ATProto). Live OAuth deferred — fixtures for local UAT."
        testIdPrefix="bluesky"
        connectHref="/api/oauth/bluesky/start"
        connection={bsky}
        configured={bskyCfg.useFixtures}
        configHint="Set BLUESKY_USE_FIXTURES=true (live OAuth deferred)."
        syncAction={syncBlueskyAction}
        disconnectAction={disconnectBlueskyAction}
      />

      <PlatformSection
        title="Reddit"
        description="Connect Reddit for submitted posts + comments/score/upvote ratio snapshots. Live submit deferred — fixtures for local UAT."
        testIdPrefix="reddit"
        connectHref="/api/oauth/reddit/start"
        connection={reddit}
        configured={redditCfg.configured}
        configHint="Configure REDDIT_CLIENT_ID + SECRET, or REDDIT_USE_FIXTURES=true."
        syncAction={syncRedditAction}
        disconnectAction={disconnectRedditAction}
      />

      <PlatformSection
        title="Mastodon"
        description="Connect Mastodon for statuses + replies/reblogs/favourites snapshots. Live status create deferred — fixtures for local UAT."
        testIdPrefix="mastodon"
        connectHref="/api/oauth/mastodon/start"
        connection={mastodon}
        configured={mastodonCfg.configured}
        configHint="Configure MASTODON_CLIENT_ID + SECRET, or MASTODON_USE_FIXTURES=true."
        syncAction={syncMastodonAction}
        disconnectAction={disconnectMastodonAction}
      />

      <PlatformSection
        title="Tumblr"
        description="Connect Tumblr for primary blog posts + notes snapshots. Live NPF create deferred — fixtures for local UAT."
        testIdPrefix="tumblr"
        connectHref="/api/oauth/tumblr/start"
        connection={tumblr}
        configured={tumblrCfg.configured}
        configHint="Configure TUMBLR_CLIENT_ID + SECRET, or TUMBLR_USE_FIXTURES=true."
        syncAction={syncTumblrAction}
        disconnectAction={disconnectTumblrAction}
      />

      <PlatformSection
        title="Twitch"
        description="Connect Twitch for VOD views + engagement snapshots (Helix). Live broadcast deferred — fixtures for local UAT."
        testIdPrefix="twitch"
        connectHref="/api/oauth/twitch/start"
        connection={twitch}
        configured={twitchCfg.configured}
        configHint="Configure TWITCH_CLIENT_ID + SECRET, or TWITCH_USE_FIXTURES=true."
        syncAction={syncTwitchAction}
        disconnectAction={disconnectTwitchAction}
      />

      <PlatformSection
        title="Discord"
        description="Connect Discord for fixture message/reaction metrics (live guild list). Channel history + message create deferred."
        testIdPrefix="discord"
        connectHref="/api/oauth/discord/start"
        connection={discord}
        configured={discordCfg.configured}
        configHint="Configure DISCORD_CLIENT_ID + SECRET, or DISCORD_USE_FIXTURES=true."
        syncAction={syncDiscordAction}
        disconnectAction={disconnectDiscordAction}
      />

      <PlatformSection
        title="Slack"
        description="Connect Slack for fixture message/reaction metrics (live channel list). conversations.history + chat.postMessage deferred."
        testIdPrefix="slack"
        connectHref="/api/oauth/slack/start"
        connection={slack}
        configured={slackCfg.configured}
        configHint="Configure SLACK_CLIENT_ID + SECRET, or SLACK_USE_FIXTURES=true."
        syncAction={syncSlackAction}
        disconnectAction={disconnectSlackAction}
      />

      <PlatformSection
        title="Vimeo"
        description="Connect Vimeo for video plays + engagement snapshots. Upload/edit deferred — fixtures for local UAT."
        testIdPrefix="vimeo"
        connectHref="/api/oauth/vimeo/start"
        connection={vimeo}
        configured={vimeoCfg.configured}
        configHint="Configure VIMEO_CLIENT_ID + SECRET, or VIMEO_USE_FIXTURES=true."
        syncAction={syncVimeoAction}
        disconnectAction={disconnectVimeoAction}
      />

      <section
        className="mt-8 max-w-xl rounded-xl border border-[var(--pb-line)] bg-white/80 p-6"
        data-testid="x-settings"
      >
        <h2 className="font-display text-xl font-semibold text-[var(--pb-ink)]">
          X
        </h2>
        <p className="mt-2 text-sm text-[var(--pb-slate)]">
          X is manual only — no OAuth, no API tokens, no auto-publish. Compose
          and copy from the X page, then paste into X yourself.
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--pb-slate)]">
          Capability: manualCopy · not auto-publish
        </p>
        <div className="mt-5">
          <Link
            href="/x"
            data-testid="x-open-compose"
            className="inline-flex rounded-md bg-[var(--pb-pulse)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--pb-pulse-deep)]"
          >
            Open X compose
          </Link>
        </div>
      </section>

      <ul className="mt-8 space-y-2 text-sm">
        <li>
          <Link
            href="/settings/health"
            className="font-medium text-[var(--pb-pulse-deep)] hover:underline"
          >
            Health
          </Link>
        </li>
      </ul>

      <section
        className="mt-12 max-w-xl rounded-xl border border-[var(--pb-warn)]/40 bg-white/80 p-6"
        data-testid="danger-zone"
      >
        <h2 className="font-display text-xl font-semibold text-[var(--pb-warn)]">
          Delete account
        </h2>
        <p className="mt-2 text-sm text-[var(--pb-slate)]">
          Permanently deletes your user, sessions, connections, posts, snapshots,
          drafts, jobs, and hook library. This cannot be undone.
        </p>
        <form action={deleteAccountAction} className="mt-4 space-y-3">
          <label className="block text-sm text-[var(--pb-ink)]" htmlFor="confirm">
            Type <span className="font-semibold">DELETE MY ACCOUNT</span> to confirm
          </label>
          <input
            id="confirm"
            name="confirm"
            data-testid="delete-confirm"
            className="w-full rounded-md border border-[var(--pb-line)] px-3 py-2 text-sm"
            autoComplete="off"
          />
          <button
            type="submit"
            data-testid="delete-account"
            className="rounded-md bg-[var(--pb-warn)] px-4 py-2 text-sm font-semibold text-white"
          >
            Delete my account
          </button>
        </form>
      </section>
    </main>
  );
}

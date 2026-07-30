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

function PlatformSection({
  title,
  description,
  testIdPrefix,
  connectHref,
  connection,
  configured,
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
        <p className="mt-4 text-sm text-[var(--pb-warn)]">
          Configure <code>META_APP_ID</code> + <code>META_APP_SECRET</code>, or
          set <code>META_USE_FIXTURES=true</code> for local/demo sync.
        </p>
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
  const [ig, fb] = await Promise.all([
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "instagram" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.socialConnection.findFirst({
      where: { userId: user.id, platform: "facebook" },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

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
          {connected === "facebook" ? "Facebook" : "Instagram"} connected.
        </p>
      ) : null}
      {disconnected ? (
        <p className="mt-4 text-sm text-[var(--pb-slate)]">
          {disconnected === "facebook" ? "Facebook" : "Instagram"} disconnected.
        </p>
      ) : null}

      <PlatformSection
        title="Instagram"
        description="Connect an Instagram Business or Creator account linked to a Facebook Page. Tokens stay encrypted; Overview reads snapshots only."
        testIdPrefix="ig"
        connectHref="/api/oauth/instagram/start"
        connection={ig}
        configured={cfg.configured}
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
        syncAction={syncFacebookAction}
        disconnectAction={disconnectFacebookAction}
      />

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
    </main>
  );
}

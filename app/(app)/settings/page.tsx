import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getMetaConfig } from "@/lib/platforms/instagram/config";
import {
  disconnectInstagramAction,
  syncInstagramAction,
} from "@/app/actions/instagram";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : null;
  const connected = params.connected === "instagram";
  const disconnected = params.disconnected === "instagram";

  const cfg = getMetaConfig();
  const connection = await prisma.socialConnection.findFirst({
    where: { userId: user.id, platform: "instagram" },
    orderBy: { updatedAt: "desc" },
  });

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
        <p className="mt-4 text-sm text-[var(--pb-ok)]">Instagram connected.</p>
      ) : null}
      {disconnected ? (
        <p className="mt-4 text-sm text-[var(--pb-slate)]">Instagram disconnected.</p>
      ) : null}

      <section className="mt-8 max-w-xl rounded-xl border border-[var(--pb-line)] bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold text-[var(--pb-ink)]">
          Instagram
        </h2>
        <p className="mt-2 text-sm text-[var(--pb-slate)]">
          Connect an Instagram Business or Creator account linked to a Facebook
          Page. Pulseboard stores tokens encrypted and syncs posts/metrics into
          snapshots — Overview never calls Meta on page load.
        </p>

        {!cfg.configured ? (
          <p className="mt-4 text-sm text-[var(--pb-warn)]">
            Configure <code>META_APP_ID</code> + <code>META_APP_SECRET</code>, or
            set <code>META_USE_FIXTURES=true</code> for local/demo sync.
          </p>
        ) : null}

        {connection && connection.status !== "disconnected" ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-[var(--pb-ink)]">
              <span className="font-medium">{connection.displayName ?? "Instagram"}</span>
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
              <form action={syncInstagramAction}>
                <input type="hidden" name="connectionId" value={connection.id} />
                <button
                  type="submit"
                  data-testid="ig-sync"
                  className="rounded-md bg-[var(--pb-pulse)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--pb-pulse-deep)]"
                >
                  Sync now
                </button>
              </form>
              <form action={disconnectInstagramAction}>
                <input type="hidden" name="connectionId" value={connection.id} />
                <button
                  type="submit"
                  data-testid="ig-disconnect"
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
              href="/api/oauth/instagram/start"
              data-testid="ig-connect"
              className={`inline-flex rounded-md px-4 py-2 text-sm font-semibold text-white ${
                cfg.configured
                  ? "bg-[var(--pb-pulse)] hover:bg-[var(--pb-pulse-deep)]"
                  : "pointer-events-none bg-[var(--pb-slate)] opacity-60"
              }`}
            >
              Connect Instagram
            </a>
          </div>
        )}
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
    </main>
  );
}

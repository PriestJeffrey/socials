import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { previewForPlatform } from "@/lib/content/repurpose";
import {
  createDraftAction,
  repurposeDraftAction,
} from "@/app/actions/create";

export default async function CreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : null;
  const saved = typeof params.saved === "string" ? params.saved : null;
  const published = typeof params.published === "string" ? params.published : null;
  const repurposed = typeof params.repurposed === "string" ? params.repurposed : null;

  const [connections, recent] = await Promise.all([
    prisma.socialConnection.findMany({
      where: { userId: user.id, status: "connected" },
      orderBy: { platform: "asc" },
    }),
    prisma.draft.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const connected = new Set(connections.map((c) => c.platform));
  const samplePreview = previewForPlatform(
    "Your hook goes here — platform preview trims length.",
    "instagram",
  );

  return (
    <main data-testid="create-page">
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        Create
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--pb-slate)]">
        Draft once, preview, then publish or schedule to Instagram / Facebook /
        LinkedIn. X is copy-only.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-[var(--pb-warn)]" data-testid="create-error">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-4 text-sm text-[var(--pb-ok)]">Draft saved.</p>
      ) : null}
      {published ? (
        <p className="mt-4 text-sm text-[var(--pb-ok)]">
          Publish queued/complete.{" "}
          <Link href="/calendar" className="underline">
            Calendar
          </Link>
        </p>
      ) : null}
      {repurposed ? (
        <p className="mt-4 text-sm text-[var(--pb-ok)]">
          Repurposed into {repurposed} draft(s).
        </p>
      ) : null}

      <form action={createDraftAction} className="mt-8 max-w-xl space-y-4" data-testid="create-form">
        <div>
          <label className="text-sm font-medium text-[var(--pb-ink)]" htmlFor="platform">
            Platform
          </label>
          <select
            id="platform"
            name="platform"
            data-testid="create-platform"
            className="mt-1 w-full rounded-md border border-[var(--pb-line)] bg-white px-3 py-2 text-sm"
            defaultValue="instagram"
          >
            <option value="instagram">
              Instagram{connected.has("instagram") ? "" : " (connect in Settings)"}
            </option>
            <option value="facebook">
              Facebook{connected.has("facebook") ? "" : " (connect in Settings)"}
            </option>
            <option value="linkedin">
              LinkedIn{connected.has("linkedin") ? "" : " (connect in Settings)"}
            </option>
            <option value="x">X (copy only)</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--pb-ink)]" htmlFor="body">
            Body
          </label>
          <textarea
            id="body"
            name="body"
            required
            rows={6}
            data-testid="create-body"
            className="mt-1 w-full rounded-md border border-[var(--pb-line)] bg-white px-3 py-2 text-sm"
            placeholder="Write the post…"
          />
          <p className="mt-1 text-xs text-[var(--pb-slate)]">
            Preview trim example: {samplePreview.slice(0, 80)}…
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-[var(--pb-ink)]" htmlFor="goalTag">
              Goal tag
            </label>
            <input
              id="goalTag"
              name="goalTag"
              data-testid="create-goal"
              className="mt-1 w-full rounded-md border border-[var(--pb-line)] bg-white px-3 py-2 text-sm"
              placeholder="awareness / leads / trust"
            />
          </div>
          <div>
            <label
              className="text-sm font-medium text-[var(--pb-ink)]"
              htmlFor="conversionNote"
            >
              Manual conversion
            </label>
            <input
              id="conversionNote"
              name="conversionNote"
              data-testid="create-conversion"
              className="mt-1 w-full rounded-md border border-[var(--pb-line)] bg-white px-3 py-2 text-sm"
              placeholder="e.g. 2 DMs from carousel"
            />
          </div>
        </div>

        <div>
          <label
            className="text-sm font-medium text-[var(--pb-ink)]"
            htmlFor="scheduledAt"
          >
            Schedule (optional)
          </label>
          <input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            data-testid="create-schedule"
            className="mt-1 w-full rounded-md border border-[var(--pb-line)] bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="mode"
            value="save"
            data-testid="create-save"
            className="rounded-md border border-[var(--pb-line)] px-4 py-2 text-sm font-semibold text-[var(--pb-ink)]"
          >
            Save draft
          </button>
          <button
            type="submit"
            name="mode"
            value="publish"
            data-testid="create-publish"
            className="rounded-md bg-[var(--pb-pulse)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--pb-pulse-deep)]"
          >
            Publish now
          </button>
          <button
            type="submit"
            name="mode"
            value="schedule"
            data-testid="create-schedule-submit"
            className="rounded-md border border-[var(--pb-pulse)] px-4 py-2 text-sm font-semibold text-[var(--pb-pulse-deep)]"
          >
            Schedule
          </button>
        </div>
      </form>

      {recent.length > 0 ? (
        <section className="mt-12 max-w-xl">
          <h2 className="font-display text-xl font-semibold text-[var(--pb-ink)]">
            Recent drafts
          </h2>
          <ul className="mt-4 space-y-3">
            {recent.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-[var(--pb-line)] bg-white/80 px-4 py-3 text-sm"
                data-testid={`draft-${d.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[var(--pb-ink)]">
                    {d.platform} · {d.status}
                  </span>
                  {d.goalTag ? (
                    <span className="text-xs text-[var(--pb-slate)]">{d.goalTag}</span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-[var(--pb-slate)]">{d.body}</p>
                <form action={repurposeDraftAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="draftId" value={d.id} />
                  {(["instagram", "facebook", "linkedin", "x"] as const)
                    .filter((p) => p !== d.platform)
                    .map((p) => (
                      <label key={p} className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="target" value={p} />
                        {p}
                      </label>
                    ))}
                  <button
                    type="submit"
                    data-testid={`repurpose-${d.id}`}
                    className="rounded-md border border-[var(--pb-line)] px-2 py-1 text-xs font-semibold"
                  >
                    Repurpose
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

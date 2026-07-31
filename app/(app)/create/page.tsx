import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { previewForPlatform } from "@/lib/content/repurpose";
import {
  createDraftAction,
  draftAssistAction,
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
  const suggested =
    typeof params.suggested === "string" ? params.suggested : null;
  const flashPlatform =
    typeof params.platform === "string" ? params.platform : null;

  const { takeDraftSuggestFlash } = await import("@/lib/flash/draft-suggest");
  const flash = suggested
    ? await takeDraftSuggestFlash(user.id)
    : null;
  const suggestBody = flash?.body ?? "";
  const suggestPlatform = flash?.platform ?? flashPlatform ?? "instagram";

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
    "Your hook goes here - platform preview trims length.",
    "instagram",
  );

  return (
    <main data-testid="create-page" className="pb-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pb-pulse-deep)]">
        Studio
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-[var(--pb-ink)]">
        Create
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--pb-slate)]">
        Draft once, preview, then publish or schedule to Instagram / Facebook /
        LinkedIn. X is copy-only.
      </p>

      <p
        className="pb-panel mt-4 max-w-xl rounded-xl px-4 py-3 text-xs text-[var(--pb-slate)]"
        data-testid="create-fixture-banner"
      >
        Right now Meta (IG/FB) is still fixture/local. LinkedIn is live when
        connected — Publish posts to your real LinkedIn profile. Live Instagram
        needs a public https image or video URL. X never auto-publishes — use
        Compose X to copy.
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
          Publish queued or complete. Check LinkedIn (live) or Calendar for
          status.{" "}
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
      {suggestBody ? (
        <p className="mt-4 text-sm text-[var(--pb-ok)]" data-testid="create-suggested">
          AI draft filled below - review before save/publish.
        </p>
      ) : null}

      <form
        action={createDraftAction}
        className="pb-panel pb-panel-3d mt-8 max-w-xl space-y-4 rounded-2xl p-6"
        data-testid="create-form"
      >
        <div>
          <label className="text-sm font-medium text-[var(--pb-ink)]" htmlFor="platform">
            Platform
          </label>
          <select
            id="platform"
            name="platform"
            data-testid="create-platform"
            className="pb-input"
            defaultValue={suggestPlatform}
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
            className="pb-input resize-y"
            placeholder="Write the post…"
            defaultValue={suggestBody}
          />
          <p className="mt-1 text-xs text-[var(--pb-slate)]">
            Preview trim example: {samplePreview.slice(0, 80)}…
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--pb-ink)]" htmlFor="mediaUrl">
            Media URL (Instagram live)
          </label>
          <input
            id="mediaUrl"
            name="mediaUrl"
            type="url"
            data-testid="create-media-url"
            className="pb-input"
            placeholder="https://… image or video (required for live IG publish)"
          />
          <p className="mt-1 text-xs text-[var(--pb-slate)]">
            Meta cannot publish caption-only IG feed posts. Optional for FB/LI
            and fixture mode.
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
              className="pb-input"
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
              className="pb-input"
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
            className="pb-input"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            name="mode"
            value="save"
            data-testid="create-save"
            className="pb-btn pb-btn-ghost"
          >
            Save draft
          </button>
          <button
            type="submit"
            name="mode"
            value="publish"
            data-testid="create-publish"
            className="pb-btn pb-btn-primary"
          >
            Publish
          </button>
          <button
            type="submit"
            name="mode"
            value="schedule"
            data-testid="create-schedule-submit"
            className="pb-btn pb-btn-ghost border-[var(--pb-pulse)] text-[var(--pb-pulse-deep)]"
          >
            Schedule
          </button>
        </div>
      </form>

      <form
        action={draftAssistAction}
        className="pb-panel mt-4 max-w-xl space-y-3 rounded-2xl p-5"
        data-testid="draft-assist-form"
      >
        <p className="text-sm font-semibold text-[var(--pb-ink)]">AI draft assist</p>
        <p className="text-xs text-[var(--pb-slate)]">
          Suggests a body from platform + goal. Review before publish.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            name="platform"
            className="pb-input !mt-0"
            defaultValue="instagram"
          >
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="x">X</option>
          </select>
          <input
            name="goalTag"
            placeholder="Goal"
            className="pb-input !mt-0"
          />
        </div>
        <input
          name="seed"
          placeholder="Optional seed notes"
          className="pb-input !mt-0"
        />
        <button
          type="submit"
          data-testid="create-ai-suggest"
          className="pb-btn pb-btn-ghost border-[var(--pb-pulse)] text-[var(--pb-pulse-deep)]"
        >
          Suggest draft
        </button>
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
                className="pb-panel rounded-xl px-4 py-3 text-sm"
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
                  {(
                    [
                      "instagram",
                      "facebook",
                      "linkedin",
                      "x",
                    ] as const
                  )
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
                    className="pb-btn pb-btn-ghost !px-2.5 !py-1 text-xs"
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

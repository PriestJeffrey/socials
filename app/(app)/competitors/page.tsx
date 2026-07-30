import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { analyzeCompetitorAction } from "@/app/actions/competitors";

export default async function CompetitorsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : null;
  const saved = typeof params.saved === "string" ? params.saved : null;

  const items = await prisma.hookLibraryItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <main data-testid="competitors-page">
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        Competitors
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--pb-slate)]">
        Paste a competitor caption. AI extracts hook / structure / CTA into your
        library (fixtures or Gemini).
      </p>

      {error ? (
        <p className="mt-4 text-sm text-[var(--pb-warn)]" data-testid="competitors-error">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-4 text-sm text-[var(--pb-ok)]" data-testid="competitors-saved">
          Saved to hook library.{" "}
          <Link href="/create" className="underline">
            Draft from Create
          </Link>
        </p>
      ) : null}

      <form
        action={analyzeCompetitorAction}
        className="mt-8 max-w-xl space-y-4"
        data-testid="competitors-form"
      >
        <div>
          <label className="text-sm font-medium text-[var(--pb-ink)]" htmlFor="platform">
            Platform
          </label>
          <select
            id="platform"
            name="platform"
            data-testid="competitors-platform"
            className="mt-1 w-full rounded-md border border-[var(--pb-line)] bg-white px-3 py-2 text-sm"
            defaultValue="instagram"
          >
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="threads">Threads</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="pinterest">Pinterest</option>
            <option value="bluesky">Bluesky</option>
            <option value="reddit">Reddit</option>
            <option value="mastodon">Mastodon</option>
            <option value="tumblr">Tumblr</option>
            <option value="twitch">Twitch</option>
            <option value="x">X</option>
            <option value="generic">Generic</option>
          </select>
        </div>
        <div>
          <label
            className="text-sm font-medium text-[var(--pb-ink)]"
            htmlFor="sourceText"
          >
            Paste caption
          </label>
          <textarea
            id="sourceText"
            name="sourceText"
            required
            rows={6}
            minLength={20}
            data-testid="competitors-paste"
            className="mt-1 w-full rounded-md border border-[var(--pb-line)] bg-white px-3 py-2 text-sm"
            placeholder="Paste a competitor post…"
          />
        </div>
        <button
          type="submit"
          data-testid="competitors-analyze"
          className="rounded-md bg-[var(--pb-pulse)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--pb-pulse-deep)]"
        >
          Analyze → library
        </button>
      </form>

      <section className="mt-12 max-w-2xl">
        <h2 className="font-display text-xl font-semibold text-[var(--pb-ink)]">
          Hook library
        </h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--pb-slate)]">No hooks yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                data-testid={`hook-${item.id}`}
                className="rounded-lg border border-[var(--pb-line)] bg-white/80 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--pb-slate)]">
                  {item.platform}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--pb-ink)]">
                  {item.hook}
                </p>
                {item.structure ? (
                  <p className="mt-1 text-xs text-[var(--pb-slate)]">
                    Structure: {item.structure}
                  </p>
                ) : null}
                {item.cta ? (
                  <p className="mt-1 text-xs text-[var(--pb-slate)]">CTA: {item.cta}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

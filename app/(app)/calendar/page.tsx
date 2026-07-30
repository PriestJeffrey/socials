import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { publishExistingDraftAction } from "@/app/actions/create";
import { processPendingJobs } from "@/lib/jobs/runner";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Drain due scheduled publishes when Human opens calendar
  await processPendingJobs(10);

  const params = (await searchParams) ?? {};
  const flash =
    typeof params.scheduled === "string"
      ? "Scheduled."
      : typeof params.published === "string"
        ? "Published."
        : typeof params.error === "string"
          ? params.error
          : null;

  const items = await prisma.draft.findMany({
    where: {
      userId: user.id,
      status: { in: ["scheduled", "published", "failed", "draft"] },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 40,
  });

  return (
    <main data-testid="calendar-page">
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        Calendar
      </h1>
      <p className="mt-2 text-sm text-[var(--pb-slate)]">
        Scheduled and recent drafts. Due jobs run when you open this page.
      </p>
      {flash ? (
        <p className="mt-4 text-sm text-[var(--pb-ok)]" data-testid="calendar-flash">
          {flash}
        </p>
      ) : null}

      <ul className="mt-8 max-w-2xl space-y-3">
        {items.length === 0 ? (
          <li className="text-sm text-[var(--pb-slate)]">
            Nothing yet.{" "}
            <Link href="/create" className="font-medium text-[var(--pb-pulse-deep)] underline">
              Create a draft
            </Link>
          </li>
        ) : (
          items.map((d) => (
            <li
              key={d.id}
              data-testid={`cal-${d.id}`}
              className="rounded-lg border border-[var(--pb-line)] bg-white/80 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-[var(--pb-ink)]">
                  {d.platform} · {d.status}
                </span>
                <span className="text-xs text-[var(--pb-slate)]">
                  {d.scheduledAt
                    ? `Scheduled ${d.scheduledAt.toISOString()}`
                    : d.updatedAt.toISOString()}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-[var(--pb-slate)]">{d.body}</p>
              {d.goalTag || d.conversionNote ? (
                <p className="mt-1 text-xs text-[var(--pb-slate)]">
                  {d.goalTag ? `Goal: ${d.goalTag}` : null}
                  {d.goalTag && d.conversionNote ? " · " : null}
                  {d.conversionNote ? `Conversion: ${d.conversionNote}` : null}
                </p>
              ) : null}
              {d.status !== "published" && d.platform !== "x" ? (
                <form action={publishExistingDraftAction} className="mt-2">
                  <input type="hidden" name="draftId" value={d.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-[var(--pb-pulse-deep)] underline"
                  >
                    Publish now
                  </button>
                </form>
              ) : null}
              {d.platform === "x" ? (
                <Link
                  href={`/x?fromDraft=${d.id}`}
                  className="mt-2 inline-block text-xs font-semibold text-[var(--pb-pulse-deep)] underline"
                >
                  Open X compose
                </Link>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </main>
  );
}

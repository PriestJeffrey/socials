import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  approveDraftAction,
  publishApprovedAction,
  rejectDraftAction,
  runSentimentAction,
  submitForReviewAction,
} from "@/app/actions/approvals";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = (await searchParams) ?? {};
  const flash =
    typeof params.error === "string"
      ? params.error
      : typeof params.submitted === "string"
        ? "Submitted for review."
        : typeof params.approved === "string"
          ? "Approved."
          : typeof params.rejected === "string"
            ? "Rejected — back to draft."
            : typeof params.sentiment === "string"
              ? "Sentiment updated."
              : null;
  const flashOk = typeof params.error !== "string" && Boolean(flash);

  const items = await prisma.draft.findMany({
    where: {
      userId: user.id,
      status: { in: ["draft", "in_review", "approved", "rejected", "failed"] },
      platform: { not: "x" },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <main data-testid="approvals-page">
      <h1 className="font-display text-3xl font-semibold text-[var(--pb-ink)]">
        Approvals
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--pb-slate)]">
        Workflow: draft → in review → approved → published. Publish now from
        Create still auto-approves for solo use.
      </p>

      {flash ? (
        <p
          className={`mt-4 text-sm ${flashOk ? "text-[var(--pb-ok)]" : "text-[var(--pb-warn)]"}`}
          data-testid="approvals-flash"
        >
          {flash}
        </p>
      ) : null}

      <ul className="mt-8 max-w-2xl space-y-3">
        {items.length === 0 ? (
          <li className="text-sm text-[var(--pb-slate)]">
            No drafts in the queue. Create one first.
          </li>
        ) : (
          items.map((d) => (
            <li
              key={d.id}
              data-testid={`approval-${d.id}`}
              className="rounded-lg border border-[var(--pb-line)] bg-white/80 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-[var(--pb-ink)]">
                  {d.platform} · {d.status}
                </span>
                {d.sentimentLabel ? (
                  <span className="text-xs text-[var(--pb-slate)]">
                    Sentiment: {d.sentimentLabel}
                    {typeof d.sentimentScore === "number"
                      ? ` (${d.sentimentScore.toFixed(2)})`
                      : ""}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-3 text-sm text-[var(--pb-slate)]">
                {d.body}
              </p>
              {d.sentimentNote ? (
                <p className="mt-1 text-xs text-[var(--pb-slate)]">{d.sentimentNote}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {d.status === "draft" || d.status === "rejected" || d.status === "failed" ? (
                  <form action={submitForReviewAction}>
                    <input type="hidden" name="draftId" value={d.id} />
                    <button
                      type="submit"
                      data-testid={`submit-review-${d.id}`}
                      className="rounded-md border border-[var(--pb-line)] px-3 py-1.5 text-xs font-semibold"
                    >
                      Submit for review
                    </button>
                  </form>
                ) : null}
                {d.status === "in_review" ? (
                  <>
                    <form action={approveDraftAction}>
                      <input type="hidden" name="draftId" value={d.id} />
                      <button
                        type="submit"
                        data-testid={`approve-${d.id}`}
                        className="rounded-md bg-[var(--pb-pulse)] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={rejectDraftAction}>
                      <input type="hidden" name="draftId" value={d.id} />
                      <button
                        type="submit"
                        data-testid={`reject-${d.id}`}
                        className="rounded-md border border-[var(--pb-warn)] px-3 py-1.5 text-xs font-semibold text-[var(--pb-warn)]"
                      >
                        Reject
                      </button>
                    </form>
                  </>
                ) : null}
                {d.status === "approved" ? (
                  <form action={publishApprovedAction}>
                    <input type="hidden" name="draftId" value={d.id} />
                    <button
                      type="submit"
                      data-testid={`publish-approved-${d.id}`}
                      className="rounded-md bg-[var(--pb-pulse)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Publish approved
                    </button>
                  </form>
                ) : null}
                <form action={runSentimentAction}>
                  <input type="hidden" name="draftId" value={d.id} />
                  <button
                    type="submit"
                    data-testid={`sentiment-${d.id}`}
                    className="rounded-md border border-[var(--pb-line)] px-3 py-1.5 text-xs font-semibold"
                  >
                    Run sentiment
                  </button>
                </form>
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}

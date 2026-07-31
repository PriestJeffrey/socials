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
            ? "Rejected - back to draft."
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
    <main data-testid="approvals-page" className="pb-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--pb-pulse-deep)]">
        Workflow
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-[var(--pb-ink)]">
        Approvals
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--pb-slate)]">
        Workflow: draft → in review → approved → published. Publish from Create
        still auto-approves for solo use. Publishing is local/fixture-only until
        live Graph posting ships.
      </p>

      <p
        className="pb-panel mt-4 max-w-xl rounded-xl px-4 py-3 text-xs text-[var(--pb-slate)]"
        data-testid="approvals-fixture-banner"
      >
        “Publish approved” creates a local fixture post when fixtures are enabled.
        It does not post to the live platform API.
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
              className="pb-panel rounded-xl px-4 py-3"
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
                      className="pb-btn pb-btn-ghost !px-3 !py-1.5 text-xs"
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
                        className="pb-btn pb-btn-primary !px-3 !py-1.5 text-xs"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={rejectDraftAction}>
                      <input type="hidden" name="draftId" value={d.id} />
                      <button
                        type="submit"
                        data-testid={`reject-${d.id}`}
                        className="pb-btn pb-btn-ghost !px-3 !py-1.5 text-xs border-[var(--pb-warn)] text-[var(--pb-warn)]"
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
                      className="pb-btn pb-btn-primary !px-3 !py-1.5 text-xs"
                    >
                      Publish approved (local)
                    </button>
                  </form>
                ) : null}
                <form action={runSentimentAction}>
                  <input type="hidden" name="draftId" value={d.id} />
                  <button
                    type="submit"
                    data-testid={`sentiment-${d.id}`}
                    className="pb-btn pb-btn-ghost !px-3 !py-1.5 text-xs"
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

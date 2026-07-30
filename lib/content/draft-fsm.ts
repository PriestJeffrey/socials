/**
 * Phase 7 — draft approval state machine (server-side only).
 * draft → in_review → approved → published
 * in_review → draft (reject)
 * approved → in_review (optional reopen — not exposed in V1 UI)
 * Solo "Publish now" may auto-approve then publish.
 */

export type DraftWorkflowStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type DraftTransition =
  | "submit_review"
  | "approve"
  | "reject"
  | "auto_approve"
  | "mark_scheduled"
  | "mark_publishing"
  | "mark_published"
  | "mark_failed";

const ALLOWED: Record<DraftTransition, ReadonlySet<string>> = {
  submit_review: new Set(["draft", "rejected", "failed"]),
  approve: new Set(["in_review"]),
  reject: new Set(["in_review"]),
  auto_approve: new Set(["draft", "rejected", "failed", "approved", "in_review"]),
  mark_scheduled: new Set(["draft", "approved", "rejected", "failed"]),
  mark_publishing: new Set(["draft", "approved", "scheduled", "failed"]),
  mark_published: new Set(["publishing", "approved", "scheduled"]),
  mark_failed: new Set(["publishing", "scheduled", "approved", "in_review", "draft"]),
};

const NEXT: Record<DraftTransition, DraftWorkflowStatus> = {
  submit_review: "in_review",
  approve: "approved",
  reject: "draft",
  auto_approve: "approved",
  mark_scheduled: "scheduled",
  mark_publishing: "publishing",
  mark_published: "published",
  mark_failed: "failed",
};

export function canTransition(
  from: string,
  transition: DraftTransition,
): boolean {
  return ALLOWED[transition].has(from);
}

export function nextStatus(
  from: string,
  transition: DraftTransition,
): DraftWorkflowStatus {
  if (!canTransition(from, transition)) {
    throw new Error(`Illegal transition ${transition} from status=${from}`);
  }
  return NEXT[transition];
}

/** Publishable statuses for fixture/local publish path. */
export function isPublishableStatus(status: string): boolean {
  return status === "approved" || status === "scheduled" || status === "draft";
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { transitionDraft } from "@/lib/content/transitions";
import { analyzeDraftSentiment } from "@/lib/ai/features/sentiment";
import { jobQueue } from "@/lib/jobs";
import { processPendingJobs } from "@/lib/jobs/runner";
import { clock } from "@/lib/clock";

function formStr(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function submitForReviewAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const draftId = formStr(formData, "draftId");
  try {
    await transitionDraft({
      userId: user.id,
      draftId,
      transition: "submit_review",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submit failed";
    redirect(`/approvals?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/approvals");
  revalidatePath("/create");
  redirect(`/approvals?submitted=${draftId}`);
}

export async function approveDraftAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const draftId = formStr(formData, "draftId");
  try {
    await transitionDraft({
      userId: user.id,
      draftId,
      transition: "approve",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Approve failed";
    redirect(`/approvals?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/approvals");
  redirect(`/approvals?approved=${draftId}`);
}

export async function rejectDraftAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const draftId = formStr(formData, "draftId");
  try {
    await transitionDraft({
      userId: user.id,
      draftId,
      transition: "reject",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reject failed";
    redirect(`/approvals?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/approvals");
  redirect(`/approvals?rejected=${draftId}`);
}

export async function publishApprovedAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const draftId = formStr(formData, "draftId");
  try {
    await jobQueue.enqueue({
      userId: user.id,
      type: "publish",
      payload: { draftId },
      idempotencyKey: `publish:${draftId}:approved:${clock.now().toISOString()}`,
    });
    await processPendingJobs(5, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    redirect(`/approvals?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/approvals");
  revalidatePath("/calendar");
  redirect(`/calendar?published=${draftId}`);
}

export async function runSentimentAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const draftId = formStr(formData, "draftId");
  try {
    await analyzeDraftSentiment({ userId: user.id, draftId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sentiment failed";
    redirect(`/approvals?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/approvals");
  redirect(`/approvals?sentiment=${draftId}`);
}

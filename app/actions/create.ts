"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/audit/log";
import { jobQueue } from "@/lib/jobs";
import { processPendingJobs } from "@/lib/jobs/runner";
import { clock } from "@/lib/clock";
import { repurposeBody, type RepurposePlatform } from "@/lib/content/repurpose";

const PLATFORMS = new Set(["instagram", "facebook", "linkedin", "x"]);

function formStr(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createDraftAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const platform = formStr(formData, "platform");
  const body = formStr(formData, "body");
  const goalTag = formStr(formData, "goalTag") || null;
  const conversionNote = formStr(formData, "conversionNote") || null;
  const mode = formStr(formData, "mode"); // save | publish | schedule
  const scheduleRaw = formStr(formData, "scheduledAt");

  if (!PLATFORMS.has(platform) || !body) {
    redirect("/create?error=Invalid%20draft");
  }

  const draft = await prisma.draft.create({
    data: {
      userId: user.id,
      platform,
      body,
      goalTag,
      conversionNote,
      status: "draft",
    },
  });

  await writeAudit({
    userId: user.id,
    action: "content.draft_created",
    metadata: { draftId: draft.id, platform },
  });

  if (platform === "x") {
    redirect(`/x?fromDraft=${draft.id}`);
  }

  if (mode === "publish") {
    await jobQueue.enqueue({
      userId: user.id,
      type: "publish",
      payload: { draftId: draft.id },
      idempotencyKey: `publish:${draft.id}`,
    });
    await processPendingJobs(5, user.id);
    revalidatePath("/calendar");
    redirect(`/create?published=${draft.id}`);
  }

  if (mode === "schedule") {
    const when = scheduleRaw ? new Date(scheduleRaw) : null;
    if (!when || Number.isNaN(when.getTime()) || when.getTime() <= clock.now().getTime()) {
      redirect(`/create?error=Pick%20a%20future%20schedule%20time&draft=${draft.id}`);
    }
    await prisma.draft.update({
      where: { id: draft.id },
      data: { status: "scheduled", scheduledAt: when },
    });
    await jobQueue.enqueue({
      userId: user.id,
      type: "publish",
      payload: { draftId: draft.id },
      idempotencyKey: `publish:${draft.id}:${when.toISOString()}`,
      runAfter: when,
    });
    await writeAudit({
      userId: user.id,
      action: "content.scheduled",
      metadata: { draftId: draft.id, scheduledAt: when.toISOString() },
    });
    revalidatePath("/calendar");
    redirect(`/calendar?scheduled=${draft.id}`);
  }

  revalidatePath("/create");
  redirect(`/create?saved=${draft.id}`);
}

export async function repurposeDraftAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const draftId = formStr(formData, "draftId");
  const targets = formData.getAll("target").map(String) as RepurposePlatform[];

  const source = await prisma.draft.findFirst({
    where: { id: draftId, userId: user.id },
  });
  if (!source) redirect("/create?error=Draft%20not%20found");

  const created: string[] = [];
  for (const target of targets) {
    if (!PLATFORMS.has(target) || target === source.platform) continue;
    const row = await prisma.draft.create({
      data: {
        userId: user.id,
        platform: target,
        body: repurposeBody(source.body, target),
        goalTag: source.goalTag,
        conversionNote: source.conversionNote,
        status: "draft",
        sourceDraftId: source.id,
      },
    });
    created.push(row.id);
  }

  await writeAudit({
    userId: user.id,
    action: "content.repurposed",
    metadata: { sourceDraftId: source.id, created },
  });

  revalidatePath("/create");
  redirect(`/create?repurposed=${created.length}`);
}

export async function publishExistingDraftAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const draftId = formStr(formData, "draftId");
  const draft = await prisma.draft.findFirst({
    where: { id: draftId, userId: user.id },
  });
  if (!draft) redirect("/calendar?error=Draft%20not%20found");
  if (draft.platform === "x") redirect(`/x?fromDraft=${draft.id}`);

  await jobQueue.enqueue({
    userId: user.id,
    type: "publish",
    payload: { draftId: draft.id },
    idempotencyKey: `publish:${draft.id}:manual:${clock.now().toISOString()}`,
  });
  await processPendingJobs(5, user.id);
  revalidatePath("/calendar");
  redirect(`/calendar?published=${draft.id}`);
}

export async function draftAssistAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const platform = formStr(formData, "platform") || "instagram";
  const goalTag = formStr(formData, "goalTag") || null;
  const seed = formStr(formData, "seed") || null;

  if (!PLATFORMS.has(platform)) {
    redirect("/create?error=Invalid%20platform");
  }

  try {
    const { draftAssist } = await import("@/lib/ai/features/draft-assist");
    const body = await draftAssist({
      userId: user.id,
      platform,
      goalTag,
      seed,
    });
    redirect(
      `/create?suggested=1&body=${encodeURIComponent(body)}&platform=${encodeURIComponent(platform)}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI draft failed";
    redirect(`/create?error=${encodeURIComponent(message)}`);
  }
}

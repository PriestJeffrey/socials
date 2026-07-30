"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getAdapter } from "@/lib/platforms";
import { jobQueue } from "@/lib/jobs";
import { processPendingJobs } from "@/lib/jobs/runner";
import { clock } from "@/lib/clock";

export async function disconnectLinkedInAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const connectionId = String(formData.get("connectionId") ?? "");
  const conn = await prisma.socialConnection.findFirst({
    where: { id: connectionId, userId: user.id, platform: "linkedin" },
  });
  if (!conn) redirect("/settings");

  await getAdapter("linkedin")?.disconnect(user.id, conn.id);
  redirect("/settings?disconnected=linkedin");
}

export async function syncLinkedInAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const connectionId = String(formData.get("connectionId") ?? "");
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: connectionId,
      userId: user.id,
      platform: "linkedin",
      status: "connected",
    },
  });
  if (!conn) redirect("/settings?error=Not%20connected");

  await jobQueue.enqueue({
    userId: user.id,
    type: "sync",
    payload: { platform: "linkedin", connectionId: conn.id },
    idempotencyKey: `sync:linkedin:${conn.id}:${clock.now().toISOString()}`,
  });
  await processPendingJobs(3, user.id);
  redirect("/overview");
}

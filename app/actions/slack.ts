"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getAdapter } from "@/lib/platforms";
import { jobQueue } from "@/lib/jobs";
import { processPendingJobs } from "@/lib/jobs/runner";
import { clock } from "@/lib/clock";

export async function disconnectSlackAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const connectionId = String(formData.get("connectionId") ?? "");
  const conn = await prisma.socialConnection.findFirst({
    where: { id: connectionId, userId: user.id, platform: "slack" },
  });
  if (!conn) redirect("/settings");

  await getAdapter("slack")?.disconnect(user.id, conn.id);
  redirect("/settings?disconnected=slack");
}

export async function syncSlackAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const connectionId = String(formData.get("connectionId") ?? "");
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: connectionId,
      userId: user.id,
      platform: "slack",
      status: "connected",
    },
  });
  if (!conn) redirect("/settings?error=Not%20connected");

  await jobQueue.enqueue({
    userId: user.id,
    type: "sync",
    payload: { platform: "slack", connectionId: conn.id },
    idempotencyKey: `sync:slack:${conn.id}:${clock.now().toISOString()}`,
  });
  await processPendingJobs(3, user.id);
  redirect("/overview");
}

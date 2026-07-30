"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getAdapter } from "@/lib/platforms";
import { jobQueue } from "@/lib/jobs";
import { processPendingJobs } from "@/lib/jobs/runner";
import { clock } from "@/lib/clock";

export async function disconnectInstagramAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const connectionId = String(formData.get("connectionId") ?? "");
  const conn = await prisma.socialConnection.findFirst({
    where: { id: connectionId, userId: user.id, platform: "instagram" },
  });
  if (!conn) redirect("/settings");

  const ig = getAdapter("instagram");
  await ig?.disconnect(user.id, conn.id);
  redirect("/settings?disconnected=instagram");
}

export async function syncInstagramAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const connectionId = String(formData.get("connectionId") ?? "");
  const conn = await prisma.socialConnection.findFirst({
    where: {
      id: connectionId,
      userId: user.id,
      platform: "instagram",
      status: "connected",
    },
  });
  if (!conn) redirect("/settings?error=Not%20connected");

  await jobQueue.enqueue({
    userId: user.id,
    type: "sync",
    payload: { platform: "instagram", connectionId: conn.id },
    idempotencyKey: `sync:instagram:${conn.id}:${clock.now().toISOString()}`,
  });
  await processPendingJobs(3, user.id);
  redirect("/overview");
}

"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/audit/log";
import { clearSessionCookie } from "@/lib/auth/session";

const CONFIRM = "DELETE MY ACCOUNT";

export async function deleteAccountAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== CONFIRM) {
    redirect(
      `/settings?error=${encodeURIComponent(`Type ${CONFIRM} to confirm`)}`,
    );
  }

  const userId = user.id;
  await writeAudit({
    userId,
    action: "account.deleted",
    metadata: { email: user.email },
  });

  // Cascade deletes sessions, drafts, hooks, connections, posts, snapshots, jobs
  await prisma.user.delete({ where: { id: userId } });
  await clearSessionCookie();
  redirect("/?deleted=1");
}

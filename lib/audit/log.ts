import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export async function writeAudit(input: {
  action: string;
  userId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      userId: input.userId ?? undefined,
      metadata: input.metadata,
    },
  });
}

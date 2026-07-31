import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/audit/log";
import {
  canTransition,
  nextStatus,
  type DraftTransition,
} from "@/lib/content/draft-fsm";

export async function transitionDraft(input: {
  userId: string;
  draftId: string;
  transition: DraftTransition;
}): Promise<{ id: string; status: string }> {
  const draft = await prisma.draft.findFirst({
    where: { id: input.draftId, userId: input.userId },
  });
  if (!draft) throw new Error("Draft not found");
  if (!canTransition(draft.status, input.transition)) {
    throw new Error(
      `Cannot ${input.transition.replace("_", " ")} from status ${draft.status}`,
    );
  }
  const status = nextStatus(draft.status, input.transition);
  const updated = await prisma.draft.updateMany({
    where: {
      id: draft.id,
      userId: input.userId,
      status: draft.status,
    },
    data: { status },
  });
  if (updated.count !== 1) {
    throw new Error("Draft status changed concurrently - retry");
  }
  await writeAudit({
    userId: input.userId,
    action: `content.${input.transition}`,
    metadata: { draftId: draft.id, from: draft.status, to: status },
  });
  return { id: draft.id, status };
}

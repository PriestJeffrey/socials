-- Phase 6: competitor hook library
CREATE TABLE "HookLibraryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "structure" TEXT,
    "cta" TEXT,
    "sourceHash" TEXT,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HookLibraryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HookLibraryItem_userId_createdAt_idx" ON "HookLibraryItem"("userId", "createdAt");

ALTER TABLE "HookLibraryItem" ADD CONSTRAINT "HookLibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

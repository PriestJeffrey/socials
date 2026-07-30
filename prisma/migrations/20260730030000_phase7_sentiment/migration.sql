-- Phase 7: draft sentiment fields
ALTER TABLE "Draft" ADD COLUMN "sentimentLabel" TEXT;
ALTER TABLE "Draft" ADD COLUMN "sentimentScore" DOUBLE PRECISION;
ALTER TABLE "Draft" ADD COLUMN "sentimentNote" TEXT;

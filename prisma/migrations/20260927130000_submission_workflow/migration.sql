-- Additive workflow fields; preserve existing submission rows.
ALTER TABLE "FanSubmission" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'CONTENT';
ALTER TABLE "FanSubmission" ADD COLUMN "reviewed_by" TEXT;
CREATE INDEX "FanSubmission_reviewed_by_idx" ON "FanSubmission"("reviewed_by");
-- The nullable reviewer id is retained as audit metadata even if that account
-- is later removed. This deliberately has no FK so deletion cannot erase attribution.

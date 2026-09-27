ALTER TABLE "Content" ADD COLUMN "is_upcoming" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Content_is_upcoming_idx" ON "Content"("is_upcoming");

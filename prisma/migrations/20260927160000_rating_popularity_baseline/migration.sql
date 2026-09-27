ALTER TABLE "Content" ADD COLUMN "editorial_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Content" ADD COLUMN "rating_score" INTEGER;
UPDATE "Content" SET "editorial_score" = "popularity_score";
CREATE INDEX "Content_editorial_score_idx" ON "Content"("editorial_score");

-- AlterTable
ALTER TABLE "Content" ADD COLUMN "genre" TEXT;

-- CreateIndex
CREATE INDEX "Content_genre_idx" ON "Content"("genre");
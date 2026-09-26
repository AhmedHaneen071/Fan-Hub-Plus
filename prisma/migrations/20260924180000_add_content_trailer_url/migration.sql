-- Phase 4 (multimedia player): each catalogue item may offer a YouTube clip.

ALTER TABLE "Content" ADD COLUMN "trailer_url" TEXT;
CREATE INDEX "Content_trailer_url_idx" ON "Content"("trailer_url");
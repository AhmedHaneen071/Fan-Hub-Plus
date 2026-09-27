ALTER TABLE "User" ADD COLUMN "last_seen" DATETIME;
CREATE INDEX "User_last_seen_idx" ON "User"("last_seen");

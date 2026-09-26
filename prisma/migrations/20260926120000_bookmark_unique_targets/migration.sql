-- Enforce "one bookmark per member per target".
--
-- The Bookmark target is polymorphic: exactly one of content_id,
-- character_id or merchandise_id is set on each row. Three compound unique
-- indexes are the correct way to express that in SQL while keeping the schema
-- fully modelled by Prisma. A single (user_id, target) rule would require a
-- denormalised target_key column and a type column to keep the two in sync.
--
-- SQLite treats NULLs as distinct, so these three indexes do not conflict with
-- each other: a row with content_id set has NULL in the other two columns and
-- is therefore only ever compared against other content bookmarks.
--
-- The pre-migration duplicate scan found 0 conflicting groups, so no data
-- cleanup is included here.

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_user_id_content_id_key" ON "Bookmark"("user_id", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_user_id_character_id_key" ON "Bookmark"("user_id", "character_id");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_user_id_merchandise_id_key" ON "Bookmark"("user_id", "merchandise_id");

-- Add reusable discovery tags to content and multimedia records.
-- Existing rows remain intact and receive an empty tags value.
ALTER TABLE "Content" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MerchandiseItem" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '';

-- Admin-controlled account suspension.
--
-- Suspension is stored as an expiry, not a boolean. The account counts as
-- suspended only while `suspended_until` is in the future, so a temporary ban
-- lifts itself without a scheduled job, and an admin lifting a ban is a single
-- UPDATE that NULLs the column. `suspension_reason` is free text shown to the
-- member on the notice screen and to admins in the user list.
--
-- Every existing row is NULL/unsuspended, so this migration is additive and
-- needs no data backfill.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "suspended_until" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "suspension_reason" TEXT;

-- Supports the admin queue's "currently suspended, soonest to expire" ordering.
CREATE INDEX "User_suspended_until_idx" ON "User"("suspended_until");

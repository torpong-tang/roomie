-- Roomie only has administrator accounts and place sign-ins. The "user" and "readonly"
-- roles were never able to authenticate, so their rows are removed and the column is
-- constrained so they cannot be recreated.
DELETE FROM "AppUser" WHERE "role" <> 'admin';
ALTER TABLE "AppUser" ALTER COLUMN "role" SET DEFAULT 'admin';
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_role_check" CHECK ("role" = 'admin');

-- Postgres does not index foreign keys automatically; the overlap check and the
-- calendar both filter by room and order by start time.
CREATE INDEX "Booking_roomId_startTime_idx" ON "Booking"("roomId", "startTime");

-- Make overlapping bookings impossible at the database level, so two concurrent
-- requests can no longer both pass an application-side availability check.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    "roomId" WITH =,
    tsrange("startTime", "endTime", '[)') WITH &&
  );

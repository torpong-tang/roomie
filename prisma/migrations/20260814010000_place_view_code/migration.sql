-- Optional read-only access code per place. A viewer signing in with this code can
-- see the calendar and agenda for the place, but cannot book or cancel anything.
ALTER TABLE "Place" ADD COLUMN "viewCodeHash" TEXT;

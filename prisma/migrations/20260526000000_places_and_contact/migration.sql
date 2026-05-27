-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "accessCodeHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- Add location and callback details without assigning legacy rooms automatically.
ALTER TABLE "Room" ADD COLUMN "placeId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "contact" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Place_key_key" ON "Place"("key");
CREATE INDEX "Room_placeId_idx" ON "Room"("placeId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

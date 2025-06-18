/*
  Warnings:

  - You are about to drop the `roasters` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "roasters" DROP CONSTRAINT "roasters_ambulanceId_fkey";

-- DropForeignKey
ALTER TABLE "roasters" DROP CONSTRAINT "roasters_driverId_fkey";

-- DropForeignKey
ALTER TABLE "roasters" DROP CONSTRAINT "roasters_emtId_fkey";

-- DropForeignKey
ALTER TABLE "roasters" DROP CONSTRAINT "roasters_managerId_fkey";

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "awsFaceId" VARCHAR(255),
ADD COLUMN     "faceImageData" BYTEA;

-- DropTable
DROP TABLE "roasters";

-- CreateTable
CREATE TABLE "ambulanceDevices" (
    "id" SERIAL NOT NULL,
    "ambulanceId" INTEGER,
    "imei" VARCHAR(50) NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ambulanceDevices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosters" (
    "id" SERIAL NOT NULL,
    "rosterDate" DATE NOT NULL,
    "shift" VARCHAR(10) NOT NULL,
    "ambulanceId" INTEGER,
    "managerId" INTEGER,
    "emtId" INTEGER,
    "driverId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulanceLogs" (
    "id" SERIAL NOT NULL,
    "ambulanceId" INTEGER,
    "lastAssignedAmbulanceId" INTEGER,
    "deviceId" INTEGER,
    "assignedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ambulanceLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ambulanceDevices_imei_key" ON "ambulanceDevices"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "ambulanceDevices_username_key" ON "ambulanceDevices"("username");

-- AddForeignKey
ALTER TABLE "ambulanceDevices" ADD CONSTRAINT "ambulanceDevices_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_emtId_fkey" FOREIGN KEY ("emtId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulanceLogs" ADD CONSTRAINT "ambulanceLogs_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulanceLogs" ADD CONSTRAINT "ambulanceLogs_lastAssignedAmbulanceId_fkey" FOREIGN KEY ("lastAssignedAmbulanceId") REFERENCES "ambulances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulanceLogs" ADD CONSTRAINT "ambulanceLogs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "ambulanceDevices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

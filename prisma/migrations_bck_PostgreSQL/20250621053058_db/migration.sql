-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "shiftStartTime" VARCHAR(5),
    "shiftEndTime" VARCHAR(5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phoneNumber" VARCHAR(15),
    "categoryId" INTEGER,
    "awsFaceId" VARCHAR(255),
    "faceImageData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulances" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(50),
    "callSign" VARCHAR(50),
    "ambulanceNumber" VARCHAR(50),
    "zone" VARCHAR(50),
    "location" VARCHAR(100),
    "mdtMobileNumber" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ambulances_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_phoneNumber_key" ON "employees"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_callSign_key" ON "ambulances"("callSign");

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_ambulanceNumber_key" ON "ambulances"("ambulanceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_mdtMobileNumber_key" ON "ambulances"("mdtMobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ambulanceDevices_imei_key" ON "ambulanceDevices"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "ambulanceDevices_username_key" ON "ambulanceDevices"("username");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

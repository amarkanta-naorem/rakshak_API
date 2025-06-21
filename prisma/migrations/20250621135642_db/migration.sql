-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `shiftStartTime` VARCHAR(5) NULL,
    `shiftEndTime` VARCHAR(5) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `phoneNumber` VARCHAR(15) NULL,
    `categoryId` INTEGER NULL,
    `awsFaceId` VARCHAR(255) NULL,
    `faceImageData` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `employees_phoneNumber_key`(`phoneNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ambulances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(50) NULL,
    `callSign` VARCHAR(50) NULL,
    `ambulanceNumber` VARCHAR(50) NULL,
    `zone` VARCHAR(50) NULL,
    `location` VARCHAR(100) NULL,
    `mdtMobileNumber` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ambulances_callSign_key`(`callSign`),
    UNIQUE INDEX `ambulances_ambulanceNumber_key`(`ambulanceNumber`),
    UNIQUE INDEX `ambulances_mdtMobileNumber_key`(`mdtMobileNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ambulanceDevices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ambulanceId` INTEGER NULL,
    `imei` VARCHAR(50) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `password` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ambulanceDevices_imei_key`(`imei`),
    UNIQUE INDEX `ambulanceDevices_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rosters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rosterDate` DATE NOT NULL,
    `shift` VARCHAR(10) NOT NULL,
    `ambulanceId` INTEGER NULL,
    `managerId` INTEGER NULL,
    `emtId` INTEGER NULL,
    `driverId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ambulanceLogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ambulanceId` INTEGER NULL,
    `lastAssignedAmbulanceId` INTEGER NULL,
    `deviceId` INTEGER NULL,
    `assignedAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unassignedAt` DATETIME(3) NOT NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` INTEGER NOT NULL,
    `ambulanceId` INTEGER NULL,
    `rosterId` INTEGER NULL,
    `shiftType` VARCHAR(191) NULL,
    `punchTime` VARCHAR(191) NULL,
    `punchLocation` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `date` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ambulanceDevices` ADD CONSTRAINT `ambulanceDevices_ambulanceId_fkey` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rosters` ADD CONSTRAINT `rosters_ambulanceId_fkey` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rosters` ADD CONSTRAINT `rosters_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rosters` ADD CONSTRAINT `rosters_emtId_fkey` FOREIGN KEY (`emtId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rosters` ADD CONSTRAINT `rosters_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ambulanceLogs` ADD CONSTRAINT `ambulanceLogs_ambulanceId_fkey` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ambulanceLogs` ADD CONSTRAINT `ambulanceLogs_lastAssignedAmbulanceId_fkey` FOREIGN KEY (`lastAssignedAmbulanceId`) REFERENCES `ambulances`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ambulanceLogs` ADD CONSTRAINT `ambulanceLogs_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `ambulanceDevices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_ambulanceId_fkey` FOREIGN KEY (`ambulanceId`) REFERENCES `ambulances`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_rosterId_fkey` FOREIGN KEY (`rosterId`) REFERENCES `rosters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

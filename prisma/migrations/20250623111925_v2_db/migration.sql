/*
  Warnings:

  - You are about to drop the column `rosterId` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the `rosters` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[employeeSystemId]` on the table `employees` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeeSystemId` to the `employees` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `attendances` DROP FOREIGN KEY `attendances_rosterId_fkey`;

-- DropForeignKey
ALTER TABLE `rosters` DROP FOREIGN KEY `rosters_ambulanceId_fkey`;

-- DropForeignKey
ALTER TABLE `rosters` DROP FOREIGN KEY `rosters_driverId_fkey`;

-- DropForeignKey
ALTER TABLE `rosters` DROP FOREIGN KEY `rosters_emtId_fkey`;

-- DropForeignKey
ALTER TABLE `rosters` DROP FOREIGN KEY `rosters_managerId_fkey`;

-- DropIndex
DROP INDEX `attendances_rosterId_fkey` ON `attendances`;

-- AlterTable
ALTER TABLE `attendances` DROP COLUMN `rosterId`;

-- AlterTable
ALTER TABLE `employees` ADD COLUMN `employeeSystemId` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `rosters`;

-- CreateIndex
CREATE UNIQUE INDEX `employees_employeeSystemId_key` ON `employees`(`employeeSystemId`);

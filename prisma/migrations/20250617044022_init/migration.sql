/*
  Warnings:

  - A unique constraint covering the columns `[callSign]` on the table `ambulances` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ambulanceNumber]` on the table `ambulances` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mdtMobileNumber]` on the table `ambulances` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `employees` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ambulances_callSign_key" ON "ambulances"("callSign");

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_ambulanceNumber_key" ON "ambulances"("ambulanceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_mdtMobileNumber_key" ON "ambulances"("mdtMobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_phoneNumber_key" ON "employees"("phoneNumber");

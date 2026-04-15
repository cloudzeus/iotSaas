/*
  Warnings:

  - You are about to drop the column `message` on the `alert_events` table. All the data in the column will be lost.
  - You are about to drop the column `ruleId` on the `alert_events` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `alert_events` table. All the data in the column will be lost.
  - You are about to drop the column `triggeredAt` on the `alert_events` table. All the data in the column will be lost.
  - You are about to alter the column `severity` on the `alert_rules` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `VarChar(20)`.
  - You are about to drop the column `isActive` on the `devices` table. All the data in the column will be lost.
  - You are about to drop the column `modelName` on the `devices` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `devices` table. All the data in the column will be lost.
  - Added the required column `alertRuleId` to the `alert_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `alert_rules` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `alert_events` DROP FOREIGN KEY `alert_events_deviceId_fkey`;

-- DropForeignKey
ALTER TABLE `alert_events` DROP FOREIGN KEY `alert_events_ruleId_fkey`;

-- DropForeignKey
ALTER TABLE `alert_rules` DROP FOREIGN KEY `alert_rules_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `dashboards` DROP FOREIGN KEY `dashboards_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `devices` DROP FOREIGN KEY `devices_tenantId_fkey`;

-- DropForeignKey
ALTER TABLE `invoices` DROP FOREIGN KEY `invoices_tenantId_fkey`;

-- DropIndex
DROP INDEX `alert_events_deviceId_fkey` ON `alert_events`;

-- DropIndex
DROP INDEX `alert_events_ruleId_fkey` ON `alert_events`;

-- DropIndex
DROP INDEX `alert_events_tenantId_triggeredAt_idx` ON `alert_events`;

-- AlterTable
ALTER TABLE `alert_events` DROP COLUMN `message`,
    DROP COLUMN `ruleId`,
    DROP COLUMN `severity`,
    DROP COLUMN `triggeredAt`,
    ADD COLUMN `acknowledgedAt` DATETIME(3) NULL,
    ADD COLUMN `alertRuleId` VARCHAR(191) NOT NULL,
    ADD COLUMN `firedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `unit` VARCHAR(20) NULL,
    MODIFY `value` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `alert_rules` ADD COLUMN `message` TEXT NOT NULL,
    MODIFY `severity` VARCHAR(20) NOT NULL DEFAULT 'warning';

-- AlterTable
ALTER TABLE `devices` DROP COLUMN `isActive`,
    DROP COLUMN `modelName`,
    DROP COLUMN `status`,
    ADD COLUMN `appKey` VARCHAR(64) NULL,
    ADD COLUMN `battery` INTEGER NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `model` VARCHAR(100) NULL,
    ADD COLUMN `online` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `signal` INTEGER NULL,
    MODIFY `location` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `telemetry` MODIFY `value` VARCHAR(255) NOT NULL;

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trdr` INTEGER NULL,
    `code` VARCHAR(20) NULL,
    `name` VARCHAR(200) NULL,
    `afm` VARCHAR(20) NULL,
    `sotitle` VARCHAR(200) NULL,
    `isprosp` SMALLINT NOT NULL DEFAULT 0,
    `country` INTEGER NULL,
    `address` VARCHAR(200) NULL,
    `zip` VARCHAR(20) NULL,
    `district` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `area` VARCHAR(100) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `phone01` VARCHAR(50) NULL,
    `phone02` VARCHAR(50) NULL,
    `jobtype` INTEGER NULL,
    `jobtypetrd` VARCHAR(100) NULL,
    `trdpgroup` INTEGER NULL,
    `webpage` VARCHAR(200) NULL,
    `email` VARCHAR(200) NULL,
    `emailacc` VARCHAR(200) NULL,
    `trdbusiness` INTEGER NULL,
    `irsdata` VARCHAR(50) NULL,
    `consent` BOOLEAN NOT NULL DEFAULT false,
    `prjcs` INTEGER NULL,
    `remark` TEXT NULL,
    `registrationDate` DATETIME(3) NULL,
    `numberOfEmployees` INTEGER NULL,
    `gemiCode` VARCHAR(50) NULL,
    `insdate` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `upddate` DATETIME(3) NULL,

    UNIQUE INDEX `Customer_trdr_key`(`trdr`),
    INDEX `Customer_trdr_idx`(`trdr`),
    INDEX `Customer_code_idx`(`code`),
    INDEX `Customer_afm_idx`(`afm`),
    INDEX `Customer_upddate_idx`(`upddate`),
    INDEX `Customer_insdate_idx`(`insdate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyKad` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `kadCode` VARCHAR(20) NOT NULL,
    `kadDescription` VARCHAR(500) NOT NULL,
    `kadType` VARCHAR(5) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyKad_customerId_idx`(`customerId`),
    INDEX `CompanyKad_kadCode_idx`(`kadCode`),
    UNIQUE INDEX `CompanyKad_customerId_kadCode_key`(`customerId`, `kadCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrdBranch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `trdbranch` INTEGER NULL,
    `code` VARCHAR(20) NULL,
    `name` VARCHAR(200) NULL,
    `country` INTEGER NULL,
    `irsdata` VARCHAR(50) NULL,
    `address` VARCHAR(200) NULL,
    `areas` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `zip` VARCHAR(20) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `phone1` VARCHAR(50) NULL,
    `phone2` VARCHAR(50) NULL,
    `email` VARCHAR(200) NULL,
    `emailacc` VARCHAR(200) NULL,
    `jobtype` INTEGER NULL,
    `jobtypetrd` VARCHAR(100) NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TrdBranch_trdbranch_key`(`trdbranch`),
    INDEX `TrdBranch_customerId_idx`(`customerId`),
    INDEX `TrdBranch_trdbranch_idx`(`trdbranch`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerContact` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `name` VARCHAR(200) NULL,
    `position` VARCHAR(200) NULL,
    `email` VARCHAR(200) NULL,
    `phone` VARCHAR(50) NULL,
    `mobile` VARCHAR(50) NULL,
    `address` VARCHAR(200) NULL,
    `zip` VARCHAR(20) NULL,
    `city` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomerContact_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `alert_events_tenantId_firedAt_idx` ON `alert_events`(`tenantId`, `firedAt`);

-- CreateIndex
CREATE INDEX `alert_events_alertRuleId_idx` ON `alert_events`(`alertRuleId`);

-- AddForeignKey
ALTER TABLE `devices` ADD CONSTRAINT `devices_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboards` ADD CONSTRAINT `dashboards_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert_rules` ADD CONSTRAINT `alert_rules_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert_events` ADD CONSTRAINT `alert_events_alertRuleId_fkey` FOREIGN KEY (`alertRuleId`) REFERENCES `alert_rules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert_events` ADD CONSTRAINT `alert_events_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyKad` ADD CONSTRAINT `CompanyKad_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrdBranch` ADD CONSTRAINT `TrdBranch_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerContact` ADD CONSTRAINT `CustomerContact_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

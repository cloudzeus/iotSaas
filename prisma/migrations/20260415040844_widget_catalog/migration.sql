-- CreateTable
CREATE TABLE `widget_types` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(60) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NULL,
    `icon` VARCHAR(60) NULL,
    `appliesTo` VARCHAR(255) NOT NULL DEFAULT '*',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `widget_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_widget_types` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `widgetTypeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tenant_widget_types_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `tenant_widget_types_tenantId_widgetTypeId_key`(`tenantId`, `widgetTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tenant_widget_types` ADD CONSTRAINT `tenant_widget_types_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_widget_types` ADD CONSTRAINT `tenant_widget_types_widgetTypeId_fkey` FOREIGN KEY (`widgetTypeId`) REFERENCES `widget_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

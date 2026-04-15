-- DGSmart Hub - Initial Migration
-- Database: iotdgsmart ONLY
-- DO NOT run against any other database

CREATE TABLE `plans` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(50) NOT NULL,
  `pricePerDevice` DECIMAL(8,4) NOT NULL,
  `maxDevices` INT NULL,
  `features` JSON NOT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plans_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tenants` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `planId` VARCHAR(191) NOT NULL,
  `billingEmail` VARCHAR(255) NOT NULL,
  `vatNumber` VARCHAR(50) NULL,
  `address` JSON NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenants_slug_key` (`slug`),
  CONSTRAINT `tenants_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` ENUM('SUPER_ADMIN','ADMIN','CUSTOMER','VIEWER') NOT NULL DEFAULT 'CUSTOMER',
  `locale` VARCHAR(5) NOT NULL DEFAULT 'el',
  `theme` VARCHAR(10) NOT NULL DEFAULT 'dark',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `lastLoginAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  KEY `users_tenantId_idx` (`tenantId`),
  CONSTRAINT `users_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `devices` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `devEui` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `modelName` VARCHAR(100) NULL,
  `applicationId` VARCHAR(100) NULL,
  `status` ENUM('ACTIVE','INACTIVE','PENDING','ERROR') NOT NULL DEFAULT 'PENDING',
  `location` JSON NULL,
  `metadata` JSON NULL,
  `billedFrom` DATETIME(3) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `lastSeenAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `devices_tenantId_devEui_key` (`tenantId`, `devEui`),
  KEY `devices_tenantId_idx` (`tenantId`),
  CONSTRAINT `devices_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `device_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `deviceId` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `receivedAt` DATETIME(3) NOT NULL,
  `devEui` VARCHAR(64) NOT NULL,
  `fPort` INT NULL,
  `fCnt` INT NULL,
  `rssi` INT NULL,
  `snr` DECIMAL(5,2) NULL,
  `dataRate` VARCHAR(20) NULL,
  `frequency` VARCHAR(20) NULL,
  `rawHex` TEXT NULL,
  `decodedPayload` JSON NULL,
  `eventType` VARCHAR(30) NOT NULL DEFAULT 'uplink',
  `isDuplicate` TINYINT(1) NOT NULL DEFAULT 0,
  `gatewayId` VARCHAR(100) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `device_logs_tenantId_receivedAt_idx` (`tenantId`, `receivedAt`),
  KEY `device_logs_deviceId_receivedAt_idx` (`deviceId`, `receivedAt`),
  CONSTRAINT `device_logs_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `telemetry` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `deviceId` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `ts` DATETIME(3) NOT NULL,
  `channel` VARCHAR(100) NOT NULL,
  `value` DECIMAL(18,6) NOT NULL,
  `unit` VARCHAR(20) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `telemetry_deviceId_channel_ts_idx` (`deviceId`, `channel`, `ts`),
  KEY `telemetry_tenantId_ts_idx` (`tenantId`, `ts`),
  CONSTRAINT `telemetry_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dashboards` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `isDefault` TINYINT(1) NOT NULL DEFAULT 0,
  `layout` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `dashboards_tenantId_idx` (`tenantId`),
  CONSTRAINT `dashboards_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `widgets` (
  `id` VARCHAR(191) NOT NULL,
  `dashboardId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `config` JSON NOT NULL,
  `position` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `widgets_dashboardId_fkey` FOREIGN KEY (`dashboardId`) REFERENCES `dashboards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alert_rules` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `deviceId` VARCHAR(191) NULL,
  `name` VARCHAR(255) NOT NULL,
  `channel` VARCHAR(100) NOT NULL,
  `operator` VARCHAR(10) NOT NULL,
  `threshold` DECIMAL(18,6) NOT NULL,
  `severity` ENUM('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'WARNING',
  `emailNotify` TINYINT(1) NOT NULL DEFAULT 1,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `alert_rules_tenantId_idx` (`tenantId`),
  CONSTRAINT `alert_rules_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alert_rules_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alert_events` (
  `id` VARCHAR(191) NOT NULL,
  `ruleId` VARCHAR(191) NOT NULL,
  `deviceId` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `severity` ENUM('INFO','WARNING','CRITICAL') NOT NULL,
  `channel` VARCHAR(100) NOT NULL,
  `value` DECIMAL(18,6) NOT NULL,
  `message` TEXT NOT NULL,
  `acknowledged` TINYINT(1) NOT NULL DEFAULT 0,
  `notifiedAt` DATETIME(3) NULL,
  `triggeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `alert_events_tenantId_triggeredAt_idx` (`tenantId`, `triggeredAt`),
  CONSTRAINT `alert_events_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `alert_rules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alert_events_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoices` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `periodStart` DATETIME(3) NOT NULL,
  `periodEnd` DATETIME(3) NOT NULL,
  `deviceCount` INT NOT NULL,
  `pricePerDevice` DECIMAL(8,4) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `vat` DECIMAL(10,2) NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `status` ENUM('DRAFT','PENDING','PAID','OVERDUE','VOID') NOT NULL DEFAULT 'DRAFT',
  `vivaOrderCode` VARCHAR(100) NULL,
  `paidAt` DATETIME(3) NULL,
  `lineItems` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoices_tenantId_idx` (`tenantId`),
  CONSTRAINT `invoices_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `tenantId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity` VARCHAR(100) NOT NULL,
  `entityId` VARCHAR(100) NULL,
  `meta` JSON NULL,
  `ip` VARCHAR(50) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_tenantId_createdAt_idx` (`tenantId`, `createdAt`),
  KEY `audit_logs_userId_createdAt_idx` (`userId`, `createdAt`),
  CONSTRAINT `audit_logs_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- _prisma_migrations table (managed by Prisma)
CREATE TABLE IF NOT EXISTS `_prisma_migrations` (
  `id` VARCHAR(36) NOT NULL,
  `checksum` VARCHAR(64) NOT NULL,
  `finished_at` DATETIME(3) NULL,
  `migration_name` VARCHAR(255) NOT NULL,
  `logs` TEXT NULL,
  `rolled_back_at` DATETIME(3) NULL,
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

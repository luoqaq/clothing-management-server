CREATE TABLE IF NOT EXISTS `part_time_workers` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(30),
  `default_daily_wage` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `part_time_workers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `labor_cost_records` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `work_date` date NOT NULL,
  `worker_id` int,
  `worker_name_snapshot` varchar(100),
  `coverage_type` enum('self','part_time') NOT NULL DEFAULT 'part_time',
  `daily_wage` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_method` varchar(50),
  `paid_at` datetime,
  `note` text,
  `created_by` int,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `labor_cost_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `labor_cost_records_work_date_idx` ON `labor_cost_records` (`work_date`);
--> statement-breakpoint
CREATE INDEX `labor_cost_records_worker_id_idx` ON `labor_cost_records` (`worker_id`);

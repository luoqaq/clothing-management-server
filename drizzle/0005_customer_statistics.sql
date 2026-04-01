CREATE TABLE `customer_age_buckets` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `name` varchar(100) NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `customer_age_buckets_id` PRIMARY KEY(`id`),
  CONSTRAINT `customer_age_buckets_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `phone` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL DEFAULT '',
  `email` varchar(100),
  `age_bucket_id` int,
  `first_paid_order_at` datetime,
  `last_paid_order_at` datetime,
  `paid_order_count` int NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `customers_id` PRIMARY KEY(`id`),
  CONSTRAINT `customers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_id` int;
--> statement-breakpoint
ALTER TABLE `orders` ADD `paid_at` datetime;
--> statement-breakpoint
ALTER TABLE `order_items` ADD `cost_price_snapshot` decimal(10,2) NOT NULL DEFAULT '0';
--> statement-breakpoint
INSERT INTO `customer_age_buckets` (`name`, `sort_order`) VALUES
  ('18岁以下', 10),
  ('18-24岁', 20),
  ('25-34岁', 30),
  ('35-44岁', 40),
  ('45岁及以上', 50),
  ('未知', 999);

CREATE TABLE `product_brands` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`logo` varchar(500),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `product_brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `brand_id` int;
--> statement-breakpoint
ALTER TABLE `products` ADD `main_images` json;
--> statement-breakpoint
ALTER TABLE `products` ADD `detail_images` json;
--> statement-breakpoint
UPDATE `products`
SET
	`main_images` = COALESCE(`images`, JSON_ARRAY()),
	`detail_images` = COALESCE(`images`, JSON_ARRAY());
--> statement-breakpoint
UPDATE `products`
SET `status` = CASE
	WHEN `status` = 'out_of_stock' THEN 'inactive'
	WHEN `status` IS NULL THEN 'draft'
	ELSE `status`
END;
--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `status` enum('draft','active','inactive') NOT NULL DEFAULT 'draft';
--> statement-breakpoint
CREATE TABLE `product_skus` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`sku_code` varchar(100) NOT NULL,
	`barcode` varchar(100),
	`color` varchar(50) NOT NULL,
	`size` varchar(50) NOT NULL,
	`sale_price` decimal(10,2) NOT NULL,
	`cost_price` decimal(10,2) NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`reserved_stock` int NOT NULL DEFAULT 0,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `product_skus_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_skus_sku_code_unique` UNIQUE(`sku_code`)
);
--> statement-breakpoint
INSERT INTO `product_skus` (
	`product_id`,
	`sku_code`,
	`color`,
	`size`,
	`sale_price`,
	`cost_price`,
	`stock`,
	`reserved_stock`,
	`status`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	CONCAT('SKU-', LPAD(`id`, 6, '0')),
	'默认',
	COALESCE(`size`, '默认'),
	`price`,
	`cost_price`,
	COALESCE(`stock`, 0),
	0,
	CASE
		WHEN `status` = 'active' THEN 'active'
		ELSE 'inactive'
	END,
	`created_at`,
	`updated_at`
FROM `products`;
--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `price`;
--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `cost_price`;
--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `stock`;
--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `images`;
--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `size`;
--> statement-breakpoint
ALTER TABLE `order_items` ADD `sku_id` int;
--> statement-breakpoint
ALTER TABLE `order_items` ADD `sku_code` varchar(100);
--> statement-breakpoint
ALTER TABLE `order_items` ADD `color` varchar(50);
--> statement-breakpoint
ALTER TABLE `order_items` MODIFY COLUMN `size` varchar(50);
--> statement-breakpoint
UPDATE `order_items` `oi`
INNER JOIN `product_skus` `ps` ON `ps`.`product_id` = `oi`.`product_id`
SET
	`oi`.`sku_id` = `ps`.`id`,
	`oi`.`sku_code` = `ps`.`sku_code`,
	`oi`.`color` = COALESCE(`oi`.`color`, `ps`.`color`),
	`oi`.`size` = COALESCE(`oi`.`size`, `ps`.`size`);
--> statement-breakpoint
ALTER TABLE `order_items` MODIFY COLUMN `sku_id` int NOT NULL;
--> statement-breakpoint
ALTER TABLE `order_items` MODIFY COLUMN `sku_code` varchar(100) NOT NULL;
--> statement-breakpoint
UPDATE `orders`
SET `status` = COALESCE(`status`, 'pending');
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `status` enum('pending','confirmed','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending';
--> statement-breakpoint
UPDATE `orders`
SET `payment_status` = COALESCE(`payment_status`, 'unpaid');
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `payment_status` enum('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid';
--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_company` varchar(100);
--> statement-breakpoint
ALTER TABLE `orders` ADD `tracking_number` varchar(100);
--> statement-breakpoint
ALTER TABLE `orders` ADD `cancel_reason` varchar(255);
--> statement-breakpoint
ALTER TABLE `orders` ADD `refund_reason` varchar(255);

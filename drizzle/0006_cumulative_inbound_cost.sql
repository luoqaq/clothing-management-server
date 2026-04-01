ALTER TABLE `product_skus`
  ADD COLUMN `cumulative_inbound_quantity` int NOT NULL DEFAULT 0,
  ADD COLUMN `cumulative_cost_amount` decimal(12,2) NOT NULL DEFAULT '0.00';

--> statement-breakpoint
UPDATE `product_skus`
SET
  `cumulative_inbound_quantity` = `stock`,
  `cumulative_cost_amount` = ROUND(`stock` * `cost_price`, 2);

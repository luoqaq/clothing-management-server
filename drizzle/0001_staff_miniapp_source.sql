-- Add order source column for staff miniapp orders.
-- This file is intentionally idempotent because some production databases may
-- already have the column before the SQL file is registered in drizzle.
SET @order_source_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND column_name = 'source'
);

SET @add_order_source_column = IF(
  @order_source_column_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `source` enum(''admin_web'',''staff_miniapp'') NOT NULL DEFAULT ''admin_web'' AFTER `order_no`',
  'SELECT 1'
);

PREPARE add_order_source_column_statement FROM @add_order_source_column;
EXECUTE add_order_source_column_statement;
DEALLOCATE PREPARE add_order_source_column_statement;

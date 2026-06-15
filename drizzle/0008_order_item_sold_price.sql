-- Add soldPrice column to order_items table with default value.
-- This file is intentionally idempotent because the column was previously
-- patched manually in production before the SQL file was tracked.
SET @sold_price_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'order_items'
    AND column_name = 'sold_price'
);

SET @add_sold_price_column = IF(
  @sold_price_column_exists = 0,
  'ALTER TABLE `order_items` ADD COLUMN `sold_price` DECIMAL(10, 2) NULL AFTER `price`',
  'SELECT 1'
);

PREPARE add_sold_price_column_statement FROM @add_sold_price_column;
EXECUTE add_sold_price_column_statement;
DEALLOCATE PREPARE add_sold_price_column_statement;

-- Update existing records that do not yet have sold_price.
UPDATE order_items
SET sold_price = price
WHERE sold_price IS NULL;

ALTER TABLE order_items
  MODIFY COLUMN sold_price DECIMAL(10, 2) NOT NULL DEFAULT 0;

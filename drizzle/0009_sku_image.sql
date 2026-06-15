-- Add optional SKU image column.
-- This file is intentionally idempotent because the column was previously
-- patched manually in production before the SQL file was tracked.
SET @sku_image_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'product_skus'
    AND column_name = 'image'
);

SET @add_sku_image_column = IF(
  @sku_image_column_exists = 0,
  'ALTER TABLE `product_skus` ADD COLUMN `image` varchar(500)',
  'SELECT 1'
);

PREPARE add_sku_image_column_statement FROM @add_sku_image_column;
EXECUTE add_sku_image_column_statement;
DEALLOCATE PREPARE add_sku_image_column_statement;

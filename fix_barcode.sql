-- 修复 barcode 为空的 SKU 记录
-- 将空 barcode 更新为 SKU${id} 格式

UPDATE product_skus
SET barcode = CONCAT('SKU', LPAD(CAST(id AS CHAR), 10, '0'))
WHERE barcode IS NULL OR TRIM(barcode) = '';

-- 验证更新结果
SELECT 
  COUNT(*) as total_skus,
  SUM(CASE WHEN barcode IS NULL OR TRIM(barcode) = '' THEN 1 ELSE 0 END) as empty_barcode_count,
  SUM(CASE WHEN barcode LIKE 'SKU%' THEN 1 ELSE 0 END) as sku_format_count
FROM product_skus;

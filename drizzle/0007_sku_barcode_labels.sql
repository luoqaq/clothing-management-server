UPDATE product_skus
SET barcode = CONCAT('SKU', LPAD(CAST(id AS CHAR), 10, '0'))
WHERE barcode IS NULL OR TRIM(barcode) = '';

ALTER TABLE product_skus
  MODIFY COLUMN barcode VARCHAR(100) NOT NULL;

ALTER TABLE product_skus
  ADD UNIQUE INDEX product_skus_barcode_unique (barcode);

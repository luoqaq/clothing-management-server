import { describe, expect, it } from 'bun:test';
import * as schema from '../../db/schema';
import { ProductsService } from './products.service';

function createProductsDbMock(productSkus: any[], products: any[]) {
  return {
    select() {
      return {
        from(table: unknown) {
          if (table === schema.productSkus) {
            return {
              where: async () => productSkus,
            };
          }

          if (table === schema.products) {
            return {
              where: async () => products,
            };
          }

          return {
            where: async () => [],
          };
        },
      };
    },
  };
}

function createUpdateProductDbMock() {
  const initialProductRow = {
    id: 7,
    productCode: 'TOP001',
    name: '法式上衣',
    description: '',
    categoryId: 1,
    supplierId: null,
    mainImages: ['https://img.example.com/1.jpg'],
    detailImages: [],
    tags: [],
    status: 'active',
    createdAt: '2026-04-04 12:00:00',
    updatedAt: '2026-04-04 12:00:00',
  };
  const initialSkuRows = [
    {
      id: 12,
      productId: 7,
      skuCode: 'TOP001-M-白-P7',
      barcode: 'SKU0000000012',
      color: '白色',
      size: 'M',
      salePrice: '199.00',
      costPrice: '50.00',
      stock: 5,
      reservedStock: 1,
      cumulativeInboundQuantity: 8,
      cumulativeCostAmount: '400.00',
      status: 'active',
      createdAt: '2026-04-04 12:00:00',
      updatedAt: '2026-04-04 12:00:00',
    },
  ];

  let productRow = { ...initialProductRow };
  let skuRows = [...initialSkuRows];
  let insertedSkuRows: any[] = [];

  const db = {
    select() {
      return {
        from(table: unknown) {
          const readRows = async () => {
            if (table === schema.products) {
              return [productRow];
            }

            if (table === schema.productSkus) {
              return skuRows;
            }

            return [];
          };

          return {
            where: readRows,
            orderBy: readRows,
            limit() {
              return this;
            },
            offset() {
              return this;
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          if (table === schema.products) {
            productRow = { ...productRow, ...values };
          }

          if (table === schema.productSkus && insertedSkuRows.length > 0) {
            insertedSkuRows = insertedSkuRows.map((row) => ({
              ...row,
              ...values,
            }));
            skuRows = insertedSkuRows;
          }

          return {
            where: async () => undefined,
          };
        },
      };
    },
    delete(table: unknown) {
      return {
        where: async () => {
          if (table === schema.productSkus) {
            skuRows = [];
          }
        },
      };
    },
    insert(table: unknown) {
      return {
        values(values: any[]) {
          if (table === schema.productSkus) {
            insertedSkuRows = values.map((row, index) => ({
              ...row,
              id: initialSkuRows[index]?.id ?? index + 1,
            }));
            skuRows = insertedSkuRows;
          }

          return {
            $returningId: async () => [{ id: productRow.id }],
          };
        },
      };
    },
  };

  return { db, getInsertedSkuRows: () => insertedSkuRows };
}

describe('ProductsService', () => {
  it('builds stable barcode values from sku id', () => {
    expect(ProductsService.buildBarcodeValue(12)).toBe('SKU0000000012');
  });

  it('returns scanned sku info without cost fields', async () => {
    const service = new ProductsService(
      createProductsDbMock(
        [
          {
            id: 12,
            productId: 7,
            barcode: 'SKU0000000012',
            skuCode: 'TOP001-M-白-P7',
            color: '白色',
            size: 'M',
            salePrice: '199.00',
            stock: 5,
            reservedStock: 1,
            status: 'active',
          },
        ],
        [
          {
            id: 7,
            productCode: 'TOP001',
            name: '法式上衣',
            status: 'active',
            mainImages: ['https://img.example.com/1.jpg'],
          },
        ]
      ) as any
    );

    const result = await service.getScannedSkuByCode('SKU0000000012');

    expect(result?.skuId).toBe(12);
    expect(result?.productId).toBe(7);
    expect(result?.availableStock).toBe(4);
    expect(result?.barcode).toBe('SKU0000000012');
    expect('costPrice' in (result as Record<string, unknown>)).toBe(false);
  });

  it('preserves cumulative inbound cost when updating specifications', async () => {
    const { db, getInsertedSkuRows } = createUpdateProductDbMock();
    const service = new ProductsService(db as any);
    service.getCategories = async () => [];
    service.getSuppliers = async () => [];

    await service.updateProduct(7, {
      specifications: [
        {
          id: 12,
          productId: 7,
          skuCode: 'TOP001-M-白-P7',
          barcode: 'SKU0000000012',
          color: '白色',
          size: 'M',
          salePrice: 199,
          costPrice: 50,
          stock: 10,
          reservedStock: 1,
          availableStock: 0,
          cumulativeInboundQuantity: 0,
          cumulativeCostAmount: 0,
          status: 'active',
          createdAt: '',
          updatedAt: '',
        } as any,
      ],
    });

    expect(getInsertedSkuRows()[0]?.cumulativeInboundQuantity).toBe(8);
    expect(getInsertedSkuRows()[0]?.cumulativeCostAmount).toBe('400');
  });
});

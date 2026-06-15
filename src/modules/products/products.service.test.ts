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
      image: 'https://img.example.com/sku-white.jpg',
      status: 'active',
      createdAt: '2026-04-04 12:00:00',
      updatedAt: '2026-04-04 12:00:00',
    },
  ];

  let productRow = { ...initialProductRow };
  let skuRows = [...initialSkuRows];
  let insertedSkuRows: any[] = [];
  let deleteCalls = 0;
  let deletedSkuCount = 0;

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
          }

          if (table === schema.productSkus) {
            skuRows = skuRows.map((row) => ({
              ...row,
              ...values,
            }));
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
            deleteCalls += 1;
            deletedSkuCount += skuRows.length;
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

  return {
    db,
    getInsertedSkuRows: () => insertedSkuRows,
    getProductRow: () => productRow,
    getSkuRows: () => skuRows,
    getDeleteCalls: () => deleteCalls,
    getDeletedSkuCount: () => deletedSkuCount,
  };
}

function createLowStockProductsDbMock(lowStockProductIds: number[] = [1]) {
  const categories = [{ id: 1, name: '上衣', code: 'tops', parentId: null }];
  const suppliers = [{ id: 1, name: '默认供应商' }];
  const productRows = [
    {
      id: 1,
      productCode: 'LOW001',
      name: '低库存上衣',
      description: '',
      categoryId: 1,
      supplierId: 1,
      mainImages: [],
      detailImages: [],
      tags: [],
      status: 'active',
      createdAt: '2026-05-31 12:00:00',
      updatedAt: '2026-05-31 12:00:00',
    },
    {
      id: 2,
      productCode: 'OK001',
      name: '库存充足上衣',
      description: '',
      categoryId: 1,
      supplierId: 1,
      mainImages: [],
      detailImages: [],
      tags: [],
      status: 'active',
      createdAt: '2026-05-31 12:00:00',
      updatedAt: '2026-05-31 12:00:00',
    },
  ];
  const skuRows = [
    {
      id: 11,
      productId: 1,
      skuCode: 'LOW001-M-黑-P1',
      barcode: 'SKU0000000011',
      color: '黑色',
      size: 'M',
      salePrice: '199.00',
      costPrice: '99.00',
      stock: 5,
      reservedStock: 1,
      cumulativeInboundQuantity: 5,
      cumulativeCostAmount: '495.00',
      status: 'active',
      createdAt: '2026-05-31 12:00:00',
      updatedAt: '2026-05-31 12:00:00',
    },
    {
      id: 22,
      productId: 2,
      skuCode: 'OK001-M-白-P2',
      barcode: 'SKU0000000022',
      color: '白色',
      size: 'M',
      salePrice: '199.00',
      costPrice: '99.00',
      stock: 30,
      reservedStock: 0,
      cumulativeInboundQuantity: 30,
      cumulativeCostAmount: '2970.00',
      status: 'active',
      createdAt: '2026-05-31 12:00:00',
      updatedAt: '2026-05-31 12:00:00',
    },
  ];
  let lowStockQueryCount = 0;
  let relationSkuQueryCount = 0;

  const getLowStockProductRows = () =>
    productRows.filter((row) => lowStockProductIds.includes(Number(row.id)));

  const db = {
    select(selection?: Record<string, unknown>) {
      return {
        from(table: unknown) {
          if (table === schema.productSkus && selection?.productId) {
            return {
              where: async () => {
                lowStockQueryCount += 1;
                return lowStockProductIds.map((productId) => ({ productId }));
              },
            };
          }

          if (table === schema.productSkus) {
            return {
              where: async () => {
                relationSkuQueryCount += 1;
                return skuRows;
              },
            };
          }

          if (table === schema.products && selection?.count) {
            return {
              where: async () => [{ count: lowStockProductIds.length ? getLowStockProductRows().length : 0 }],
            };
          }

          if (table === schema.products) {
            const productQuery = {
              where() {
                return productQuery;
              },
              orderBy() {
                return productQuery;
              },
              limit() {
                return productQuery;
              },
              offset: async () => (lowStockQueryCount > 0 ? getLowStockProductRows() : productRows),
            };
            return productQuery;
          }

          if (table === schema.productCategories) {
            return {
              orderBy: async () => categories,
            };
          }

          if (table === schema.suppliers) {
            return {
              orderBy: async () => suppliers,
            };
          }

          return {
            where: async () => [],
            orderBy: async () => [],
          };
        },
      };
    },
  };

  return {
    db,
    getLowStockQueryCount: () => lowStockQueryCount,
    getRelationSkuQueryCount: () => relationSkuQueryCount,
  };
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
    const { db, getDeletedSkuCount, getSkuRows } = createUpdateProductDbMock();
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

    expect(getSkuRows()[0]?.id).toBe(12);
    expect(getSkuRows()[0]?.cumulativeInboundQuantity).toBe(8);
    expect(getSkuRows()[0]?.cumulativeCostAmount).toBe('400');
    expect(getDeletedSkuCount()).toBe(0);
  });

  it('blocks clearing all specifications during product update', async () => {
    const { db, getDeleteCalls, getSkuRows } = createUpdateProductDbMock();
    const service = new ProductsService(db as any);
    service.getCategories = async () => [];
    service.getSuppliers = async () => [];

    await expect(
      service.updateProduct(7, {
        specifications: [],
      })
    ).rejects.toThrow('商品至少需要保留一个规格');

    expect(getDeleteCalls()).toBe(0);
    expect(getSkuRows()[0]?.id).toBe(12);
  });

  it('blocks changing color or size for an occupied specification', async () => {
    const { db, getSkuRows } = createUpdateProductDbMock();
    const service = new ProductsService(db as any);
    service.getCategories = async () => [];
    service.getSuppliers = async () => [];

    await expect(
      service.updateProduct(7, {
        specifications: [
          {
            id: 12,
            productId: 7,
            skuCode: 'TOP001-M-蓝-P7',
            barcode: 'SKU0000000012',
            color: '蓝色',
            size: 'M',
            salePrice: 199,
            costPrice: 50,
            stock: 2,
            reservedStock: 99,
            availableStock: 0,
            cumulativeInboundQuantity: 0,
            cumulativeCostAmount: 0,
            status: 'active',
            createdAt: '',
            updatedAt: '',
          } as any,
        ],
      })
    ).rejects.toThrow('不能修改颜色或尺码');

    expect(getSkuRows()[0]?.id).toBe(12);
    expect(getSkuRows()[0]?.color).toBe('白色');
    expect(getSkuRows()[0]?.reservedStock).toBe(1);
  });

  it('preserves specification image when updating specifications without image payload', async () => {
    const { db, getSkuRows } = createUpdateProductDbMock();
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

    expect(getSkuRows()[0]?.image).toBe('https://img.example.com/sku-white.jpg');
  });

  it('keeps an existing specification row when only cost price changes', async () => {
    const { db, getSkuRows, getDeleteCalls } = createUpdateProductDbMock();
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
          costPrice: 60,
          stock: 5,
          reservedStock: 1,
          availableStock: 4,
          cumulativeInboundQuantity: 8,
          cumulativeCostAmount: 400,
          status: 'active',
          createdAt: '',
          updatedAt: '',
        } as any,
      ],
    });

    expect(getDeleteCalls()).toBe(0);
    expect(getSkuRows()[0]?.id).toBe(12);
    expect(getSkuRows()[0]?.costPrice).toBe('60');
  });

  it('blocks updating an existing specification below reserved stock', async () => {
    const { db } = createUpdateProductDbMock();
    const service = new ProductsService(db as any);
    service.getCategories = async () => [];
    service.getSuppliers = async () => [];

    await expect(
      service.updateProduct(7, {
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
            stock: 0,
            reservedStock: 0,
            availableStock: 0,
            cumulativeInboundQuantity: 0,
            cumulativeCostAmount: 0,
            status: 'active',
            createdAt: '',
            updatedAt: '',
          } as any,
        ],
      })
    ).rejects.toThrow('总库存不能低于已占用 1');
  });

  it('blocks deleting an occupied specification', async () => {
    const { db, getDeletedSkuCount } = createUpdateProductDbMock();
    const service = new ProductsService(db as any);
    service.getCategories = async () => [];
    service.getSuppliers = async () => [];

    await expect(
      service.updateProduct(7, {
        specifications: [
          {
            productId: 7,
            skuCode: '',
            barcode: null,
            color: '黑色',
            size: 'S',
            salePrice: 199,
            costPrice: 50,
            stock: 1,
            reservedStock: 0,
            availableStock: 1,
            cumulativeInboundQuantity: 1,
            cumulativeCostAmount: 50,
            status: 'active',
            createdAt: '',
            updatedAt: '',
          } as any,
        ],
      })
    ).rejects.toThrow('不能删除');

    expect(getDeletedSkuCount()).toBe(0);
  });

  it('does not apply product updates when specification validation fails', async () => {
    const { db, getProductRow } = createUpdateProductDbMock();
    const service = new ProductsService(db as any);
    service.getCategories = async () => [];
    service.getSuppliers = async () => [];

    await expect(
      service.updateProduct(7, {
        name: '错误保存的商品名',
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
            stock: 0,
            reservedStock: 0,
            availableStock: 0,
            cumulativeInboundQuantity: 0,
            cumulativeCostAmount: 0,
            status: 'active',
            createdAt: '',
            updatedAt: '',
          } as any,
        ],
      })
    ).rejects.toThrow('总库存不能低于已占用 1');

    expect(getProductRow().name).toBe('法式上衣');
  });

  it('filters products by active sku available stock when low stock filter is enabled', async () => {
    const { db, getLowStockQueryCount } = createLowStockProductsDbMock();
    const service = new ProductsService(db as any);

    const result = await service.getProducts({
      filters: {
        lowStock: true,
        lowStockThreshold: 10,
      },
      role: 'admin',
    });

    expect(getLowStockQueryCount()).toBe(1);
    expect(result.total).toBe(1);
    expect(result.items.map((item) => item.productCode)).toEqual(['LOW001']);
    expect(result.items[0]?.availableStock).toBe(4);
    expect(result.items[0]?.specifications[0]?.availableStock).toBe(4);
  });

  it('returns empty page before relation loading when no low stock sku matches', async () => {
    const { db, getRelationSkuQueryCount } = createLowStockProductsDbMock([]);
    const service = new ProductsService(db as any);

    const result = await service.getProducts({
      filters: {
        lowStock: true,
        lowStockThreshold: 10,
      },
      role: 'admin',
    });

    expect(result).toEqual({ items: [], total: 0 });
    expect(getRelationSkuQueryCount()).toBe(0);
  });

  it('blocks creating a product when the product code already exists', async () => {
    const db = {
      select(selection?: unknown) {
        if (selection) {
          return {
            from(table: unknown) {
              if (table === schema.products) {
                return {
                  where: async () => [{ count: 1 }],
                };
              }

              return {
                where: async () => [],
              };
            },
          };
        }

        return {
          from() {
            return {
              where: async () => [],
            };
          },
        };
      },
      insert() {
        throw new Error('should not insert when product code is duplicated');
      },
    };

    const service = new ProductsService(db as any);

    await expect(
      service.createProduct({
        productCode: 'TOP001',
        name: '重复款号商品',
        description: '',
        categoryId: 1,
        supplierId: null,
        mainImages: [],
        detailImages: [],
        tags: [],
        status: 'active',
        specifications: [
          {
            id: 0,
            productId: 0,
            skuCode: '',
            barcode: null,
            color: '黑色',
            size: 'M',
            salePrice: 199,
            costPrice: 99,
            stock: 1,
            reservedStock: 0,
            availableStock: 1,
            cumulativeInboundQuantity: 1,
            cumulativeCostAmount: 99,
            status: 'active',
            createdAt: '',
            updatedAt: '',
          },
        ],
        specCount: 0,
        totalStock: 0,
        reservedStock: 0,
        availableStock: 0,
        minPrice: 0,
        maxPrice: 0,
        category: undefined,
        supplier: undefined,
      } as any)
    ).rejects.toThrow('款号 TOP001 已存在');
  });

  it('blocks updating a product to a duplicated product code', async () => {
    const db = {
      select(selection?: unknown) {
        if (selection) {
          return {
            from(table: unknown) {
              if (table === schema.products) {
                return {
                  where: async () => [{ count: 1 }],
                };
              }

              return {
                where: async () => [],
              };
            },
          };
        }

        return {
          from(table: unknown) {
            if (table === schema.products) {
              return {
                where: async () => [
                  {
                    id: 7,
                    productCode: 'TOP001',
                    name: '法式上衣',
                    description: '',
                    categoryId: 1,
                    supplierId: null,
                    mainImages: [],
                    detailImages: [],
                    tags: [],
                    status: 'active',
                    createdAt: '2026-04-04 12:00:00',
                    updatedAt: '2026-04-04 12:00:00',
                  },
                ],
              };
            }

            if (table === schema.productSkus) {
              return {
                where: async () => [],
              };
            }

            return {
              where: async () => [],
            };
          },
        };
      },
      update() {
        throw new Error('should not update when product code is duplicated');
      },
    };

    const service = new ProductsService(db as any);
    service.getCategories = async () => [];
    service.getSuppliers = async () => [];

    await expect(
      service.updateProduct(7, {
        productCode: 'TOP002',
      } as any)
    ).rejects.toThrow('款号 TOP002 已存在');
  });
});

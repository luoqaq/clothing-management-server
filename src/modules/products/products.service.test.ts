import { describe, expect, it } from 'bun:test';
import { ProductsService } from './products.service';
import type { Product } from '../../types';
import * as schema from '../../db/schema';

function createProductsDbMock(products: Product[]) {
  return {
    select(fields?: unknown) {
      return {
        from(table: unknown) {
          if (fields) {
            return {
              where: async () => [{ count: products.length }],
            };
          }

          if (table === schema.products) {
            return {
              where: () => ({
                orderBy: () => ({
                  limit: (pageSize: number) => ({
                    offset: async (offset: number) =>
                      products.slice(offset, offset + pageSize),
                  }),
                }),
              }),
            };
          }

          if (table === schema.productCategories || table === schema.productBrands || table === schema.productSkus) {
            return {
              where: async () => [],
              orderBy: async () => [],
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

describe('ProductsService.getProducts', () => {
  it('returns paginated items and total count', async () => {
    const products: Product[] = [
      {
        id: 1,
        productCode: 'KH001',
        name: 'T-Shirt A',
        description: 'A',
        categoryId: 1,
        brandId: null,
        category: undefined,
        brand: null,
        mainImages: [],
        detailImages: [],
        specifications: [],
        specCount: 0,
        totalStock: 0,
        reservedStock: 0,
        availableStock: 0,
        minPrice: 0,
        maxPrice: 0,
        status: 'active',
        tags: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 2,
        productCode: 'KH002',
        name: 'T-Shirt B',
        description: 'B',
        categoryId: 1,
        brandId: null,
        category: undefined,
        brand: null,
        mainImages: [],
        detailImages: [],
        specifications: [],
        specCount: 0,
        totalStock: 0,
        reservedStock: 0,
        availableStock: 0,
        minPrice: 0,
        maxPrice: 0,
        status: 'active',
        tags: [],
        createdAt: '2026-01-02',
        updatedAt: '2026-01-02',
      },
    ];

    const dbMock = createProductsDbMock(products);
    const service = new ProductsService(dbMock as any);

    const result = await service.getProducts({ page: 2, pageSize: 1 });

    expect(result.total).toBe(2);
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe(2);
  });
});

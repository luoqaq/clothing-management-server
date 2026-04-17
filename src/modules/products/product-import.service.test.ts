import { describe, expect, it } from 'bun:test';
import * as XLSX from 'xlsx';
import { ProductImportService } from './product-import.service';

describe('ProductImportService.parseExcelFileImport', () => {
  it('parses the first sheet and reuses the excel payload import flow', async () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['款号', '商品名', '颜色', '尺码', '售价', '成本价', '库存'],
      ['A-1001', '西装外套', '黑色', 'M', 299, 199, 5],
      ['', '', '', '', '', '', ''],
      ['A-1002', '半裙', '白色', 'S', 199, 99, 3],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const file = new File(
      [XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })],
      'pad-import.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );

    const service = new ProductImportService({} as any);
    let capturedPayload: any = null;

    service.parseExcelImport = async (payload: any) => {
      capturedPayload = payload;
      return { drafts: [], issues: [] };
    };

    const result = await service.parseExcelFileImport(file);

    expect(result).toEqual({ drafts: [], issues: [] });
    expect(capturedPayload.fileName).toBe('pad-import.xlsx');
    expect(capturedPayload.headers).toEqual(['款号', '商品名', '颜色', '尺码', '售价', '成本价', '库存']);
    expect(capturedPayload.rows).toEqual([
      { 款号: 'A-1001', 商品名: '西装外套', 颜色: '黑色', 尺码: 'M', 售价: 299, 成本价: 199, 库存: 5 },
      { 款号: 'A-1002', 商品名: '半裙', 颜色: '白色', 尺码: 'S', 售价: 199, 成本价: 99, 库存: 3 },
    ]);
  });
});

describe('ProductImportService.bulkCreateProducts', () => {
  it('blocks duplicated product codes inside the same import batch before writing', async () => {
    const service = new ProductImportService({
      select() {
        return {
          from() {
            return {
              where: async () => [],
            };
          },
        };
      },
    } as any);

    (service as any).productsService.getCategories = async () => [{ id: 1, name: '上衣' }];
    (service as any).productsService.getSuppliers = async () => [];

    await expect(
      service.bulkCreateProducts(
        [
          {
            rowKey: 'row-1',
            source: 'excel',
            productCode: 'TOP001',
            name: '上衣 A',
            description: '',
            categoryId: 1,
            categoryName: '上衣',
            supplierId: null,
            supplierName: null,
            tags: [],
            status: 'active',
            specifications: [{ rowKey: 'row-1-spec-1', barcode: null, color: '黑色', size: 'M', salePrice: 199, costPrice: 99, stock: 1, status: 'active' }],
          },
          {
            rowKey: 'row-2',
            source: 'excel',
            productCode: 'TOP001',
            name: '上衣 B',
            description: '',
            categoryId: 1,
            categoryName: '上衣',
            supplierId: null,
            supplierName: null,
            tags: [],
            status: 'active',
            specifications: [{ rowKey: 'row-2-spec-1', barcode: null, color: '白色', size: 'L', salePrice: 199, costPrice: 99, stock: 1, status: 'active' }],
          },
        ] as any,
        false
      )
    ).rejects.toThrow('存在重复款号：TOP001');
  });

  it('blocks import when product codes already exist in database', async () => {
    const service = new ProductImportService({
      select(selection?: unknown) {
        if (selection) {
          return {
            from() {
              return {
                where: async () => [{ productCode: 'TOP001' }],
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
    } as any);

    (service as any).productsService.getCategories = async () => [{ id: 1, name: '上衣' }];
    (service as any).productsService.getSuppliers = async () => [];

    await expect(
      service.bulkCreateProducts(
        [
          {
            rowKey: 'row-1',
            source: 'excel',
            productCode: 'TOP001',
            name: '上衣 A',
            description: '',
            categoryId: 1,
            categoryName: '上衣',
            supplierId: null,
            supplierName: null,
            tags: [],
            status: 'active',
            specifications: [{ rowKey: 'row-1-spec-1', barcode: null, color: '黑色', size: 'M', salePrice: 199, costPrice: 99, stock: 1, status: 'active' }],
          },
        ] as any,
        false
      )
    ).rejects.toThrow('以下款号已存在：TOP001');
  });
});

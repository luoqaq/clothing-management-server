import { mockData } from './mockData';

// 模拟数据库接口
export const mockDb = {
  async select() {
    return {
      from: (table: string) => {
        let data = [];
        switch (table) {
          case 'users':
            data = mockData.users;
            break;
          case 'product_categories':
            data = mockData.categories;
            break;
          case 'product_brands':
            data = mockData.brands;
            break;
          case 'products':
            data = mockData.products;
            break;
          case 'orders':
            data = mockData.orders;
            break;
          case 'order_items':
            data = mockData.orderItems;
            break;
        }

        return {
          where: (condition: any) => {
            let filteredData = [...data];
            // 简单的条件过滤
            if (typeof condition === 'function') {
              // 简单支持 eq 等操作
              filteredData = data.filter(item => condition(item));
            }
            return {
              orderBy: () => {
                return {
                  limit: (count: number) => {
                    return {
                      offset: (skip: number) => {
                        return Promise.resolve(filteredData.slice(skip, skip + count));
                      },
                    };
                  },
                };
              },
              limit: (count: number) => {
                return Promise.resolve(filteredData.slice(0, count));
              },
              offset: (skip: number) => {
                return Promise.resolve(filteredData.slice(skip));
              },
              then: (callback: any) => {
                return Promise.resolve(callback(filteredData));
              },
            };
          },
          orderBy: () => {
            return {
              limit: (count: number) => {
                return {
                  offset: (skip: number) => {
                    return Promise.resolve(data.slice(skip, skip + count));
                  },
                };
              },
            };
          },
          limit: (count: number) => {
            return Promise.resolve(data.slice(0, count));
          },
          offset: (skip: number) => {
            return Promise.resolve(data.slice(skip));
          },
          then: (callback: any) => {
            return Promise.resolve(callback(data));
          },
        };
      },
    };
  },

  async insert() {
    return {
      into: (table: string) => {
        return {
          values: (values: any) => {
            return {
              returning: () => {
                let id;
                if (Array.isArray(values)) {
                  id = values.map(v => {
                    const newId = mockData.getNextId(table as any);
                    const item = { id: newId, ...v, createdAt: new Date(), updatedAt: new Date() };
                    switch (table) {
                      case 'users':
                        mockData.users.push(item);
                        break;
                      case 'product_categories':
                        mockData.categories.push(item);
                        break;
                      case 'product_brands':
                        mockData.brands.push(item);
                        break;
                      case 'products':
                        mockData.products.push(item);
                        break;
                      case 'orders':
                        mockData.orders.push(item);
                        break;
                      case 'order_items':
                        mockData.orderItems.push(item);
                        break;
                    }
                    return item;
                  });
                } else {
                  id = mockData.getNextId(table as any);
                  const item = { id, ...values, createdAt: new Date(), updatedAt: new Date() };
                  switch (table) {
                    case 'users':
                      mockData.users.push(item);
                      break;
                    case 'product_categories':
                      mockData.categories.push(item);
                      break;
                    case 'product_brands':
                      mockData.brands.push(item);
                      break;
                    case 'products':
                      mockData.products.push(item);
                      break;
                    case 'orders':
                      mockData.orders.push(item);
                      break;
                    case 'order_items':
                      mockData.orderItems.push(item);
                      break;
                  }
                  id = [item];
                }
                return Promise.resolve(id);
              },
            };
          },
        };
      },
    };
  },

  async update(table: string) {
    return {
      set: (data: any) => {
        return {
          where: (condition: any) => {
            return {
              returning: () => {
                let updated = [];
                switch (table) {
                  case 'users':
                    mockData.users = mockData.users.map(user => {
                      if (condition(user)) {
                        const updatedUser = { ...user, ...data, updatedAt: new Date() };
                        updated.push(updatedUser);
                        return updatedUser;
                      }
                      return user;
                    });
                    break;
                  case 'product_categories':
                    mockData.categories = mockData.categories.map(cat => {
                      if (condition(cat)) {
                        const updatedCat = { ...cat, ...data, updatedAt: new Date() };
                        updated.push(updatedCat);
                        return updatedCat;
                      }
                      return cat;
                    });
                    break;
                  case 'product_brands':
                    mockData.brands = mockData.brands.map(brand => {
                      if (condition(brand)) {
                        const updatedBrand = { ...brand, ...data, updatedAt: new Date() };
                        updated.push(updatedBrand);
                        return updatedBrand;
                      }
                      return brand;
                    });
                    break;
                  case 'products':
                    mockData.products = mockData.products.map(prod => {
                      if (condition(prod)) {
                        const updatedProd = { ...prod, ...data, updatedAt: new Date() };
                        updated.push(updatedProd);
                        return updatedProd;
                      }
                      return prod;
                    });
                    break;
                  case 'orders':
                    mockData.orders = mockData.orders.map(order => {
                      if (condition(order)) {
                        const updatedOrder = { ...order, ...data, updatedAt: new Date() };
                        updated.push(updatedOrder);
                        return updatedOrder;
                      }
                      return order;
                    });
                    break;
                  case 'order_items':
                    mockData.orderItems = mockData.orderItems.map(item => {
                      if (condition(item)) {
                        const updatedItem = { ...item, ...data, updatedAt: new Date() };
                        updated.push(updatedItem);
                        return updatedItem;
                      }
                      return item;
                    });
                    break;
                }
                return Promise.resolve(updated);
              },
            };
          },
        };
      },
    };
  },

  async delete(table: string) {
    return {
      where: (condition: any) => {
        return {
          returning: () => {
            let deleted = [];
            switch (table) {
              case 'users':
                deleted = mockData.users.filter(condition);
                mockData.users = mockData.users.filter(item => !condition(item));
                break;
              case 'product_categories':
                deleted = mockData.categories.filter(condition);
                mockData.categories = mockData.categories.filter(item => !condition(item));
                break;
              case 'product_brands':
                deleted = mockData.brands.filter(condition);
                mockData.brands = mockData.brands.filter(item => !condition(item));
                break;
              case 'products':
                deleted = mockData.products.filter(condition);
                mockData.products = mockData.products.filter(item => !condition(item));
                break;
              case 'orders':
                deleted = mockData.orders.filter(condition);
                mockData.orders = mockData.orders.filter(item => !condition(item));
                break;
              case 'order_items':
                deleted = mockData.orderItems.filter(condition);
                mockData.orderItems = mockData.orderItems.filter(item => !condition(item));
                break;
            }
            return Promise.resolve(deleted);
          },
        };
      },
    };
  },
};

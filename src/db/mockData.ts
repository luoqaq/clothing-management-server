import { hashPassword } from '../utils/password';

// Mock 数据存储
export interface User {
  id: number;
  username: string;
  passwordHash: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'staff';
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: number;
  name: string;
  code: string;
  parentId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  sku: string;
  categoryId: number;
  supplierId?: number | null;
  price: number;
  costPrice: number;
  stock: number;
  images?: any;
  colors?: any;
  sizes?: any;
  status: 'active' | 'inactive' | 'out_of_stock';
  tags?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  sku: string;
  image?: string;
  price: number;
  quantity: number;
  color?: string;
  size?: string;
}

export interface Order {
  id: number;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  totalAmount: number;
  discountAmount?: number;
  finalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  address: any;
  note?: string;
  paymentMethod?: string;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// 内存数据存储
let nextId = {
  users: 1,
  categories: 1,
  suppliers: 1,
  products: 1,
  orders: 1,
  orderItems: 1,
};

export const mockData = {
  users: [] as User[],
  categories: [] as ProductCategory[],
  suppliers: [] as Supplier[],
  products: [] as Product[],
  orders: [] as Order[],
  orderItems: [] as OrderItem[],

  async init() {
    if (this.users.length > 0) return;

    // 创建管理员用户
    const passwordHash = await hashPassword('password');
    this.users.push({
      id: nextId.users++,
      username: 'admin',
      passwordHash,
      name: '系统管理员',
      email: 'admin@clothing.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 创建分类
    const categories = [
      { name: '上衣', code: 'TOP', parentId: null },
      { name: '外套', code: 'OUTER', parentId: null },
      { name: '裤子', code: 'PANTS', parentId: null },
      { name: '裙子', code: 'SKIRT', parentId: null },
      { name: '内衣', code: 'UNDERWEAR', parentId: null },
      { name: '配饰', code: 'ACCESSORIES', parentId: null },
    ];
    categories.forEach(cat => {
      this.categories.push({
        id: nextId.categories++,
        ...cat,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // 创建供应商
    const suppliers = [
      { name: '华东成衣供应商' },
      { name: '深圳针织供应商' },
      { name: '广州牛仔供应商' },
      { name: '上海基础款供应商' },
    ];
    suppliers.forEach((supplier) => {
      this.suppliers.push({
        id: nextId.suppliers++,
        ...supplier,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // 创建商品
    const products = [
      {
        name: '经典白色T恤',
        description: '简约百搭的白色T恤，舒适透气，适合日常穿着',
        sku: 'TOP001',
        categoryId: 1,
        supplierId: 4,
        price: 99,
        costPrice: 50,
        stock: 200,
        images: ['https://api.dicebear.com/7.x/avataaars/svg?seed=1'],
        colors: ['白色'],
        sizes: ['S', 'M', 'L', 'XL'],
        status: 'active',
        tags: ['经典', '百搭', '舒适'],
      },
      {
        name: '牛仔外套',
        description: '时尚牛仔外套，复古风格，四季皆宜',
        sku: 'OUTER001',
        categoryId: 2,
        supplierId: 1,
        price: 399,
        costPrice: 150,
        stock: 150,
        images: ['https://api.dicebear.com/7.x/avataaars/svg?seed=2'],
        colors: ['蓝色'],
        sizes: ['S', 'M', 'L', 'XL'],
        status: 'active',
        tags: ['牛仔', '时尚', '百搭'],
      },
    ];
    products.forEach(prod => {
      this.products.push({
        id: nextId.products++,
        ...prod,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // 创建示例订单
    const orders = [
      {
        orderNo: 'ORD2024030101',
        customerName: '张三',
        customerPhone: '13800138001',
        customerEmail: 'zhangsan@example.com',
        totalAmount: 498,
        discountAmount: 0,
        finalAmount: 498,
        status: 'delivered',
        address: {
          name: '张三',
          phone: '13800138001',
          province: '广东省',
          city: '深圳市',
          district: '南山区',
          detail: '科技园南区A栋1001',
          postalCode: '518000',
        },
        paymentMethod: 'alipay',
        paymentStatus: 'paid',
        items: [
          {
            id: 1,
            orderId: 1,
            productId: 1,
            productName: '经典白色T恤',
            sku: 'TOP001',
            image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
            price: 99,
            quantity: 2,
            color: '白色',
            size: 'M',
          },
        ],
      },
      {
        orderNo: 'ORD2024030102',
        customerName: '李四',
        customerPhone: '13800138002',
        customerEmail: 'lisi@example.com',
        totalAmount: 399,
        discountAmount: 0,
        finalAmount: 399,
        status: 'shipped',
        address: {
          name: '李四',
          phone: '13800138002',
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          detail: '望京SOHO T3-1205',
          postalCode: '100020',
        },
        paymentMethod: 'wechat',
        paymentStatus: 'paid',
        items: [
          {
            id: 2,
            orderId: 2,
            productId: 2,
            productName: '牛仔外套',
            sku: 'OUTER001',
            image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
            price: 399,
            quantity: 1,
            color: '蓝色',
            size: 'L',
          },
        ],
      },
      {
        orderNo: 'ORD2024030103',
        customerName: '王五',
        customerPhone: '13800138003',
        customerEmail: 'wangwu@example.com',
        totalAmount: 99,
        discountAmount: 0,
        finalAmount: 99,
        status: 'pending',
        address: {
          name: '王五',
          phone: '13800138003',
          province: '上海市',
          city: '上海市',
          district: '浦东新区',
          detail: '陆家嘴金融中心B座',
          postalCode: '200120',
        },
        paymentMethod: 'cash',
        paymentStatus: 'unpaid',
        items: [
          {
            id: 3,
            orderId: 3,
            productId: 1,
            productName: '经典白色T恤',
            sku: 'TOP001',
            image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
            price: 99,
            quantity: 1,
            color: '白色',
            size: 'S',
          },
        ],
      },
    ];

    orders.forEach(order => {
      const orderId = nextId.orders++;
      this.orders.push({
        id: orderId,
        ...order,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 7),
        updatedAt: new Date(),
      });
      order.items.forEach((item: any) => {
        const itemId = nextId.orderItems++;
        this.orderItems.push({
          id: itemId,
          ...item,
          orderId,
        });
      });
    });

    console.log('Mock 数据初始化完成');
  },

  getNextId(type: keyof typeof nextId) {
    return nextId[type]++;
  },
};

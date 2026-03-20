# 服装管理系统 - 服务器端设计方案

## 项目概述

基于 **Bun + Hono** 的服装管理后台系统服务器端，与前端项目 `clothing-management-admin` 配套使用。

## 技术栈

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| 运行时 | **Bun** | 高性能 JavaScript/TypeScript 运行时 |
| Web 框架 | **Hono** | 轻量、快速的 Web 框架 |
| 数据库 | **MySQL** | 关系型数据库 |
| ORM | **Drizzle ORM** | 类型安全、轻量级 TypeScript ORM |
| 认证 | **JWT Token** | 无状态认证 |
| 数据验证 | **Zod** | TypeScript 优先的 schema 验证 |
| API 文档 | **Swagger/OpenAPI** | 自动生成 API 文档 |
| 日志 | **pino** | 高性能日志库 |
| CORS | **@hono/cors** | 跨域请求支持 |

## 项目结构

```
clothing-management-server/
├── src/
│   ├── index.ts                 # 应用入口
│   ├── config/                  # 配置文件
│   │   ├── database.ts          # 数据库配置
│   │   ├── jwt.ts               # JWT 配置
│   │   └── cors.ts              # CORS 配置
│   ├── db/                      # 数据库相关
│   │   ├── schema/              # Drizzle schema 定义
│   │   │   ├── users.ts
│   │   │   ├── products.ts
│   │   │   ├── orders.ts
│   │   │   └── index.ts
│   │   ├── migrate/             # 数据库迁移
│   │   └── seed/                # 初始数据
│   ├── modules/                 # 业务模块
│   │   ├── auth/                # 认证模块
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts
│   │   ├── products/            # 商品模块
│   │   │   ├── products.routes.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   └── products.schema.ts
│   │   ├── orders/              # 订单模块
│   │   │   ├── orders.routes.ts
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.service.ts
│   │   │   └── orders.schema.ts
│   │   └── statistics/          # 统计模块
│   │       ├── statistics.routes.ts
│   │       ├── statistics.controller.ts
│   │       └── statistics.service.ts
│   ├── middleware/              # 中间件
│   │   ├── auth.middleware.ts   # JWT 认证中间件
│   │   ├── error.middleware.ts  # 错误处理中间件
│   │   ├── logger.middleware.ts # 日志中间件
│   │   └── validation.middleware.ts # 数据验证中间件
│   ├── utils/                   # 工具函数
│   │   ├── logger.ts
│   │   ├── password.ts           # 密码加密
│   │   ├── jwt.ts                # JWT 工具
│   │   └── response.ts           # 响应格式化
│   └── types/                   # 类型定义
│       └── index.ts
├── drizzle.config.ts            # Drizzle 配置
├── package.json
├── tsconfig.json
└── README.md
```

## 数据库设计

### 用户表 (users)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | INT | 用户 ID | PK, AUTO_INCREMENT |
| username | VARCHAR(50) | 用户名 | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | 密码哈希 | NOT NULL |
| name | VARCHAR(100) | 姓名 | NOT NULL |
| email | VARCHAR(100) | 邮箱 | UNIQUE |
| avatar | VARCHAR(500) | 头像 URL | |
| role | ENUM | 角色 | 'admin', 'manager', 'staff' |
| created_at | DATETIME | 创建时间 | DEFAULT NOW() |
| updated_at | DATETIME | 更新时间 | ON UPDATE NOW() |

### 商品分类表 (product_categories)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | INT | 分类 ID | PK, AUTO_INCREMENT |
| name | VARCHAR(100) | 分类名称 | NOT NULL |
| code | VARCHAR(50) | 分类代码 | UNIQUE, NOT NULL |
| parent_id | INT | 父分类 ID | FK |
| created_at | DATETIME | 创建时间 | DEFAULT NOW() |
| updated_at | DATETIME | 更新时间 | ON UPDATE NOW() |

### 商品表 (products)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | INT | 商品 ID | PK, AUTO_INCREMENT |
| name | VARCHAR(200) | 商品名称 | NOT NULL |
| description | TEXT | 商品描述 | |
| category_id | INT | 分类 ID | FK, NOT NULL |
| price | DECIMAL(10,2) | 售价 | NOT NULL |
| cost_price | DECIMAL(10,2) | 成本价 | NOT NULL |
| stock | INT | 库存数量 | DEFAULT 0 |
| images | JSON | 图片列表 | |
| size | ENUM | 尺寸 | 'S', 'M', 'L', 'XL', 'XXL' |
| status | ENUM | 状态 | 'active', 'inactive', 'out_of_stock' |
| tags | JSON | 标签列表 | |
| created_at | DATETIME | 创建时间 | DEFAULT NOW() |
| updated_at | DATETIME | 更新时间 | ON UPDATE NOW() |

### 订单表 (orders)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | INT | 订单 ID | PK, AUTO_INCREMENT |
| order_no | VARCHAR(50) | 订单编号 | UNIQUE, NOT NULL |
| customer_name | VARCHAR(100) | 客户姓名 | NOT NULL |
| customer_phone | VARCHAR(20) | 客户电话 | NOT NULL |
| customer_email | VARCHAR(100) | 客户邮箱 | |
| total_amount | DECIMAL(10,2) | 订单总额 | NOT NULL |
| discount_amount | DECIMAL(10,2) | 优惠金额 | DEFAULT 0 |
| final_amount | DECIMAL(10,2) | 实付金额 | NOT NULL |
| status | ENUM | 订单状态 | 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded' |
| address | JSON | 收货地址 | NOT NULL |
| note | TEXT | 备注 | |
| payment_method | VARCHAR(50) | 支付方式 | |
| payment_status | ENUM | 支付状态 | 'unpaid', 'paid', 'refunded' |
| shipped_at | DATETIME | 发货时间 | |
| delivered_at | DATETIME | 送达时间 | |
| created_at | DATETIME | 创建时间 | DEFAULT NOW() |
| updated_at | DATETIME | 更新时间 | ON UPDATE NOW() |

### 订单项表 (order_items)

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | INT | 订单项 ID | PK, AUTO_INCREMENT |
| order_id | INT | 订单 ID | FK, NOT NULL |
| product_id | INT | 商品 ID | FK, NOT NULL |
| product_name | VARCHAR(200) | 商品名称 | NOT NULL |
| sku | VARCHAR(100) | SKU 编码 | NOT NULL |
| image | VARCHAR(500) | 图片 URL | |
| price | DECIMAL(10,2) | 单价 | NOT NULL |
| quantity | INT | 数量 | NOT NULL |
| color | VARCHAR(50) | 颜色 | |
| size | VARCHAR(50) | 尺码 | |

## API 接口设计

### 统一响应格式

```typescript
{
  success: boolean;
  data?: T;
  message?: string;
}

// 分页响应
{
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  };
}
```

### 认证模块 (/api/auth)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/login` | 登录 | 否 |
| POST | `/api/auth/logout` | 登出 | 是 |
| GET | `/api/auth/me` | 获取当前用户信息 | 是 |
| POST | `/api/auth/change-password` | 修改密码 | 是 |

### 商品模块 (/api/products)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/products` | 获取商品列表（分页、筛选） | 是 |
| GET | `/api/products/:id` | 获取商品详情 | 是 |
| POST | `/api/products` | 创建商品 | 是 |
| PUT | `/api/products/:id` | 更新商品 | 是 |
| DELETE | `/api/products/:id` | 删除商品 | 是 |
| PATCH | `/api/products/:id/stock` | 更新库存 | 是 |
| GET | `/api/products/categories` | 获取分类列表 | 是 |
| POST | `/api/products/categories` | 创建分类 | 是 |
| PUT | `/api/products/categories/:id` | 更新分类 | 是 |
| DELETE | `/api/products/categories/:id` | 删除分类 | 是 |
| GET | `/api/products/brands` | 获取品牌列表 | 是 |
| POST | `/api/products/brands` | 创建品牌 | 是 |
| PUT | `/api/products/brands/:id` | 更新品牌 | 是 |
| DELETE | `/api/products/brands/:id` | 删除品牌 | 是 |

### 订单模块 (/api/orders)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/orders` | 获取订单列表（分页、筛选） | 是 |
| GET | `/api/orders/:id` | 获取订单详情 | 是 |
| POST | `/api/orders` | 创建订单 | 是 |
| PATCH | `/api/orders/:id/status` | 更新订单状态 | 是 |
| POST | `/api/orders/:id/ship` | 发货 | 是 |
| POST | `/api/orders/:id/cancel` | 取消订单 | 是 |
| POST | `/api/orders/:id/refund` | 退款 | 是 |
| GET | `/api/orders/export` | 导出订单 | 是 |

### 统计模块 (/api/statistics)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/statistics/overview` | 获取销售概览 | 是 |
| GET | `/api/statistics/daily-sales` | 获取每日销售数据 | 是 |
| GET | `/api/statistics/product-rankings` | 商品销售排名 | 是 |
| GET | `/api/statistics/category-sales` | 类别销售分析 | 是 |
| GET | `/api/statistics/brand-sales` | 品牌销售分析 | 是 |
| GET | `/api/statistics/region-sales` | 区域销售分析 | 是 |
| GET | `/api/statistics/export` | 导出统计数据 | 是 |

## 核心模块设计

### 1. 认证模块

- 使用 JWT Token 进行身份认证
- 密码使用 bcrypt 加密存储
- Token 包含用户 ID、角色信息
- Token 有效期：7 天
- 中间件验证 Bearer Token

### 2. 商品模块

- 支持完整的 CRUD 操作
- 支持按分类、品牌、状态、价格范围筛选
- 支持商品搜索（名称、SKU）
- 库存管理
- 分类、品牌独立管理

### 3. 订单模块

- 订单编号自动生成（格式：YYYYMMDDNNNN）
- 订单状态流转管理
- 发货、取消、退款操作
- 订单导出（Excel/CSV）

### 4. 统计模块

- 销售数据聚合查询
- 多维度分析（时间、商品、类别、区域）
- 数据导出功能

## 开发计划

### 阶段一：项目初始化
1. 初始化 Bun 项目
2. 安装依赖（Hono, Drizzle, Zod, JWT 等）
3. 配置 TypeScript
4. 创建项目目录结构

### 阶段二：数据库层
1. 配置数据库连接
2. 编写 Drizzle schema
3. 创建数据库迁移
4. 编写种子数据

### 阶段三：基础框架
1. 实现应用入口
2. 配置中间件（CORS、日志、错误处理）
3. 实现 JWT 认证中间件
4. 实现统一响应格式化
5. 配置 Swagger API 文档

### 阶段四：认证模块
1. 实现登录接口
2. 实现登出接口
3. 实现获取当前用户信息接口
4. 实现修改密码接口

### 阶段五：商品模块
1. 实现商品 CRUD 接口
2. 实现分类管理接口
3. 实现品牌管理接口
4. 实现库存更新接口
5. 实现筛选和搜索功能

### 阶段六：订单模块
1. 实现订单 CRUD 接口
2. 实现订单状态更新
3. 实现发货、取消、退款功能
4. 实现订单导出功能

### 阶段七：统计模块
1. 实现销售概览接口
2. 实现每日销售数据接口
3. 实现商品销售排名接口
4. 实现类别/品牌/区域销售分析接口
5. 实现数据导出功能

### 阶段八：测试与优化
1. 集成测试
2. 性能优化
3. 文档完善

## 环境变量

```env
# 服务器
PORT=3000
NODE_ENV=development

# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=clothing_management

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 默认账户

- **用户名**: `admin`
- **密码**: `admin123`


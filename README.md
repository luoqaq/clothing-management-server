# 服装管理系统 - 服务器端

基于 **Bun + Hono** 的服装管理系统服务器端，提供完整的 API 接口。

## 技术栈

- **Bun** - JavaScript/TypeScript 运行时
- **Hono** - 轻量、快速的 Web 框架
- **MySQL** - 关系型数据库
- **Drizzle ORM** - TypeScript ORM
- **JWT** - 认证与授权
- **Zod** - 数据验证
- **Pino** - 日志系统

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置（必须配置）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=clothing_management

# JWT 配置
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS 配置
CORS_ORIGIN=http://localhost:5173
```

### 3. 初始化数据库

确保 MySQL 数据库已创建，然后执行：

```bash
# 初始化种子数据
bun run db:seed
```

当前仓库禁止把 `drizzle-kit generate` / `drizzle-kit migrate` 作为上线流程。`drizzle/meta/0000_snapshot.json` 是历史补齐快照，不是当前 schema 基线；数据库变更必须走显式 SQL migration：

1. 人工核对当前 schema 与生产结构
2. 编写或确认 `drizzle/*.sql`
3. 在测试库先验证 SQL
4. 在线上显式执行 SQL 文件
5. 执行后补写 `__drizzle_migrations`

推荐使用仓库脚本：

```bash
# 查看哪些 SQL 还没记录到 __drizzle_migrations
npm run db:check-sql

# 只演练指定 SQL 是否会被执行，不写库、不补 migration 记录
npm run db:apply-sql -- --dry-run drizzle/0005_customer_statistics.sql

# 显式执行指定 migration SQL，并自动补 migration 记录
npm run db:apply-sql -- drizzle/0005_customer_statistics.sql
```

### 4. 启动开发服务器

```bash
bun run dev
```

服务器将在 http://localhost:3000 启动。

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
│   │   │   └── orders.ts
│   │   ├── migrate/             # 数据库迁移
│   │   └── seed/                # 初始数据
│   ├── modules/                 # 业务模块
│   │   ├── auth/                # 认证模块
│   │   ├── products/            # 商品模块
│   │   ├── orders/              # 订单模块
│   │   └── statistics/          # 统计模块
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
└── README.md
```

## API 接口

### 基础信息

- **前缀**: `/api`
- **认证**: Bearer Token (JWT)
- **响应格式**: JSON

### 认证接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/auth/login` | 登录 | 否 |
| POST | `/auth/logout` | 登出 | 是 |
| GET | `/auth/me` | 获取当前用户信息 | 是 |
| POST | `/auth/change-password` | 修改密码 | 是 |

### 商品接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/products` | 获取商品列表 | 是 |
| GET | `/products/:id` | 获取商品详情 | 是 |
| POST | `/products` | 创建商品 | 是 |
| PUT | `/products/:id` | 更新商品 | 是 |
| DELETE | `/products/:id` | 删除商品 | 是 |
| GET | `/products/categories` | 获取分类列表 | 是 |
| POST | `/products/categories` | 创建分类 | 是 |
| PUT | `/products/categories/:id` | 更新分类 | 是 |
| DELETE | `/products/categories/:id` | 删除分类 | 是 |
| GET | `/products/suppliers` | 获取供应商列表 | 是 |
| POST | `/products/suppliers` | 创建供应商 | 是 |
| PUT | `/products/suppliers/:id` | 更新供应商 | 是 |
| DELETE | `/products/suppliers/:id` | 删除供应商 | 是 |
| GET | `/products/:id/labels` | 获取商品标签打印数据 | 是 |
| GET | `/products/check-code` | 校验商品款号是否存在 | 是 |

### 订单接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/orders` | 获取订单列表 | 是 |
| GET | `/orders/:id` | 获取订单详情 | 是 |
| POST | `/orders` | 创建订单 | 是 |
| PATCH | `/orders/:id/status` | 更新订单状态 | 是 |
| POST | `/orders/:id/ship` | 发货 | 是 |
| POST | `/orders/:id/cancel` | 取消订单 | 是 |
| POST | `/orders/:id/refund` | 退款 | 是 |
| GET | `/orders/export` | 导出订单 | 是 |

### 移动端接口

小程序业务接口统一位于 `/api/mobile`，复用同一套账号、商品、库存、订单和 COS 上传能力。

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/mobile/auth/login` | 小程序登录 | 否 |
| GET | `/mobile/auth/me` | 获取当前用户 | 是 |
| GET | `/mobile/dashboard/summary` | 工作台摘要 | 是 |
| GET | `/mobile/products` | 商品列表，支持低库存筛选 | 是 |
| GET | `/mobile/products/:id` | 商品详情 | 是 |
| GET | `/mobile/products/by-code` | 按 SKU 标签码读取可售规格 | 是 |
| GET | `/mobile/product-options` | 商品分类、供应商、状态选项 | 是 |
| POST | `/mobile/products` | 管理员新增商品 | 是 |
| PUT | `/mobile/products/:id` | 管理员编辑商品 | 是 |
| PATCH | `/mobile/products/:id/images` | 管理员维护商品图片 | 是 |
| PATCH | `/mobile/products/specifications/:id/stock` | 管理员维护规格库存 | 是 |
| POST | `/mobile/products/import/parse-excel-file` | 批量上新 Excel 文件解析 | 是 |
| POST | `/mobile/products/import/parse-image` | 批量上新货单截图解析 | 是 |
| POST | `/mobile/products/import/bulk-create` | 批量创建商品 | 是 |
| GET | `/mobile/customers/age-buckets` | 获取客户年龄段 | 是 |
| GET | `/mobile/orders` | 订单列表，支持时间与商品筛选 | 是 |
| GET | `/mobile/orders/:id` | 订单详情 | 是 |
| POST | `/mobile/orders` | 小程序录单 | 是 |
| POST | `/mobile/orders/:id/cancel` | 取消订单 | 是 |

### 统计接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/statistics/overview` | 销售概览 | 是 |
| GET | `/statistics/daily-sales` | 每日销售数据 | 是 |
| GET | `/statistics/product-rankings` | 商品销售排名 | 是 |
| GET | `/statistics/category-sales` | 分类销售分析 | 是 |
| GET | `/statistics/brand-sales` | 品牌销售分析 | 是 |
| GET | `/statistics/region-sales` | 区域销售分析 | 是 |
| GET | `/statistics/export` | 导出统计数据 | 是 |

## 默认账户

- **用户名**: `admin`
- **密码**: `admin123`

## 数据库管理

### 数据库操作

```bash
# 不要直接运行 drizzle-kit generate/migrate 作为上线流程
# 历史 0000 snapshot 不可作为当前 schema 基线

# 检查待执行 SQL 迁移
npm run db:check-sql

# 演练指定 SQL 迁移，不写库
npm run db:apply-sql -- --dry-run drizzle/0005_customer_statistics.sql

# 显式执行指定 SQL 迁移并补 __drizzle_migrations
npm run db:apply-sql -- drizzle/0005_customer_statistics.sql

# 初始化数据
bun run db:seed
```

### 数据结构

主要表结构：

- `users` - 用户信息
- `product_categories` - 商品分类
- `suppliers` - 商品供应商
- `products` - 商品信息
- `product_skus` - 商品规格、库存、成本、标签码和规格图
- `customers` - 客户档案
- `customer_age_buckets` - 客户年龄段配置
- `orders` - 订单信息
- `order_items` - 订单项，包含成交价和成本快照

## 开发命令

```bash
bun run dev              # 开发模式
bun run start            # 生产模式
bun run build            # 编译构建
bun run test             # 运行测试
bun run lint             # 代码检查
bun run format           # 代码格式化
```

## 生产部署

### 构建

```bash
bun run build
```

### 启动

```bash
bun run start
```

## 许可证

MIT

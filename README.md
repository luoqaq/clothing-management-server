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
# 推送 schema 到数据库
bun run db:push

# 或使用 migrate (如果有迁移文件)
bun run db:migrate

# 初始化种子数据
bun run db:seed
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
| GET | `/products/brands` | 获取品牌列表 | 是 |
| POST | `/products/brands` | 创建品牌 | 是 |
| PUT | `/products/brands/:id` | 更新品牌 | 是 |
| DELETE | `/products/brands/:id` | 删除品牌 | 是 |

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
# 推送 schema 到数据库（覆盖现有）
bun run db:push

# 生成迁移文件
bun run db:generate

# 运行迁移
bun run db:migrate

# 初始化数据
bun run db:seed
```

### 数据结构

主要表结构：

- `users` - 用户信息
- `product_categories` - 商品分类
- `product_brands` - 商品品牌
- `products` - 商品信息
- `orders` - 订单信息
- `order_items` - 订单项

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

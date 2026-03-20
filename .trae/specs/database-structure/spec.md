# 数据库表结构规格文档

## Overview
- **Summary**: 定义服装管理系统的数据库表结构，包括用户、商品、分类、品牌、订单等核心表的字段和关系
- **Purpose**: 为数据库初始化和迁移提供清晰的表结构定义，确保系统数据模型的一致性和完整性
- **Target Users**: 开发人员、数据库管理员

## Goals
- 明确定义所有核心数据表的结构和字段
- 确保表结构符合业务需求
- 提供完整的字段类型和约束定义
- 支持系统的核心功能，如用户管理、商品管理、订单管理等

## Non-Goals (Out of Scope)
- 数据库索引优化
- 数据备份和恢复策略
- 数据库性能调优
- 与其他系统的集成

## Background & Context
- 系统使用MySQL数据库
- 使用Drizzle ORM进行数据库操作
- 数据库表结构需要支持服装管理系统的完整功能

## Functional Requirements
- **FR-1**: 支持用户管理，包括用户注册、登录、权限控制
- **FR-2**: 支持商品管理，包括商品分类、品牌、基本信息、库存等
- **FR-3**: 支持订单管理，包括订单创建、状态跟踪、订单明细等

## Non-Functional Requirements
- **NFR-1**: 表结构设计合理，字段类型和约束适当
- **NFR-2**: 支持系统的可扩展性和后续功能迭代
- **NFR-3**: 数据模型符合业务逻辑，避免冗余和不一致

## Constraints
- **Technical**: MySQL数据库，Drizzle ORM
- **Business**: 系统需要支持服装行业的基本业务流程

## Assumptions
- 系统运行在支持MySQL的环境中
- 数据库连接信息已正确配置

## 数据表结构

### 1. users表
| 字段名 | 数据类型 | 约束 | 描述 |
|-------|---------|------|------|
| id | serial | PRIMARY KEY | 用户ID |
| username | varchar(50) | NOT NULL, UNIQUE | 用户名 |
| password_hash | varchar(255) | NOT NULL | 密码哈希 |
| name | varchar(100) | NOT NULL | 姓名 |
| email | varchar(100) | UNIQUE | 邮箱 |
| avatar | varchar(500) | | 头像 |
| role | enum('admin', 'manager', 'staff') | NOT NULL, DEFAULT 'staff' | 角色 |
| created_at | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 2. product_categories表
| 字段名 | 数据类型 | 约束 | 描述 |
|-------|---------|------|------|
| id | serial | PRIMARY KEY | 分类ID |
| name | varchar(100) | NOT NULL | 分类名称 |
| code | varchar(50) | NOT NULL, UNIQUE | 分类编码 |
| parent_id | int | | 父分类ID |
| created_at | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 4. products表
| 字段名 | 数据类型 | 约束 | 描述 |
|-------|---------|------|------|
| id | serial | PRIMARY KEY | 商品ID |
| name | varchar(200) | NOT NULL | 商品名称 |
| description | text | | 商品描述 |
| category_id | int | NOT NULL | 分类ID |
| price | decimal(10,2) | NOT NULL | 价格 |
| cost_price | decimal(10,2) | NOT NULL | 成本价 |
| stock | int | DEFAULT 0 | 库存 |
| images | json | | 图片 |
| size | enum('S', 'M', 'L', 'XL', 'XXL') | | 尺寸 |
| status | enum('active', 'inactive', 'out_of_stock') | DEFAULT 'active' | 状态 |
| tags | json | | 标签 |
| created_at | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 5. orders表
| 字段名 | 数据类型 | 约束 | 描述 |
|-------|---------|------|------|
| id | serial | PRIMARY KEY | 订单ID |
| order_no | varchar(50) | NOT NULL, UNIQUE | 订单号 |
| customer_name | varchar(100) | NOT NULL | 客户姓名 |
| customer_phone | varchar(20) | NOT NULL | 客户电话 |
| customer_email | varchar(100) | | 客户邮箱 |
| total_amount | decimal(10,2) | NOT NULL | 总金额 |
| discount_amount | decimal(10,2) | DEFAULT '0' | 折扣金额 |
| final_amount | decimal(10,2) | NOT NULL | 最终金额 |
| status | enum('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded') | DEFAULT 'pending' | 订单状态 |
| address | json | NOT NULL | 地址 |
| note | text | | 备注 |
| payment_method | varchar(50) | | 支付方式 |
| payment_status | enum('unpaid', 'paid', 'refunded') | DEFAULT 'unpaid' | 支付状态 |
| shipped_at | datetime | | 发货时间 |
| delivered_at | datetime | | 送达时间 |
| created_at | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 6. order_items表
| 字段名 | 数据类型 | 约束 | 描述 |
|-------|---------|------|------|
| id | serial | PRIMARY KEY | 订单项ID |
| order_id | int | NOT NULL | 订单ID |
| product_id | int | NOT NULL | 商品ID |
| product_name | varchar(200) | NOT NULL | 商品名称 |
| image | varchar(500) | | 商品图片 |
| price | decimal(10,2) | NOT NULL | 商品价格 |
| quantity | int | NOT NULL | 商品数量 |
| size | enum('S', 'M', 'L', 'XL', 'XXL') | | 商品尺寸 |

## Acceptance Criteria

### AC-1: 数据表结构完整
- **Given**: 数据库初始化脚本执行
- **When**: 运行迁移命令
- **Then**: 所有6个核心数据表（users、product_categories、product_brands、products、orders、order_items）都被创建成功
- **Verification**: `programmatic`

### AC-2: 字段类型和约束正确
- **Given**: 数据表创建完成
- **When**: 检查表结构
- **Then**: 所有字段的类型、长度、约束都符合规格文档定义
- **Verification**: `programmatic`

### AC-3: 数据初始化成功
- **Given**: 数据表创建完成
- **When**: 运行数据初始化脚本
- **Then**: 示例数据被正确导入，包括管理员用户、商品分类、品牌和示例商品
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要添加外键约束？
- [ ] 是否需要为特定字段添加索引以提高查询性能？
# 服装管理后台后端 - 项目记忆

最近更新：2026-03-21

## 会话更新（2026-03-21）
- 已调整项目记忆更新策略：
  - 仅在改动具备后续复用价值时更新 `PROJECT_MEMORY.md`
  - 统一在一次会话结束后总结写入，不在处理中频繁维护记忆
- 已完成商品与订单模型的数据库迁移落地，并已执行真实数据库迁移成功：
  - 新增 `drizzle/0000_spicy_guardian.sql` 作为增量迁移脚本。
  - 已执行 `bun run db:migrate`，迁移已成功应用到当前 `.env` 配置的 MySQL 实例。
- 已将 Drizzle 命令更新为当前可用形式：
  - `db:push` -> `bunx drizzle-kit push`
  - `db:generate` -> `bunx drizzle-kit generate`
  - `db:migrate` -> `bunx drizzle-kit migrate`
- 已修复 `src/db/seed.ts`，使初始化脚本适配新 schema：
  - 先创建 `product_brands`
  - `products` 改为仅保存 SPU 级信息
  - 新增 `product_skus` 初始化数据
- 已修复与新商品模型不一致的测试桩，当前类型检查、单测、构建均通过。

## 功能方案设计更新（2026-03-21）
- 商品模型从“单商品单规格”升级为“SPU + SKU”结构：
  - `products` 负责商品基础信息：名称、描述、分类、品牌、主图、详情图、标签、状态。
  - `product_skus` 负责可售规格：`skuCode`、条码、颜色、尺码、售价、成本价、库存、预留库存、状态。
  - 商品列表/详情接口返回聚合结果，而不是直接暴露单表结构。
- 商品状态方案已调整：
  - 旧状态 `out_of_stock` 不再保留。
  - 新状态统一为 `draft | active | inactive`。
  - 是否可售主要由 SKU 状态和可用库存共同决定，不再由商品表单独承载库存语义。
- 品牌能力已正式纳入模型：
  - 新增 `product_brands` 表。
  - `products.brand_id` 可为空，表示商品允许暂无品牌。
- 订单模型已与 SKU 对齐：
  - `order_items` 新增 `sku_id`、`sku_code`、`color`，`size` 改为普通字符串。
  - 下单时以 `skuId + quantity` 作为核心输入，而不是直接传商品价格/规格文本。
  - 订单项保留下单快照，避免商品后续修改影响历史订单展示。
- 库存流转方案已确定：
  - 创建订单时预留 SKU 库存，写入 `reserved_stock`。
  - 取消订单时释放预留库存。
  - 发货时从库存中正式扣减，并同步减少预留库存。
  - 退款目前以订单状态流转为主，未额外实现自动回补库存逻辑，后续如需逆向入库需单独设计。
- 订单履约字段已补齐：
  - `orders` 新增 `shipping_company`、`tracking_number`、`cancel_reason`、`refund_reason`。
  - 发货、取消、退款接口应优先使用这些字段，不再依赖前端临时拼装文案。
- 统计口径已同步更新到 SKU 维度：
  - 商品销售排行使用 `skuCode` 与 `color/size` 组合展示规格。
  - 统计结果中的规格展示字段不再使用旧的单一 `sku` 占位值。

## 迁移方案说明（2026-03-21）
- 当前仓库此前没有可承接旧结构的 `drizzle/` 历史目录。
- 因此本次采用“手写增量 SQL + 生成 Drizzle 元数据”的方案，而不是直接依赖自动 diff：
  - 先用 `drizzle-kit generate` 生成目录结构与元数据。
  - 再将生成的全量建表 SQL 改写为针对旧表结构的增量迁移 SQL。
- 迁移脚本会执行以下关键数据回填：
  - 旧 `products.images` 回填到 `main_images` 与 `detail_images`
  - 旧 `products.price/cost_price/stock/size` 回填到默认生成的 `product_skus`
  - 旧 `order_items` 根据 `product_id` 回填 `sku_id/sku_code/color/size`
  - 旧商品状态 `out_of_stock` 映射为新状态 `inactive`
- 后续如果继续扩展 SKU 维度，不要再回退到商品表直接维护价格和库存。

## 会话更新（2026-03-20）
- 已将 `AGENTS.md` 与 `PROJECT_MEMORY.md` 统一为中文版本，保留命令与路径原文。
- 已新增仓库级 `AGENTS.md`，并要求固定流程：
  - 会话开始先读 `PROJECT_MEMORY.md`
  - 会话结束前更新 `PROJECT_MEMORY.md`
- 已在 `AGENTS.md` 增加后端专项规则：
  - 默认连接真实数据库，除非用户明确要求否则不启用 mock DB
  - 固定运行/构建/健康检查命令与验证要求
  - 安全规则：后端 `.env` 严禁提交
  - 变更边界、Git 规则与收尾模板

## 仓库信息
- 路径：`/Users/luo/Project/clothing-management-server`
- 远程：`git@github.com:luoqaq/clothing-management-server.git`
- 默认分支：`main`

## 启动手册
- 安装依赖：`npm install`（必要时可用 `bun install`）
- 开发启动（watch）：`npm run dev`
- 启动：`npm run start`
- 健康检查：`curl http://127.0.0.1:3000/health`
- 默认端口：`3000`

## 环境与数据库
- 运行时环境文件：`.env`（禁止提交）。
- 当前 `.env` 中数据库配置：
  - `DB_HOST=sh-cynosdbmysql-grp-jv20n0ae.sql.tencentcdb.com`
  - `DB_PORT=21680`
  - `DB_NAME=closthin-system-test`
- 注意：当前数据库名为 `closthin-system-test`，请与实际实例保持一致。

## 关键决策
- 后端 `.env` 不允许提交（由 `.gitignore` 约束）。
- `src/index.ts` 采用显式 `Bun.serve({ port, fetch: app.fetch })` 启动。
  - 该调整用于避免此前出现的 Bun 自动 serve 端口冲突问题。
- 前端默认直连该后端（前端已关闭 mock 启动逻辑）。
- 当前数据库模型以真实 MySQL 为准，商品相关开发统一基于 `products + product_skus + product_brands` 三层结构推进。
- 订单相关开发统一基于 SKU 维度建模，订单创建、库存预留、发货扣减都以 `product_skus.id` 为准。

## 已验证接口
- `GET /health` 返回 `{"success":true,"data":"OK"}`
- `POST /api/auth/login` 使用 `admin / admin123` 可登录

## 数据说明（2026-03-20）
- 在当前配置数据库中，`products` 表查询到 2 条数据。
- 如果页面与数据库客户端看到的数据不一致，优先核对 host/port/database 是否一致。

## 已知问题与风险
- MySQL `DECIMAL` 字段默认返回字符串。
  - 前端已做归一化处理；后续新增接口仍需考虑此行为。
- 当前增量迁移里，旧 `order_items` 通过 `product_id -> product_skus` 关联回填 SKU。
  - 该方案默认每个旧商品仅迁出一个默认 SKU，适用于本次由单规格模型升级而来的历史数据。
- 退款后是否自动回补库存尚未单独建模。
  - 如果未来需要“退款入库 / 退货质检 / 可售返仓”流程，需要再补独立库存状态设计。

## 快速验证
1. 执行 `npm run start`。
2. 执行 `curl http://127.0.0.1:3000/health`。
3. 用 `admin / admin123` 测试登录接口。
4. 确认前端可通过代理读取 `/api/products`。
5. 如需验证数据库迁移状态，执行 `bun run db:migrate`，确认无待执行迁移。

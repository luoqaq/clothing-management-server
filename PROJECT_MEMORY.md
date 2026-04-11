# 服装管理后台后端 - 项目记忆

最近更新：2026-04-11

## 仓库与环境
- 路径：`/Users/luo/Project/clothing-management-server`
- 远程：`git@github.com:luoqaq/clothing-management-server.git`
- 默认分支：`main`
- 包管理：常规脚本走 `npm`，依赖与运行时基于 `bun`
- 默认端口：`3000`
- 环境文件：`.env`
- 数据库默认连接真实 MySQL，未明确要求时不要切 mock、不要改 `.env`

## 常用命令
- 安装依赖：`npm install` 或 `bun install`
- 开发启动：`npm run dev`
- 启动：`npm run start`
- 构建：`npm run build`
- 测试：`npm test`
- 健康检查：`curl http://127.0.0.1:3000/health`

## 当前有效约束
- 商品主数据已从“品牌”切换为“供应商”，后端商品相关开发统一基于 `products + product_skus + suppliers` 三层结构。
- 订单链路统一基于 SKU 维度建模，库存预留、发货扣减、扫码识别都以 `product_skus.id` 为准。
- 销售角色权限已收口：
  - 管理员可维护商品、分类、供应商、批量导入、统计、销售账号
  - 销售及历史 `manager/staff` 在商品与移动端接口中不返回供应商和成本价
- 资源上传统一走“后端签发临时凭证，前端直传 COS”，不走后端文件中转。
- 腾讯云 MySQL 当前实例对预处理语句兼容性有限，尤其要注意 `LIMIT ?`；数据库访问已按兼容方向做过处理。
- 金额相关字段在 MySQL 中可能以字符串返回，联调和新增接口时要持续考虑序列化与前端归一化。

## 当前功能状态
- 订单与客户：
  - 订单创建主流程已使用 `soldPrice` 作为录单价格口径。
  - 订单接口时间字段已统一序列化为固定 `YYYY-MM-DD HH:mm:ss` 字符串，避免服务端时区影响前端展示。
  - 订单创建支持可选 `ageBucketId`；当订单已支付且填写手机号时，会同步客户归并与年龄段写入。
  - 已有 `customers`、`customer_age_buckets`、`orders.paid_at`、`order_items.cost_price_snapshot` 等统计所需模型。
- 商品与标签：
  - SKU 条码由服务端托管，格式为 `SKU` + 固定补零数字。
  - 创建/编辑商品时不再信任前端传入条码；新 SKU 落库后生成稳定标签码。
  - 已提供 `GET /api/products/:id/labels` 给后台打印标签。
  - 已提供 `GET /api/mobile/products/by-code` 给移动端/扫码录单按标签码读取可售 SKU。
- 导入与图片：
  - 已有 Excel / 图片识别 / 批量创建三段式商品导入接口。
  - 图片上传走 COS STS 凭证签发；商品创建与图片补传能力已分别打通后台和小程序链路。
- 统计：
  - 统计接口已拆为“销售统计 / 成本统计”两组输出。
  - 当前成本侧核心模型已支持累计入库数量与累计成本金额。
- 移动端接口：
  - `/api/mobile` 已覆盖认证、工作台、商品、订单、扫码录单、客户年龄段等小程序所需能力。

## 迁移与发布经验
- 生产迁移策略已收敛为“显式 SQL migration 优先”：
  - 使用 `drizzle-kit generate` 生成 `drizzle/*.sql`
  - 正式发布前先执行 SQL，再补 `__drizzle_migrations`
  - 发布脚本检测到 `drizzle/*.sql` 或 `drizzle/meta/*` 变更时，会要求先处理迁移
- 已有辅助脚本与入口：
  - `scripts/check_pending_migrations.sh`
  - `scripts/apply_sql_migrations.sh`
  - `npm run db:check-sql`
  - `npm run db:apply-sql -- drizzle/xxxx.sql`
- 历史上 `drizzle-kit migrate` 在部分环境里可能出现“卡在 applying migrations 但不给清晰报错”的问题；遇到迁移异常时，优先按 SQL migration 流程处理，不要盲目重试发布。
- 发布脚本已收敛为干净工作区检查 + 锁文件冻结安装；若发布前被脏工作区拦截，优先检查 `bun.lock`、`package-lock.json`、本地 stash 和未提交 migration 文件。
- 生产机构建/重启链路存在环境差异时，优先走仓库内标准脚本和现有 skills，不要手工拼命令上线。

## 关键迁移与结构约束
- 已有历史关键迁移：
  - `0001_staff_miniapp_source.sql`：订单来源 `source`
  - `0002_product_suppliers.sql`：供应商模型
  - `0003_sales_role.sql`：销售角色
  - `0004_product_code_repeatable.sql`：款号可重复
  - `0005_customer_statistics.sql`：客户/年龄段/支付时间/成本快照
  - `0006_cumulative_inbound_cost.sql`：累计入库成本
  - `0007_sku_barcode_labels.sql`：SKU 标签码
- 若后续涉及这些能力在新环境落地，先核对对应 SQL 是否已执行，不要只看代码。

## 已知风险与待关注项
- web 端扫码录单当前复用 `/api/mobile/products/by-code`；若后台和移动端语义继续分化，后续应抽成通用商品查询能力。
- 标签下载当前仍是前端逐张触发；如果 iPad 或浏览器对多文件下载限制更严格，后续可能需要 ZIP 或服务端生成方案。
- 退款后的库存回补流程仍未独立建模；若后续进入退货返仓场景，需要补更细的库存状态设计。
- COS 旧图片当前不会自动回收；存储量增长后需要补延迟清理策略。
- 线上状态、提交号、服务启动时间这类信息不保存在长期记忆里；涉及上线状态时重新巡检，不依赖历史快照。

## 最近新增经验
- 订单列表分页排序必须使用稳定排序键；仅按 `created_at desc` 在同秒多单场景下可能导致跨页重复或乱序，后端查询应至少补 `id desc` 作为二级排序，并避免在分页后再做与数据库排序口径不同的二次排序。
- Web 管理端订单列表现已支持按 `createdAt` 升序/降序切换；后端应继续把排序作为分页查询参数处理，并保持二级稳定排序键，避免只在当前页做本地排序导致翻页错乱。
- 商品 Excel 导入现已支持两条链路并存：桌面端保留“前端本地解析再传 JSON”，Pad 端新增“原始 Excel 文件直传后端解析”，后端文件解析需复用现有 JSON 解析逻辑，避免 prompt 和草稿标准化分叉。

## 最近会话摘要

### 会话日期：2026-04-10
- 变更内容：
  - 修复订单列表分页排序不稳定问题，订单查询改为按 `created_at desc, id desc` 稳定排序。
  - 移除订单列表分页后的本地二次排序，并补充单测覆盖“必须带二级排序键”的约束。
  - 订单列表接口新增排序参数，支持按 `createdAt` 升序/降序分页查询，并继续保留 `id` 二级稳定排序。
- 验证结果：
  - `bun test src/modules/orders/orders.service.test.ts` 通过。
  - `npm run build` 通过。
- 遗留问题或风险：
  - 本次修复只覆盖后端订单列表接口；若线上仍出现异常，需要进一步核对数据库中历史数据的 `created_at` 精度与时区写入情况。

### 会话日期：2026-04-11
- 变更内容：
  - 新增 `POST /products/import/parse-excel-file`，支持上传原始 `.xlsx/.xls` 文件后由服务端解析第一个 sheet，再复用现有 Excel JSON AI 导入逻辑。
  - 后端新增 `xlsx` 依赖，并补了 service 层测试覆盖“文件上传解析后复用既有 parseExcelImport”主链路。
- 验证结果：
  - `bun test src/modules/products/product-import.service.test.ts` 通过。
  - `npm run build` 通过。
- 遗留问题或风险：
  - 当前文件类型校验仍以扩展名和 MIME 的常见组合为主；如果后续遇到更特殊的移动端上传 MIME，可按现场样本补兼容。

### 会话日期：2026-04-11
- 变更内容：
  - 修复工作台与订单日期筛选的本地日界线错位问题。
  - 后端按天筛选不再把 `YYYY-MM-DD` 先转成 `Date/ISO` 再交给 Drizzle，而是统一归一成东八区 `YYYY-MM-DD HH:mm:ss` 边界并用 SQL `datetime` 比较。
  - 新增 `src/utils/date.test.ts`，覆盖日期边界归一化，避免“今日订单”把前一天晚间订单算进去。
- 验证结果：
  - `bun test src/utils/date.test.ts src/modules/orders/orders.service.test.ts` 通过。
  - `bun -e "...DashboardService.getDashboardSummary({startDate:'2026-04-11', endDate:'2026-04-11'})..."` 返回 `orderCount: 0`。
  - `npm run build` 通过。
- 遗留问题或风险：
  - 统计模块仍有独立的日期处理逻辑；若后续出现销售统计的“今日/昨日”错位，需要按同一口径继续核对 `statistics.service.ts`。

### 会话日期：2026-04-06
- 变更内容：
  - 做过一次生产只读巡检，确认后端服务、反代与公网访问链路可用。
  - 同时发现“订单录入改为售出价格”这波后端代码当时尚未上线。
- 验证结果：
  - 已完成服务状态、`/health` 与公网接口只读检查。
- 遗留问题或风险：
  - `soldPrice` 相关数据库字段与标准 migration 上线前仍需先补齐 SQL 并核验。

### 会话日期：2026-04-05
- 变更内容：
  - 修复订单接口时间序列化受服务端时区影响的问题。
  - 完成 SKU 标签码闭环与扫码读取接口。
  - 为移动端补充客户年龄段只读接口。
- 验证结果：
  - 相关测试与 `npm run build` 已通过。
- 遗留问题或风险：
  - 扫码录单仍复用移动端查询接口。

### 会话日期：2026-04-01 至 2026-03-21
- 变更内容：
  - 完成 SQL migration 标准化、客户与统计基础模型、销售角色权限收口、供应商替代品牌、批量导入、COS 上传、小程序后端打通等核心能力。
- 验证结果：
  - 相关改动均执行过构建、测试或数据库侧核验。
- 遗留问题或风险：
  - 历史一次性发布细节和线上瞬时状态已不再保留为长期记忆，后续排障请重新确认现场状态。

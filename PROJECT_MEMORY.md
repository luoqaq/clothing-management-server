# 服装管理后台后端 - 项目记忆

最近更新：2026-06-19

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
  - 经营利润口径为“销售额 - 商品成本 = 商品毛利；商品毛利 - 兼职工资 = 经营利润”，兼职工资不混入商品毛利。
- 移动端接口：
  - `/api/mobile` 已覆盖认证、工作台、商品、订单、扫码录单、客户年龄段等小程序所需能力。
  - `/api/mobile/dashboard/summary` 已支持小程序工作台摘要，并按角色控制毛利字段。
  - `/api/mobile/labor-costs/*` 已支持管理员查看兼职工资、经营利润概览、每日经营利润趋势和新增/补录工资，小程序端无需绕到 web 统计接口。
  - 商品列表接口支持 `lowStock=true&lowStockThreshold=10` 按活跃 SKU 可用库存筛选低库存商品，后台 `/api/products` 与小程序 `/api/mobile/products` 口径一致。
  - `/api/mobile/products/:id` 已支持管理员编辑商品；`/api/mobile/products/specifications/:id/stock` 已支持管理员维护规格库存，小程序商品维护不需要再绕到 web `/api/products`。
  - `/api/mobile/products/import/*` 已支持管理员批量上新解析 Excel、识别图片和批量创建商品，小程序批量上新不需要再绕到 web `/api/products/import/*`。

## 迁移与发布经验
- 生产迁移策略已收敛为“显式 SQL migration 优先”：
  - 使用 `drizzle-kit generate` 生成 `drizzle/*.sql`
  - 正式发布前先执行 SQL，再补 `__drizzle_migrations`
  - 发布脚本检测到 `drizzle/*.sql` 或 `drizzle/meta/*` 变更时，会要求先处理迁移
- 已有辅助脚本与入口：
  - `scripts/check_pending_migrations.sh`
  - `scripts/check_pending_migrations.mjs`
  - `scripts/apply_sql_migrations.sh`
  - `scripts/apply_sql_migrations.mjs`
  - `npm run db:check-sql`
  - `npm run db:apply-sql -- --dry-run drizzle/xxxx.sql`
  - `npm run db:apply-sql -- drizzle/xxxx.sql`
- `drizzle/0000_spicy_guardian.sql` 与 `drizzle/meta/0000_snapshot.json` 只作为历史 migration/journal 补齐材料使用：
  - 上线前必须确认生产库 `__drizzle_migrations` 已登记 `0000_spicy_guardian` 对应 hash，避免初始 migration 被误执行。
  - 若生产库未登记 `0000_spicy_guardian` hash，只能在人工确认现有结构后登记 hash，绝不能执行 `drizzle/0000_spicy_guardian.sql`。
  - `0000_snapshot.json` 保留历史 `product_brands` 等旧结构痕迹，不代表当前 schema；后续不要把它当作当前 `drizzle-kit generate` 的基线。
  - 当前上线流程禁止直接使用 `drizzle-kit generate` 或 `drizzle-kit migrate`；新增 migration 先人工核对当前 schema，再走显式 SQL migration 流程。
- `drizzle/0001_staff_miniapp_source.sql` 已改为幂等写法；生产库若已手动存在 `orders.source`，执行该 SQL 应只完成 hash 登记，不重复 `ADD COLUMN`。
- 历史上 `drizzle-kit migrate` 在部分环境里可能出现“卡在 applying migrations 但不给清晰报错”的问题；遇到迁移异常时，优先按 SQL migration 流程处理，不要盲目重试发布。
- 发布脚本已收敛为干净工作区检查 + 锁文件冻结安装；若发布前被脏工作区拦截，优先检查 `bun.lock`、`package-lock.json`、本地 stash 和未提交 migration 文件。
- 生产机构建/重启链路存在环境差异时，优先走仓库内标准脚本和现有 skills，不要手工拼命令上线。

## 上线版本记录
- 当前最新发布版本：`release-20260619.1`
- 版本递增规则：每次上线前读取本节，按 `release-YYYYMMDD.N` 递增；同一天多次上线递增 `.N`。
- 上线前说明必须包含：本次版本号、后端 commit、发布范围、是否包含数据库结构变更或数据修复。
- 数据库相关上线说明必须包含：`drizzle/*.sql` 状态、生产库结构核对结果、手动 SQL 执行计划、验证 SQL/API、失败后的补救方式。
- 上线后记录必须包含：实际发布版本、commit、迁移状态、服务健康检查、关键接口验证、遗留风险。

## 关键迁移与结构约束
- 已有历史关键迁移：
  - `0001_staff_miniapp_source.sql`：订单来源 `source`
  - `0002_product_suppliers.sql`：供应商模型
  - `0003_sales_role.sql`：销售角色
  - `0004_product_code_repeatable.sql`：款号可重复
  - `0005_customer_statistics.sql`：客户/年龄段/支付时间/成本快照
  - `0006_cumulative_inbound_cost.sql`：累计入库成本
  - `0007_sku_barcode_labels.sql`：SKU 标签码
  - `0008_order_item_sold_price.sql`：订单明细售出价 `sold_price`
  - `0009_sku_image.sql`：SKU 图片 `image`
- 若后续涉及这些能力在新环境落地，先核对对应 SQL 是否已执行，不要只看代码。

## 已知风险与待关注项
- web 端扫码录单当前复用 `/api/mobile/products/by-code`；若后台和移动端语义继续分化，后续应抽成通用商品查询能力。
- 标签下载当前仍是前端逐张触发；如果 iPad 或浏览器对多文件下载限制更严格，后续可能需要 ZIP 或服务端生成方案。
- 退款后的库存回补流程仍未独立建模；若后续进入退货返仓场景，需要补更细的库存状态设计。
- COS 旧图片当前不会自动回收；存储量增长后需要补延迟清理策略。
- 线上状态、提交号、服务启动时间这类信息不保存在长期记忆里；涉及上线状态时重新巡检，不依赖历史快照。

## 最近新增经验

### 会话日期：2026-06-01
- 变更内容：
  - 修复“录单后因商品成本价录错去编辑商品，再取消订单时报规格不存在”的后端根因。
  - 商品编辑不再因为提交 `specifications` 就整组删除并重建 SKU；已有规格按 `id` 原地更新，仅新增规格插入、移除规格删除，避免只改成本价时改变 `product_skus.id`。
  - 取消订单回补库存时，如果历史订单明细里的旧 `skuId` 已不存在，会按订单快照中的 `productId + skuCode`、再按 `productId + color + size` 尝试匹配当前 SKU 并回补；仍无法匹配时允许取消并记录 warning。
- 验证结果：
  - `bun test src/modules/products/products.service.test.ts src/modules/orders/orders.service.test.ts` 通过。
  - `npm test` 通过。
  - `npm run build` 通过。
  - 已推送 `main`：修复代码 commit 为 `6dc5a26`。
  - 已于 2026-06-01 22:41 CST 通过 `/var/clothing/server/deploy/release.sh server` 发布 `release-20260601.1`。
  - 生产后端当前 commit 为 `6dc5a26`，`clothing-management-server` 为 `active`，本机 `/health` 返回成功。
  - 生产反代验证通过：`https://clothing.chuchu9.cn/api/auth/me` 未登录返回 `401`，`https://clothing.chuchu9.cn/` 返回 `200`。
- 遗留问题或风险：
  - 本次不包含数据库结构变更，不涉及 `drizzle/*.sql` 或手动 SQL。
  - 线上已有历史脏关联已由取消订单 fallback 兼容；仍建议遇到无法匹配当前规格的 warning 时按现场订单人工核库存。
  - 如果用户删除某个规格且该规格没有当前颜色尺码可匹配，历史订单取消时会跳过该明细的库存回补并写 warning，需要按现场订单人工核库存。

### 会话日期：2026-04-29
- 变更内容：
  - 生产 Nginx 站点 `/etc/nginx/conf.d/clothing.chuchu9.cn.conf` 已把 `chuchu9.cn` 加入同一站点的 `server_name`，配置备份为 `/etc/nginx/conf.d/clothing.chuchu9.cn.conf.bak.20260429094353`。
  - Let’s Encrypt 证书 `clothing.chuchu9.cn` 已扩展为同时覆盖 `clothing.chuchu9.cn` 与 `chuchu9.cn`，证书路径保持 `/etc/letsencrypt/live/clothing.chuchu9.cn/fullchain.pem` 和 `privkey.pem`。
  - 新证书到期时间为 `2026-07-28 00:45:37+00:00`，certbot 自动续期任务保持启用。
- 验证结果：
  - `nginx -t` 通过并已 reload Nginx。
  - 公网 `https://chuchu9.cn/` 和 `https://clothing.chuchu9.cn/` 均返回 `200`。
  - 公网 `https://chuchu9.cn/api/auth/me` 和 `https://clothing.chuchu9.cn/api/auth/me` 未登录均返回 `401`。
  - 证书 SAN 确认为 `DNS:chuchu9.cn, DNS:clothing.chuchu9.cn`。
- 遗留问题或风险：
  - 根域名当前与后台站点复用同一套静态资源和 `/api` 反代；如后续根域名要做官网或跳转页，需要单独调整 Nginx 站点策略。

### 会话日期：2026-04-23
- 变更内容：
  - 生产发布版本 `release-20260423.1`，后端线上 commit 更新为 `293e143`。
  - 修复销售角色新建订单时读取 `/api/customers/age-buckets` 被 `403` 拦截的问题；客户年龄段只读接口调整为登录用户可访问，客户写操作仍保持管理员权限。
  - 销售角色订单与移动端返回中继续展示商品原价/销售价，但隐藏 `costPriceSnapshot`；工作台统计按角色隐藏毛利相关数据。
  - 发布前确认本次没有新的数据库结构变更；生产执行 `npm run db:check-sql` 显示无待执行 SQL migration。
- 验证结果：
  - 本地 `npm test` 通过，`npm run build` 通过。
  - 生产 `clothing-management-server` 服务为 `active`，本机 `/health` 返回成功。
  - 公网 `https://clothing.chuchu9.cn/` 返回 `200`，`/api/auth/me` 未登录返回 `401`，`/api/customers/age-buckets` 未登录返回 `401`，确认已进入认证层而非角色 `403`。
  - Nginx 配置检查通过，DNS 解析到 `101.35.255.39`。
- 遗留问题或风险：
  - 生产发布日志中观察到近期 `Mobile login error`，本次未展开登录失败来源排查；如门店反馈无法登录，需要单独按账号和请求日志追踪。
  - 本地仍存在未纳入本次发布的历史 `drizzle/*.sql` 与 `drizzle/meta/*` 未跟踪文件；本次发布已明确不包含这些 migration。

### 会话日期：2026-04-20
- 变更内容：
  - 线上后端 `/var/clothing/server/.env` 的 `AI_IMPORT_MODEL` 已从 `ep-20260331220642-rpqnk` 切换为 `ep-20260401203919-c84wx`，用于测试新的图片识别 Ark endpoint。
  - 变更前已备份线上环境文件为 `.env.bak.20260420215720`，并重启 `clothing-management-server` 使配置生效。
- 验证结果：
  - 运行中进程环境变量确认 `AI_IMPORT_MODEL=ep-20260401203919-c84wx`。
  - `systemctl is-active clothing-management-server` 返回 `active`，本机 `/health` 返回成功，公网 `/api/auth/me` 未登录返回 `401`。
- 遗留问题或风险：
  - 本次只验证服务启动和配置生效，尚未用真实图片导入请求验证新 endpoint 的识别质量与兼容性。

### 会话日期：2026-04-19
- 变更内容：
  - 生产执行标准发布入口 `/var/clothing/server/deploy/release.sh all`，发布版本为 `release-20260419.1`，server 当前线上版本保持在 `59da933`。
  - 发布前确认无待执行 SQL migration；发布过程中后端 `bun install --frozen-lockfile` 无依赖变化，并完成服务重启。
  - 发布后商品列表报错定位为生产库 `product_skus` 缺少 `image` 列；已手动执行 `ALTER TABLE product_skus ADD COLUMN image varchar(500);` 修复。
- 验证结果：
  - `clothing-management-server` 服务重启后为 `active (running)`，日志显示数据库连接成功并监听 `127.0.0.1:3000`。
  - 生产巡检通过：`/health` 返回成功，`https://clothing.chuchu9.cn/` 返回 `200`，`https://clothing.chuchu9.cn/api/auth/me` 未登录返回 `401`。
  - 已验证 `product_skus.image` 存在，商品列表失败 SQL 对应的 `product_skus` 查询可正常返回。
- 遗留问题或风险：
  - 本次发布未包含新 commit 或 SQL migration，属于对当前 `origin/main` 的标准重建与服务刷新。
  - 已修正本地 `.gitignore`，不再忽略 `drizzle` 目录；`drizzle/0008_order_item_sold_price.sql`、`drizzle/0009_sku_image.sql` 和 meta snapshot 现在会进入普通 Git 状态。
  - 生产库 `order_items.sold_price` 与 `product_skus.image` 均已存在，但对应 SQL 文件此前未在生产工作区，后续若把 SQL 文件提交上线，需要同步核对 `__drizzle_migrations` hash 记录，避免已落库字段被误判为 pending 后重复执行。

- 订单库存流转当前约定是“确认即扣减、发货不再重复扣减”；退款时只要订单已进入 `confirmed / shipped / delivered` 任一已扣减状态，都需要回补库存。后续若再改订单状态机，务必一起核对 `shipOrder / refundOrder / cancelOrder` 三处库存逻辑，避免库存与可售口径漂移。
- 商品编辑已改为已有 SKU 原地更新、新 SKU 单独插入、移除规格才删除；已占用规格不能改颜色、改尺码或删除，并会拦截总库存低于已占用库存的提交。
- 订单列表分页排序必须使用稳定排序键；仅按 `created_at desc` 在同秒多单场景下可能导致跨页重复或乱序，后端查询应至少补 `id desc` 作为二级排序，并避免在分页后再做与数据库排序口径不同的二次排序。
- Web 管理端订单列表现已支持按 `createdAt` 升序/降序切换；后端应继续把排序作为分页查询参数处理，并保持二级稳定排序键，避免只在当前页做本地排序导致翻页错乱。
- 商品 Excel 导入现已支持两条链路并存：桌面端保留“前端本地解析再传 JSON”，Pad 端新增“原始 Excel 文件直传后端解析”，后端文件解析需复用现有 JSON 解析逻辑，避免 prompt 和草稿标准化分叉。

### 会话日期：2026-04-18
- 变更内容：
  - 修复订单库存状态流转：已确认订单发货时不再二次扣减库存；已发货/已送达订单退款时会正确回补库存。
  - 为库存流转补充单测，覆盖“confirmed -> shipped 不重复扣减”和“shipped -> refunded 回补库存”。
  - 生产排查 `CC9-007-M-冰水蓝-11-P7` 时确认：`reserved_stock=2` 不是被当前订单直接占用，而是旧规格的历史脏占用在 2026-04-16 编辑商品时被迁移到了新规格；已将线上 `sku_id=540` 校正为 `reserved_stock=0`。
  - 后端商品更新逻辑已改为仅在规格颜色和尺码未变化时才保留原占用，并补单测覆盖“改色/改码后清空旧占用”。
- 验证结果：
  - `bun test src/modules/orders/orders.service.test.ts` 通过。
  - `npm run build` 通过。
  - `bun test src/modules/products/products.service.test.ts` 通过。
  - 生产已发布后台与后端，`/health` 返回成功，`https://clothing.chuchu9.cn/` 返回 `200`，`https://clothing.chuchu9.cn/api/auth/me` 未登录返回 `401`。
- 遗留问题或风险：
  - 这次修复覆盖后端库存状态机，但未回溯清理历史上若已被重复扣减的线上数据；如现场仍有异常 SKU，需要按订单历史核对并手动校正库存。

### 会话日期：2026-04-18
- 变更内容：
  - 门店订单状态机已按业务收口为“已确认 / 已取消”：创建订单时固定落 `confirmed`，取消订单时回补库存，不再在门店录单链路里新增 `reservedStock` 占用。
  - 订单查询结果会把历史 `pending / shipped / delivered` 统一归一成 `confirmed`，把 `refunded` 归一成 `cancelled`，前端不再看到多余状态。
  - `shipOrder / refundOrder` 已改为直接拒绝，避免门店流程再走发货、退款状态流转；仪表盘 `pendingOrderCount` 也固定归零。
- 验证结果：
  - `bun test src/modules/orders/orders.service.test.ts src/modules/products/products.service.test.ts` 通过。
  - `npm run build` 通过。
- 遗留问题或风险：
  - 数据库状态枚举暂未收缩，当前是应用层对历史状态做兼容归一；若后续要彻底删掉旧状态，仍需补数据库层迁移与历史数据清理方案。

## 最近会话摘要

### 会话日期：2026-06-19
- 变更内容：
  - 发布版本 `release-20260619.1`，生产后端更新到 commit `f480e88`。
  - 本次发布范围为后端兼职工资/经营利润接口与数据库 migration；PC 管理端和小程序未在本次发布。
  - 生产显式执行并登记 `drizzle/0010_labor_costs.sql`，新增 `part_time_workers` 与 `labor_cost_records` 及工资记录日期、人员索引。
  - 后端兼职人员选择继续复用销售账号，旧 `part_time_workers` 表仅保留兼容，不作为当前选择来源。
- 验证结果：
  - 本地 `git diff --check` 通过。
  - 本地 `npm test` 通过。
  - 本地 `npm run build` 通过。
  - 生产 `npm run db:apply-sql -- --dry-run drizzle/0010_labor_costs.sql` 显示 `WOULD APPLY`，正式执行后 `npm run db:check-sql` 显示 `No pending SQL migrations.`。
  - 生产只读核对确认 `labor_cost_records` 与 `part_time_workers` 表存在，`labor_cost_records_work_date_idx` 与 `labor_cost_records_worker_id_idx` 索引存在。
  - `/var/clothing/server/deploy/release.sh server` 发布成功，`clothing-management-server` 为 `active`，本机 `/health` 返回成功。
  - HTTPS 反代验证通过：`https://clothing.chuchu9.cn/` 返回 `200`，`/api/auth/me`、`/api/labor-costs`、`/api/statistics/operating-profit/overview`、`/api/mobile/labor-costs/operating-profit/daily` 未登录均返回 `401`。
- 遗留问题或风险：
  - 本次未发布 PC 管理端和小程序，前端入口需后续单独发布或上传后才能使用新接口。
  - 生产后端仓库仍有历史未跟踪文件 `.env.bak.20260420215720`，本次发布未触碰该文件。

### 会话日期：2026-06-18
- 变更内容：
  - 新增移动端 `/api/mobile/labor-costs/operating-profit/daily`，复用统计服务的每日经营利润口径，供小程序兼职收益页绘制趋势图。
  - 移动端兼职收益接口保持管理员权限，经营利润仍按“商品毛利 - 兼职工资”计算。
- 验证结果：
  - `npm run build` 通过。
  - `npm test` 通过。
  - `git diff --check` 通过。
- 遗留问题或风险：
  - 本次后端改动不新增 SQL migration；上线前仍需按已有 `0010_labor_costs.sql` 的数据库变更流程确认目标库状态。

### 会话日期：2026-06-18
- 变更内容：
  - 兼职成本人员来源改为复用销售账号：`/api/labor-costs/workers` 与 `/api/mobile/labor-costs/workers` 返回 `users` 表中的非管理员账号。
  - 兼职成本记录的 `workerId` 现在保存销售账号 `users.id`，`workerNameSnapshot` 保存账号姓名快照；旧 `part_time_workers` 表保留但不再作为选择来源。
  - 后端不再暴露旧的兼职人员新增/维护路由；人员新增统一去销售账号管理中完成。
- 验证结果：
  - `npm test` 通过。
  - `npm run build` 通过。
  - `git diff --check` 通过。
- 遗留问题或风险：
  - 本次不新增 SQL migration；测试库已存在的 `part_time_workers` 表暂不清理，后续若确认彻底废弃再单独做清理迁移。

### 会话日期：2026-06-17
- 变更内容：
  - 新增兼职成本模型：`part_time_workers` 与 `labor_cost_records`，配套 SQL migration 为 `drizzle/0010_labor_costs.sql`。
  - 新增后端 `/api/labor-costs` 管理端接口和 `/api/mobile/labor-costs/*` 小程序管理员接口，支持兼职人员、用工记录、补录和经营利润查询。
  - 统计新增 `/api/statistics/operating-profit/overview` 与 `/api/statistics/operating-profit/daily`，保持商品毛利不扣兼职工资，新增经营利润单独扣除兼职工资。
- 验证结果：
  - `bun test src/modules/statistics/statistics.service.test.ts` 通过。
  - `npm test` 通过。
  - `npm run build` 通过。
  - `npm run db:apply-sql -- --dry-run drizzle/0010_labor_costs.sql` 显示 `WOULD APPLY drizzle/0010_labor_costs.sql`，未写库。
  - `git diff --check` 通过。
- 遗留问题或风险：
  - 本轮未执行真实 SQL、未发布生产；上线前需按 SQL release 流程应用并登记 `0010_labor_costs.sql`。
  - 当前连接库 `npm run db:check-sql` 仍显示历史 pending：`0001_staff_miniapp_source.sql`、`0008_order_item_sold_price.sql`、`0009_sku_image.sql`，以及本次新增 `0010_labor_costs.sql`；上线时需按生产实际状态核对。

### 会话日期：2026-06-16
- 变更内容：
  - 发布版本 `release-20260615.1`，生产后端更新到 commit `b11e050`。
  - 本次发布范围为后端服务与数据库 migration；PC 管理端未改动、未发布。
  - 生产先显式执行 SQL migration，再运行标准后端发布入口 `/var/clothing/server/deploy/release.sh server`。
- 验证结果：
  - 生产 `npm run db:apply-sql -- --dry-run drizzle/0000_spicy_guardian.sql` 输出已登记并跳过，未执行历史破坏性 SQL。
  - 生产按顺序执行并登记 `0001_staff_miniapp_source.sql`、`0008_order_item_sold_price.sql`、`0009_sku_image.sql`。
  - 生产 `npm run db:check-sql` 显示 `No pending SQL migrations.`。
  - `clothing-management-server` 为 `active`，本机 `/health` 返回成功。
  - Nginx 配置检查通过；本机 HTTPS Host 头访问首页返回 `200`，`/api/auth/me` 未登录返回 `401`。
  - 公网 `https://clothing.chuchu9.cn/` 返回 `200`，`https://clothing.chuchu9.cn/api/auth/me` 未登录返回 `401`。
- 遗留问题或风险：
  - 本次未发布 PC 管理端。
  - 小程序代码 commit `e7599e5` 已推送并完成生产构建，微信开发者工具 CLI 上传因本机服务端口未开启超时，改由用户手动上传。

### 会话日期：2026-06-15
- 变更内容：
  - 将 `scripts/apply_sql_migrations.mjs` 与 `scripts/check_pending_migrations.mjs` 纳入 Git 暂存范围，避免生产 clone 后 `.sh` 入口 exec Node 脚本时报 ENOENT。
  - `drizzle/meta/_journal.json` 补充 `0008_order_item_sold_price` 和 `0009_sku_image` 条目，保持 SQL 文件与 journal metadata 一致。
  - `db:apply-sql` 对 `drizzle/0000_spicy_guardian.sql` 增加执行保护；若该历史补齐 migration 未登记 hash，脚本会拒绝执行破坏性 SQL。
  - `AGENTS.md`、`PROJECT_MEMORY.md` 和 `README.md` 明确当前仓库禁止直接使用 `drizzle-kit generate/migrate` 作为上线流程，`0000_snapshot.json` 不可作为当前 schema 基线。
  - `OrdersService.createOrder` 增加商品与 SKU 状态校验，拒绝下架商品或停用规格创建订单。
- 验证结果：
  - `bun test src/modules/orders/orders.service.test.ts src/modules/products/products.service.test.ts src/modules/products/product-import.service.test.ts` 通过。
  - `npm run build` 通过。
  - `npm run db:check-sql` 显示当前连接数据库 pending：`0001_staff_miniapp_source.sql`、`0008_order_item_sold_price.sql`、`0009_sku_image.sql`；未显示 `0000_spicy_guardian.sql`，说明当前连接库已登记 0000 hash。
  - `npm run db:apply-sql -- --dry-run drizzle/0001_staff_miniapp_source.sql drizzle/0008_order_item_sold_price.sql drizzle/0009_sku_image.sql` 通过。
  - `npm run db:apply-sql -- --dry-run drizzle/0000_spicy_guardian.sql` 输出已登记并跳过，未执行 SQL。
  - `git diff --check` 通过。
- 遗留问题或风险：
  - 本轮仍未执行真实 SQL、未发布生产；上线前仍需按 SQL release 流程应用并登记 0001/0008/0009。

### 会话日期：2026-06-14
- 变更内容：
  - `drizzle/0001_staff_miniapp_source.sql` 改为幂等写法，生产库若已存在 `orders.source` 也能继续完成 migration hash 登记。
  - `ProductsService.updateProduct` 增加空规格数组拦截，避免 `specifications: []` 把现有 SKU 全部删除。
  - 订单查询新增 `productSearch` 筛选参数，web/mobile 订单列表接口都会传入服务层；服务层按 `order_items.product_name / sku_code / color / size` 命中订单 ID 后再分页，支持小程序订单列表按商品筛选。
  - 项目记忆补充 `0000_spicy_guardian` 与 `0000_snapshot.json` 的历史补齐定位：上线前必须确认生产 `__drizzle_migrations` 已登记 `0000_spicy_guardian`，且 snapshot 不可作为当前 schema 生成基线。
- 验证结果：
  - `bun test src/modules/orders/orders.service.test.ts` 通过，覆盖 `productSearch` 在分页前按商品关键词筛选订单。
  - `bun test src/modules/products/products.service.test.ts src/modules/products/product-import.service.test.ts src/modules/orders/orders.service.test.ts` 通过。
  - `npm run build` 通过。
  - `npm run db:check-sql` 显示本地 pending：`0001_staff_miniapp_source.sql`、`0008_order_item_sold_price.sql`、`0009_sku_image.sql`。
  - `npm run db:apply-sql -- --dry-run drizzle/0001_staff_miniapp_source.sql drizzle/0008_order_item_sold_price.sql drizzle/0009_sku_image.sql` 通过，确认只演练不写库。
  - `git diff --check` 通过。
- 遗留问题或风险：
  - 本轮未执行真实 SQL、未登记 migration hash、未发布生产；上线前必须先 `git add drizzle/`，再按 SQL release 流程核对并应用 pending migration。

### 会话日期：2026-05-31
- 变更内容：
  - 商品列表筛选新增 `lowStock` 与 `lowStockThreshold` 查询参数，后端按活跃 SKU 的 `GREATEST(stock - reserved_stock, 0) <= threshold` 找到低库存商品。
  - 小程序工作台摘要补齐 mobile 端路由：`GET /api/mobile/dashboard/summary`，继续按角色控制是否返回毛利。
  - 后台商品接口 `/api/products` 与小程序商品接口 `/api/mobile/products` 复用同一套低库存查询逻辑；本次不涉及数据库结构或 SQL migration。
  - 小程序商品编辑与规格库存维护补齐 mobile 端路由：`PUT /api/mobile/products/:id`、`PATCH /api/mobile/products/specifications/:id/stock`。
  - 小程序批量上新补齐 mobile 端路由：`POST /api/mobile/products/import/parse-excel-file`、`POST /api/mobile/products/import/parse-image`、`POST /api/mobile/products/import/bulk-create`。
  - 商品更新规格时，如果同一规格未显式传入新图片，会保留原 `product_skus.image`，避免小程序编辑基础资料后误清空规格图。
  - 商品编辑已从“整组删除 SKU 后重建”调整为已有规格原地更新、新规格单独插入、移除规格才删除，避免编辑基础资料或规格价格时改变已有 `product_skus.id`，影响订单、标签和库存引用。
  - 商品更新会拦截已占用规格的改色、改码、删除，以及总库存低于已占用库存的提交，避免小程序商品编辑页绕过详情页库存保护。
  - `ProductsService` 内部创建、更新、删除、库存维护读取商品时改用管理员口径，避免服务内部读取旧规格时误套销售角色脱敏，导致成本价等维护字段丢失。
  - `npm run db:check-sql` 已增加 Node/mysql2 检查入口，避免本机 Homebrew MySQL 9 客户端缺少 `mysql_native_password` 插件时无法执行发布前只读 migration 检查。
  - `npm run db:apply-sql` 已增加 Node/mysql2 执行入口和 `--dry-run` 演练模式，发布前可先确认会应用哪些 SQL，且不写库、不登记 hash。
  - `drizzle/0008_order_item_sold_price.sql` 和 `drizzle/0009_sku_image.sql` 已改成幂等写法：字段已存在时不重复 `ADD COLUMN`，执行成功后仍可由 `db:apply-sql` 登记 migration hash。
- 验证结果：
  - `bun test src/modules/products/product-import.service.test.ts src/modules/products/products.service.test.ts` 通过，覆盖批量导入去重、规格图保留、规格原地更新、占用规格改删保护、占用库存保护和低库存筛选。
  - `npm run build` 通过。
  - `npm run db:check-sql` 可正常连接并输出 pending migration。
  - `npm run db:apply-sql -- --dry-run drizzle/0008_order_item_sold_price.sql drizzle/0009_sku_image.sql` 输出会应用这两个文件，且随后的 `db:check-sql` 仍显示 pending，确认 dry-run 未写库。
  - 只读核对当前数据库字段：`order_items.sold_price` 已存在，类型为 `decimal(10,2)`，当前 15 条订单明细无 `NULL` 或 `0`；`product_skus.image` 已存在，111 条 SKU 中 2 条已有图片。
  - 生产服务器当前线上 commit `293e143` 的 `/var/clothing/server` 工作区执行 `npm run db:check-sql` 返回 `No pending SQL migrations.`，原因是线上工作区尚未包含本地未跟踪的 `0008/0009` SQL 文件。
  - `git diff --check` 通过。
- 遗留问题或风险：
  - 当前低库存阈值由前端传入，默认 10；如果后续要支持门店自定义预警值，需要再补配置项或库存策略表。
  - 本地提交并发布 `0008/0009` 后，生产会重新显示这两个 pending；上线前应按 SQL release 流程依次执行 `npm run db:apply-sql -- drizzle/0008_order_item_sold_price.sql` 和 `npm run db:apply-sql -- drizzle/0009_sku_image.sql`，让幂等 SQL 完成字段归一与 hash 登记，然后再发布后端/小程序。

### 会话日期：2026-04-17
- 变更内容：
  - 商品创建、编辑、批量导入三条链路已统一改为后端强拦截重复款号；服务层会在写库前校验 `productCode` 是否已存在，重复时返回明确错误文案。
  - 批量导入在真正写库前会同时检查“本批次内部重复款号”和“数据库中已存在款号”，避免出现半成功导入。
- 验证结果：
  - `bun test src/modules/products/products.service.test.ts src/modules/products/product-import.service.test.ts` 通过。
  - `npm run build` 通过。
  - 已推送 `main`，并于 2026-04-17 23:20 CST 通过生产机 `/var/clothing/server/deploy/release.sh all` 完成上线。
  - 生产巡检通过：`/health` 返回成功，`https://clothing.chuchu9.cn/` 返回 `200`，`https://clothing.chuchu9.cn/api/auth/me` 未登录返回 `401`。
- 遗留问题或风险：
  - 当前仍是应用层拦截，数据库层没有恢复 `product_code` 唯一索引；若后续新增绕过 `ProductsService` 的写入入口，仍可能写入重复款号。

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

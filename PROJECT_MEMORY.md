# 服装管理后台后端 - 项目记忆

最近更新：2026-04-01

## 会话更新（2026-04-01）
- 已正式将生产数据库迁移策略收敛为“方案 A”：
  - 继续使用 `drizzle-kit generate` 生成 `drizzle/*.sql`
  - 生产环境不再默认依赖 `bun run db:migrate`
  - 生产环境统一改为显式执行 SQL，再补 `__drizzle_migrations`
- 已新增标准迁移脚本：
  - `scripts/check_pending_migrations.sh`
  - `scripts/apply_sql_migrations.sh`
- 已新增 npm 入口：
  - `npm run db:check-sql`
  - `npm run db:apply-sql -- drizzle/000x.sql`
- 已更新 `deploy/release.sh`：
  - 后端发布检测到 `drizzle/*.sql` 或 `drizzle/meta/*` 变更时，不再自动执行 `db:migrate`
  - 会直接中断并提示先手动执行 SQL migration，再重新发布后端
- 已更新 `README.md` 与 `DEPLOYMENT.md`，统一文档口径为显式 SQL 迁移。
- 本次验证已执行：
  - `bash -n scripts/apply_sql_migrations.sh` 通过
  - `bash -n scripts/check_pending_migrations.sh` 通过
  - `bash -n deploy/release.sh` 通过
  - `npm run db:check-sql -- --help` 通过
  - `npm run db:apply-sql -- --help` 通过

## 会话更新（2026-04-01）
- 已新增累计入库成本模型：
  - `product_skus.cumulative_inbound_quantity`
  - `product_skus.cumulative_cost_amount`
- 已新增迁移脚本：
  - `drizzle/0006_cumulative_inbound_cost.sql`
- 当前成本统计口径已调整为“累计入库成本”：
  - 新建商品/规格时，按初始库存与成本价写入累计字段
  - 手工改库存时，仅对增加量追加累计数量与累计金额
  - 销售出库、预留库存、退款回补不减少累计字段
  - 成本统计概览、分类成本、商品成本排行均基于累计字段计算
- 测试库已完成 `0006` 结构落库与回填核验：
  - `product_skus.cumulative_inbound_quantity` 已存在
  - `product_skus.cumulative_cost_amount` 已存在
  - `__drizzle_migrations` 最新记录已推进到 `id=7`
- 注意：
  - 本次 `bunx drizzle-kit migrate` 仍出现“停在 applying migrations 但不给清晰报错”的老问题
  - 本次已通过“手动执行 SQL + 手动补 `__drizzle_migrations` 记录”的方式完成测试库迁移
- 本次验证已执行：
  - `bun run build` 通过
  - `bun test` 通过

## 会话更新（2026-04-01）
- 已按仓库标准入口对测试数据库执行完整迁移：
  - 命令：`npm run db:migrate`
  - 结果：成功应用到当前 `.env` 指向的测试库 `closthin-system-test`
- 已额外做数据库侧核验，确认 `0005_customer_statistics.sql` 相关结构已落库：
  - 表：`customer_age_buckets`
  - 表：`customers`
  - 字段：`orders.paid_at`
  - 字段：`order_items.cost_price_snapshot`
  - `__drizzle_migrations` 最新记录已推进到 `id=6`
- 本次验证已执行：
  - `npm run db:migrate` 通过
  - `bun run build` 通过

## 会话更新（2026-04-01）
- 已为订单创建接口补充可选 `ageBucketId` 字段。
- 后台新增订单表单现已支持在客户信息中选择年龄段。
- 当订单为已支付且填写了手机号时，客户归并逻辑会把下单时选择的年龄段同步写入客户档案。
- 本次验证已执行：
  - `bun run build` 通过
  - `bun test` 通过

## 会话更新（2026-04-01）
- 已按经营统计需求补齐客户与成本快照基础模型：
  - 新增 `customers` 表
  - 新增 `customer_age_buckets` 表
  - `orders` 新增 `customer_id`、`paid_at`
  - `order_items` 新增 `cost_price_snapshot`
  - 已新增迁移脚本：`drizzle/0005_customer_statistics.sql`
- 已补充订单与客户归并链路：
  - 创建已支付订单后，会按手机号归并客户档案并回写 `orders.customer_id`
  - 客户档案会维护首单时间、最近支付时间、有效支付订单数
  - 订单取消/退款后会重新同步客户有效支付统计
- 已重构统计接口为销售/成本模块化输出：
  - 销售统计新增：概览、客户分析、分类销售分析、商品销售排行、商品毛利分析
  - 成本统计新增：成本概览、分类成本分析、商品成本排行
- 已新增客户与年龄段管理接口：
  - `GET /api/customers`
  - `PATCH /api/customers/:id`
  - `GET/POST/PUT/DELETE /api/customers/age-buckets`
- 当前统计口径已固定：
  - 仅统计 `paymentStatus=paid` 且未取消/未退款的有效支付订单
  - 时间维度使用 `orders.paid_at`
  - 成本与毛利均基于 `order_items.cost_price_snapshot`
  - 新客/老客按客户首单是否落在当前统计期内区分
- 本次验证已执行：
  - `bun run build` 通过
  - `bun test` 通过
- 上线注意：
  - 正式环境上线前必须执行 `drizzle/0005_customer_statistics.sql`
  - 历史订单的 `cost_price_snapshot` 与 `customer_id` 不会自动回填；本次统计准确性对新订单最佳，若要让历史报表完全准确，需要后续补一轮历史数据回填脚本

## 会话更新（2026-04-01）
- 已扩展统计接口返回的成本维度数据：
  - 统计概览新增 `totalCost`、`avgCostPerOrder`、`costGrowth`
  - 日趋势新增 `cost`
  - 商品排行新增 `cost`
  - 分类/区域统计新增 `cost` 以及成本占比字段
- 当前成本统计口径说明：
  - 统计时按已支付订单明细数量乘以当前 `product_skus.cost_price` 回算成本
  - 由于订单明细表尚未固化下单时成本价，历史订单成本会受后续 SKU 成本价变动影响
- 本次验证已执行：
  - `bun run build` 通过

## 会话更新（2026-04-01）
- 已将商品款号从“全局唯一”改为“允许重复”：
  - `products.product_code` 已去掉唯一约束
  - 已新增迁移脚本：`drizzle/0004_product_code_repeatable.sql`
  - 已补写 `drizzle/meta/_journal.json`，避免部署时迁移文件存在但 journal 缺项
- 已同步调整 SKU 生成策略，避免重复款号后撞上规格唯一约束：
  - 后端保存时的 `product_skus.sku_code` 已改为 `款号-尺码-颜色-P{productId}`
  - 这样可继续保持 SKU 全局唯一，同时允许不同商品复用同一款号
- 已同步放开导入流程中的重复款号校验：
  - 后端导入解析与批量创建不再把“款号已存在 / 同批款号重复”视为错误
  - 仍保留“同一商品内颜色+尺码组合不能重复”的校验
- 本次验证已执行：
  - `bun test` 通过
  - `bun run build` 通过
- 注意：
  - 正式环境上线时，必须同步执行 `drizzle/0004_product_code_repeatable.sql`
  - 历史已存在商品的旧 `sku_code` 不会自动回写为新格式；本次变更只影响之后新建或重新保存过规格的商品

## 会话更新（2026-04-01）
- 已新增管理员/销售角色 v1 机制：
  - 用户角色枚举已扩展支持 `sales`，同时继续兼容历史 `manager/staff`
  - JWT、`/api/auth/login`、`/api/auth/me` 已统一把非管理员角色归一为 `sales`
- 已新增管理员专用销售账号管理接口：
  - `GET /api/auth/users`
  - `POST /api/auth/users`
  - `PUT /api/auth/users/:id`
  - 当前仅允许管理员查看和维护非管理员账号，不支持新增第二个管理员
- 已补上服务端权限收口与数据脱敏：
  - 商品新增/编辑/删除、分类/供应商维护、批量导入、统计接口均已限制为管理员
  - 销售及历史 `manager/staff` 获取商品列表/详情时不再返回 `supplierId`、`supplier`、`costPrice`
  - 小程序 `/api/mobile/product-options` 对非管理员不再返回 `suppliers`
  - 小程序商品创建与图片补传已收口为仅管理员
- 已新增迁移脚本：
  - `drizzle/0003_sales_role.sql`
- 本次验证已执行：
  - `npm run build` 通过
  - `npm test` 通过
- 上线注意：
  - 部署管理员/销售角色功能到正式环境时，必须同步执行 `drizzle/0003_sales_role.sql` 或等价 SQL，先把线上库 `users.role` 枚举扩展为包含 `sales`，否则新增销售账号会因数据库不识别 `sales` 而失败
  - 本次实际发布到生产机时还额外发现：仅新增 `drizzle/0003_sales_role.sql` 不够，必须同时提交 `drizzle/meta/_journal.json` 中的 `0003_sales_role` 条目；否则 `bun run db:migrate` 会在“applying migrations”阶段退出，但不给出清晰错误
  - 本次线上已通过手动执行 `ALTER TABLE users MODIFY COLUMN role enum('admin','sales','manager','staff') ...` 并补写 `__drizzle_migrations` 记录的方式完成兜底，随后后端服务健康恢复

## 会话更新（2026-04-01）
- 已收敛后端锁文件与发布入口的漂移问题：
  - `package.json` 已显式声明 `packageManager=bun@1.3.11`
  - 本地重新执行 `bun install` 后，已把 `openai`、`qcloud-cos-sts` 及其传递依赖写回 `bun.lock`
  - `deploy/release.sh` 已改为在发布前检查工作区是否干净，脏工作区会直接报错退出
  - 后端依赖安装已改为 `bun install --frozen-lockfile`，避免服务器继续改写 `bun.lock`
  - `deploy/release.sh` 已进一步改为仅在检测到 `drizzle/*.sql` 或 `drizzle/meta/*` 变更时才执行 `db:migrate`
  - `deploy/release.sh` 已支持 `admin` / `server` / `all` 三种发布目标，默认仍为 `all`
- 本次验证已执行：
  - `bash -n deploy/release.sh` 通过
  - `bun run build` 通过
  - 已验证“无 migration 文件差异时”为跳过迁移分支
- 注意：
  - 当前生产机 `/var/clothing/server` 仍遗留历史 `bun.lock` 漂移与 stash 记录；下次发布前需先同步本次提交并清理旧漂移，否则会被新的脏工作区检查直接拦下

## 会话更新（2026-03-31）
- 已将后端 AI 商品导入接口推送到远端主分支：
  - 当前提交：`ebaa8a4`
- 已完成生产后端代码更新并验证：
  - 线上后端仓库 `/var/clothing/server` 已更新到 `ebaa8a4`
  - `systemctl is-active clothing-management-server` 返回 `active`
  - `curl http://127.0.0.1:3000/health` 返回成功
  - `curl -i -H 'Host: clothing.chuchu9.cn' http://127.0.0.1/api/auth/me` 返回 `401`
- 本次线上部署遇到两个值得记住的点：
  - `deploy/release.sh` 首次执行前，后端工作区已有 `bun.lock` 本地漂移；本次通过对锁文件改动执行临时 `git stash` 后继续发布
  - `bun run db:migrate` 在“无新增 migration 文件、数据库迁移记录与本地 SQL hash 一致”的情况下仍退出失败
  - 由于本次发布不包含新的 `drizzle/*.sql`，最终采用“跳过本次无必要迁移，手动重启后端并做健康检查”的方式完成上线
  - 后续应单独排查生产机 `drizzle-kit migrate` 的执行异常，并考虑把发布脚本改成：仅在检测到 migration 文件变更时才执行迁移

## 会话更新（2026-03-31）
- 已新增商品批量导入后端接口：
  - `POST /api/products/import/parse-excel`
  - `POST /api/products/import/parse-image`
  - `POST /api/products/import/bulk-create`
- 已新增独立导入服务 `product-import.service.ts`：
  - Excel 已调整为将“表头 + 行数据 + 目标商品结构 + 当前分类/供应商名单”整体交给 AI，由 AI 自行判断字段对应关系并直接输出商品草稿
  - 截图通过 OpenAI-compatible `/chat/completions` 接口识别，要求模型只返回固定 JSON
  - 解析结果统一输出商品草稿和问题列表，不直接落库
  - AI SDK 调用方式已切换为 `openai` 官方 SDK 的 `client.responses.create(...)`，以兼容当前方舟 `responses` 风格接口
- 已落实 v1 导入规则：
  - 仅支持新增商品，不支持覆盖更新
  - 分类缺失会报错并要求人工补选
  - 供应商缺失可在最终提交时批量创建
  - 校验覆盖款号重复、规格组合重复、SKU 编码重复、必填字段缺失
- 已落实批量创建策略：
  - 批量创建前先校验整批草稿
  - 缺失供应商按开关决定是否自动创建
  - 每条商品在独立事务中创建，单条失败不影响整批其他条目
- 新增 AI 导入环境变量约定：
  - `AI_IMPORT_BASE_URL`
  - `AI_IMPORT_API_KEY`
  - `AI_IMPORT_MODEL`
- 本次验证已执行：
  - `npm run build` 通过
  - `npm test` 通过

## 会话更新（2026-03-31）
- 已完成生产环境部署方式切换：
  - `/var/clothing/server` 已切换为标准 git 工作区
  - 远端改为 `https://github.com/luoqaq/clothing-management-server.git`
  - 当前线上后端仓库 HEAD：`e130b7d`
- 已完成登录与 `LIMIT ?` 兼容性修复上线：
  - 认证、商品、订单中的 `.limit(1)` 查询已清理
  - 当前线上 `POST /api/auth/login` 使用默认管理员账号可返回 `200`
- 已更新 `deploy/release.sh`，使其更贴合当前生产机：
  - 前端构建前优先注入 `/usr/local/node20-bin` 到 `PATH`
  - 后端重启不再依赖 `sudo systemctl restart`，改为杀当前 Bun 进程并等待 systemd 自动拉起
- 当前线上后端服务状态：
  - `clothing-management-server` 运行正常
  - `GET http://127.0.0.1:3000/health` 返回成功
- 已确认一次真实线上故障根因并完成代码修复：
  - 现象：`/health` 正常，但登录、商品、分类、订单、统计等所有查库接口同时报错
  - 根因：后端原先使用单个长期存活的 mysql2 连接，无连接池、无自动恢复；老进程的数据库连接失效后，业务查询整体异常，但服务进程仍存活
  - 修复：
    - `src/config/database.ts` 已从单连接切换为 mysql2 连接池
    - 保留 `execute -> query` 的腾讯云 MySQL 兼容处理
    - `src/index.ts` 的 `/health` 已升级为包含数据库探针
  - 排障结论：
    - 生产库本身正常，服务器直连 MySQL 查询 `users` 表正常
    - 同代码旁路进程可正常登录
    - 切换主进程后线上登录恢复
- 注意：
  - 当前服务器从 GitHub 执行 `git pull --ff-only` 在非交互 SSH 会话里出现过卡住现象
  - 但 `git clone`、`git fetch bundle`、站点访问与接口联调均正常
  - 若后续再次出现拉取卡住，优先排查服务器到 GitHub 的网络连通性，不要直接回退成“覆盖目录上传”

## 会话更新（2026-03-27）
- 商品主数据已从“品牌”切换为“供应商”：
  - 新增 `suppliers` 表（`id`、`name`、时间字段）
  - `products` 已改为使用可空 `supplier_id`
  - 本次仅完成模型与接口切换，未对历史商品执行供应商回填
- 商品相关后端接口已同步切换：
  - `GET/POST/PUT/DELETE /api/products/suppliers`
  - 商品列表筛选参数由 `brandId` 改为 `supplierId`
  - 商品详情返回 `supplier`
  - `/api/mobile/product-options` 返回 `suppliers`
- 已新增迁移脚本：`drizzle/0002_product_suppliers.sql`
- 已同步修正 `seed`、mock 数据与商品单测，保留移动端图片更新能力与 JSON 字段兼容逻辑。
- 本次验证已执行：
  - `bun run build` 通过
  - `bun test` 通过
- 注意：由于当前 `.env` 默认连接真实 MySQL，本次未直接执行 `bun run db:migrate`，避免未经确认修改真实库。

## 会话更新（2026-03-23）
- 已新增 ToB 店铺运营小程序后端打通能力，供 `clothing-management-staff-miniapp` 使用。
- 已新增 `/api/mobile` 路由组，覆盖：
  - `POST /auth/login`
  - `GET /auth/me`
  - `POST /auth/logout`
  - `GET /dashboard/summary`
  - `GET /products`
  - `GET /products/:id`
  - `GET /product-options`
  - `POST /products`
  - `PATCH /products/:id/images`
  - `GET /orders`
  - `GET /orders/:id`
  - `POST /orders`
  - `PATCH /orders/:id/status`
  - `POST /orders/:id/ship`
  - `POST /orders/:id/cancel`
- 订单已新增来源字段 `source`，当前来源枚举为：
  - `admin_web`
  - `staff_miniapp`
- 已新增迁移脚本：`drizzle/0001_staff_miniapp_source.sql`
- 商品服务已新增独立图片更新能力：
  - `updateProductImages`
  - 用于小程序补传主图/详情图时避免整单重提
- 已新增角色中间件 `src/middleware/role.middleware.ts`
  - 当前 `manager/admin` 才能通过移动端创建商品或更新商品图片
- 后端验证结果：
  - `bun run build` 通过
  - `bun test` 通过
  - `bun run db:migrate` 已执行成功
  - 本地服务已成功启动并验证以下接口：
    - `GET /health`
    - `POST /api/mobile/auth/login`
    - `GET /api/mobile/products`
    - `GET /api/mobile/product-options`
    - `POST /api/mobile/products`
    - `POST /api/mobile/orders`
    - `POST /api/mobile/orders/:id/cancel`
    - `POST /api/assets/upload-policy`
  - 为联调已创建 1 条测试商品：
    - `productCode=MINIAPP-TEST-001`
  - 为联调已创建并取消 1 条测试订单：
    - 来源 `staff_miniapp`
    - 取消原因为“联调清理测试订单”
  - 已修复商品 JSON 字段兼容性问题：
    - `main_images`
    - `detail_images`
    - `tags`
  - 根因是当前 MySQL 返回 JSON 字段时可能为字符串，旧逻辑仅接受数组，导致移动端更新图片后再次读取会丢失。
  - 现已在 `src/modules/products/products.service.ts` 中统一补充 JSON 字符串解析，复测 `/api/mobile/products/:id/images` 与 `/api/mobile/products/:id` 均正常。

## 会话更新（2026-03-21）
- 已新增商品图片上传能力，采用“前端压缩后直传腾讯云 COS + 后端签发临时上传凭证”的方案。
- 后端新增 `/api/assets/upload-policy`：
  - 需要登录态
  - 当前已接入商品场景：`biz=product`，`scene=main|detail`
  - 使用 `qcloud-cos-sts` 签发临时上传凭证
  - key 规则为 `products/{scene}/{yyyy}/{mm}/{userId}/{uuid}.{ext}`
- 前端商品表单已从“手填图片 URL”切换为上传组件：
  - 选择图片后立即压缩并上传
  - 上传成功后仅把最终 URL 写入 `mainImages` / `detailImages`
  - 保存商品时若仍有图片上传中，会阻止提交
- 图片压缩策略已确定：
  - 优先转 `webp`
  - 主图：最长边 1600px，目标不超过 400KB
  - 详情图：最长边 2000px，目标不超过 700KB
  - 后端最终兜底大小限制由 `COS_UPLOAD_MAX_SIZE_MB` 控制，默认 2MB
- COS 上传链路已在真实资源上验证通过：
  - 当前 Bucket：`product-image-1256374350`
  - 当前 Region：`ap-shanghai`
  - 当前公共访问域名：`https://product-image-1256374350.cos.ap-shanghai.myqcloud.com`
  - 图片可成功上传并可直接访问
- 已新增 COS 相关环境变量模板：
  - `COS_BUCKET`
  - `COS_REGION`
  - `COS_PUBLIC_BASE_URL`
  - `COS_SECRET_ID`
  - `COS_SECRET_KEY`
  - `COS_STS_DURATION_SECONDS`
  - `COS_UPLOAD_MAX_SIZE_MB`
- 当前图片访问方式按“公开读 + CDN/公共域名”设计，本期不自动删除旧图。
- COS 对象 key 路径策略已确认保留：
  - `products/main/{yyyy}/{mm}/{userId}/{uuid}.webp`
  - `products/detail/{yyyy}/{mm}/{userId}/{uuid}.webp`
  - 该层级用于按业务、时间、上传人分层，便于排查、审计与后续清理
- COS 权限问题根因已确认：
  - `PUT 403 AccessDenied` 不是 CORS 问题
  - 实际原因是上传密钥账号缺少目标 Bucket 写权限
  - 补齐 Bucket 写权限后，真实上传恢复正常
- 腾讯云 MySQL 兼容性问题已确认并修复：
  - 当前实例不兼容预处理语句中的 `LIMIT ?`
  - Drizzle/mysql2 默认走 `execute`，会导致大量带 `.limit(...)` 的接口返回 400
  - 已在 `src/config/database.ts` 中将 `execute` 转接到 `query` 以兼容当前实例
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
- 当前数据库模型以真实 MySQL 为准，商品相关开发统一基于 `products + product_skus + suppliers` 三层结构推进。
- 订单相关开发统一基于 SKU 维度建模，订单创建、库存预留、发货扣减都以 `product_skus.id` 为准。
- 资源上传统一按“后端签发临时凭证，前端直传 COS”的模型扩展，不走后端文件中转。
- 图片压缩统一在前端上传前执行，后端只做授权和大小/MIME 兜底校验。
- 腾讯云 MySQL 若继续沿用当前实例，查询兼容性要优先考虑预处理语句限制，尤其是 `LIMIT ?`。

## 已验证接口
- `GET /health` 返回 `{"success":true,"data":"OK"}`
- `POST /api/auth/login` 使用默认管理员账号可登录

## 已知问题与风险
- MySQL `DECIMAL` 字段默认返回字符串。
  - 前端已做归一化处理；后续新增接口仍需考虑此行为。
- 当前增量迁移里，旧 `order_items` 通过 `product_id -> product_skus` 关联回填 SKU。
  - 该方案默认每个旧商品仅迁出一个默认 SKU，适用于本次由单规格模型升级而来的历史数据。
- 退款后是否自动回补库存尚未单独建模。
  - 如果未来需要“退款入库 / 退货质检 / 可售返仓”流程，需要再补独立库存状态设计。
- COS 旧图片当前不会自动回收。
  - 如后续存储量增长明显，需要补“替换/删除商品后的延迟清理任务”。
- 当前上传组件已支持多图上传，但未实现前端拖拽排序。
  - 如后续要求精确控制主图顺序，需要补排序交互与提交顺序同步。

## 最近变更补充
- 统计模块已拆分为 `销售统计` 与 `成本统计` 两组接口。
- 成本统计口径已从“订单成本”调整为“录入成本价视角”，不依赖订单也不依赖当前库存：
  - 总成本 = 所有已录入规格 `cost_price` 汇总
  - 分类成本 = 分类下所有规格 `cost_price` 汇总
  - 商品成本排行 = 按规格返回 `stock / costPrice / totalCost`，其中 `totalCost` 当前等于 `costPrice`，排序按 `costPrice`
- 销售统计仍按已支付订单统计；成本统计与销售统计已明确解耦。
- 统计、客户、订单模块都已补数据库迁移缺失时的兼容读取逻辑，但正式上线这版客户/年龄段/成本快照能力前仍应执行迁移 `drizzle/0005_customer_statistics.sql`。
- 本轮已执行 `bun run build` 与 `bun test` 验证通过。

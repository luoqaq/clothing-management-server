# 服装管理后台后端 - 项目记忆

最近更新：2026-03-20

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

## 已验证接口
- `GET /health` 返回 `{"success":true,"data":"OK"}`
- `POST /api/auth/login` 使用 `admin / admin123` 可登录

## 数据说明（2026-03-20）
- 在当前配置数据库中，`products` 表查询到 2 条数据。
- 如果页面与数据库客户端看到的数据不一致，优先核对 host/port/database 是否一致。

## 已知问题与风险
- MySQL `DECIMAL` 字段默认返回字符串。
  - 前端已做归一化处理；后续新增接口仍需考虑此行为。

## 快速验证
1. 执行 `npm run start`。
2. 执行 `curl http://127.0.0.1:3000/health`。
3. 用 `admin / admin123` 测试登录接口。
4. 确认前端可通过代理读取 `/api/products`。

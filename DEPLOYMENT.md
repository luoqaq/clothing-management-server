# `clothing.chuchu9.cn` 部署说明

本文档对应当前仓库和前端仓库的生产部署，统一部署根目录为 `/var/clothing`。

## 1. 目标拓扑

- `http://clothing.chuchu9.cn/` 提供前端后台页面
- `http://clothing.chuchu9.cn/api/*` 转发到 Bun + Hono 后端
- 前端代码目录：`/var/clothing/admin`
- 后端代码目录：`/var/clothing/server`
- 后端仅监听：`127.0.0.1:3000`
- 数据库：腾讯云 MySQL

## 2. 腾讯云准备

### 2.1 DNS

给 `chuchu9.cn` 增加一条 A 记录：

- 主机记录：`clothing`
- 记录值：CVM 公网 IP

### 2.2 安全组

放通以下端口：

- `22/tcp`：建议仅允许你的管理 IP
- `80/tcp`：允许公网访问
- `443/tcp`：后续补 HTTPS 时再放开

### 2.3 云数据库

- 创建腾讯云 MySQL 实例
- 创建数据库：`clothing_management`
- 创建应用账号，例如 `clothing_app`
- 数据库白名单仅放行当前 CVM 的出口 IP

## 3. 服务器初始化

以下命令按 Ubuntu 22.04 规划：

```bash
sudo apt update
sudo apt install -y nginx git curl unzip nodejs npm
```

创建部署用户和目录：

```bash
sudo useradd -m -s /bin/bash clothing || true
sudo mkdir -p /var/clothing
sudo chown -R clothing:clothing /var/clothing
```

以 `clothing` 用户安装 Bun：

```bash
sudo -u clothing bash -lc "curl -fsSL https://bun.sh/install | bash"
```

## 4. 拉取代码

分别拉取两个仓库：

```bash
sudo -u clothing git clone <你的前端仓库地址> /var/clothing/admin
sudo -u clothing git clone <你的后端仓库地址> /var/clothing/server
```

如果仓库已存在，后续更新直接执行：

```bash
sudo -u clothing git -C /var/clothing/admin pull --ff-only
sudo -u clothing git -C /var/clothing/server pull --ff-only
```

## 5. 后端配置与启动

复制环境变量模板：

```bash
sudo -u clothing cp /var/clothing/server/.env.production.example /var/clothing/server/.env
sudo -u clothing vim /var/clothing/server/.env
```

生产环境至少确认这些值已改成真实配置：

- `HOST=127.0.0.1`
- `PORT=3000`
- `NODE_ENV=production`
- `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`
- `JWT_SECRET`
- `CORS_ORIGIN=http://clothing.chuchu9.cn`
- 全量 `COS_*`

安装依赖并初始化数据库：

```bash
sudo -u clothing bash -lc "cd /var/clothing/server && /home/clothing/.bun/bin/bun install"
sudo -u clothing bash -lc "cd /var/clothing/server && npm run db:check-sql"
sudo -u clothing bash -lc "cd /var/clothing/server && npm run db:apply-sql -- drizzle/0000_spicy_guardian.sql"
sudo -u clothing bash -lc "cd /var/clothing/server && /home/clothing/.bun/bin/bun run db:seed"
```

说明：

- 生产环境默认采用“显式 SQL migration”策略，不再依赖 `bun run db:migrate`
- 日常开发仍可使用 Drizzle 生成 `drizzle/*.sql`
- 上线时先用 `npm run db:check-sql` 检查待执行文件
- 再显式执行对应 SQL：`npm run db:apply-sql -- drizzle/000x.sql`
- 该脚本会在 SQL 执行成功后自动补写 `__drizzle_migrations`

安装 systemd 服务：

```bash
sudo cp /var/clothing/server/deploy/systemd/clothing-management-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable clothing-management-server
sudo systemctl start clothing-management-server
sudo systemctl status clothing-management-server --no-pager
```

## 6. 前端构建

前端生产环境默认走 `/api`，直接构建即可：

```bash
sudo -u clothing bash -lc "cd /var/clothing/admin && npm install"
sudo -u clothing bash -lc "cd /var/clothing/admin && npm run build"
```

构建后静态文件目录为 `/var/clothing/admin/dist`。

## 7. Nginx 配置

当前生产机是 OpenCloudOS，Nginx 实际使用 `/etc/nginx/conf.d/*.conf`，不要再按 Debian/Ubuntu 的 `sites-available` / `sites-enabled` 目录去放配置。

先安装 HTTP 版站点配置：

```bash
sudo cp /var/clothing/server/deploy/nginx/clothing.chuchu9.cn.conf /etc/nginx/conf.d/clothing.chuchu9.cn.conf
sudo nginx -t
sudo systemctl reload nginx
```

这份配置会：

- 将根路径指向 `/var/clothing/admin/dist`
- 将 `/api/` 反代到 `127.0.0.1:3000`
- 用 `try_files` 兜底前端路由

## 8. 验证

先检查后端健康接口：

```bash
curl -I http://clothing.chuchu9.cn
curl http://127.0.0.1:3000/health
curl http://clothing.chuchu9.cn/api/auth/me
```

浏览器侧验证：

- 打开 `http://clothing.chuchu9.cn`
- 登录后台
- 刷新商品、订单、统计页面，确认没有 404
- 测试图片上传接口

日志排查命令：

```bash
sudo journalctl -u clothing-management-server -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/access.log
sudo tail -n 100 /var/log/nginx/error.log
```

## 9. 后续发版

如果数据库迁移文件已经纳入版本库，后续发版可直接执行：

```bash
sudo bash /var/clothing/server/deploy/release.sh
```

也支持按目标发布：

```bash
sudo bash /var/clothing/server/deploy/release.sh admin
sudo bash /var/clothing/server/deploy/release.sh server
sudo bash /var/clothing/server/deploy/release.sh all
```

- `admin`：只更新前端并重新构建
- `server`：只更新后端；如检测到 migration 变更，会中断并提示先手动执行 SQL migration
- `all`：按“前端 -> 后端”执行完整发版；默认值也是 `all`

推荐发版顺序：

1. `git pull --ff-only`
2. `npm run db:check-sql`
3. `npm run db:apply-sql -- drizzle/000x.sql`
4. `bash deploy/release.sh server`
5. `bash deploy/release.sh admin`

## 10. HTTPS

当前仓库中的 `deploy/nginx/clothing.chuchu9.cn.conf` 已是 HTTPS 版模板，包含：

- `80 -> 443` 强制跳转
- `/.well-known/acme-challenge/` 保留给 Let's Encrypt HTTP 校验
- `443 ssl http2`
- `/api/` 继续反代到 `127.0.0.1:3000`

线上落地顺序：

1. 在腾讯云安全组放行 `443/tcp`
2. 先保持域名 `clothing.chuchu9.cn` 指向当前服务器
3. 安装证书工具并签发证书
4. 覆盖 `/etc/nginx/conf.d/clothing.chuchu9.cn.conf`
5. `nginx -t && systemctl reload nginx`
6. 验证公网 `https://clothing.chuchu9.cn`

OpenCloudOS 上推荐命令：

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot certonly --webroot -w /var/clothing/admin/dist -d clothing.chuchu9.cn
sudo cp /var/clothing/server/deploy/nginx/clothing.chuchu9.cn.conf /etc/nginx/conf.d/clothing.chuchu9.cn.conf
sudo nginx -t
sudo systemctl reload nginx
curl -I https://clothing.chuchu9.cn
curl -I https://clothing.chuchu9.cn/api/auth/me
```

证书路径按 Certbot 默认值写在模板里：

```text
/etc/letsencrypt/live/clothing.chuchu9.cn/fullchain.pem
/etc/letsencrypt/live/clothing.chuchu9.cn/privkey.pem
```

如果后续前端或浏览器直接跨域访问后端，再把后端 `.env` 里的 `CORS_ORIGIN` 调整为：

```env
CORS_ORIGIN=https://clothing.chuchu9.cn
```

然后重启后端服务。当前前端生产环境走同源 `/api` 代理，单就后台站点本身而言，这一步通常不阻塞 HTTPS 切换。

# MySQL 安装和配置脚本执行指南

## 脚本概述

本指南描述了如何使用提供的脚本在 macOS 和 Linux 系统上一键安装 MySQL、创建数据库和数据表。

## 脚本文件

- `setup-mysql-mac.sh` - 适用于 macOS 系统
- `setup-mysql-linux.sh` - 适用于 Linux 系统（Ubuntu/Debian）

## 脚本功能

1. **MySQL 安装检查**：如果 MySQL 未安装，则自动安装
2. **服务状态检查**：确保 MySQL 服务正在运行
3. **密码设置**：检查并设置 MySQL root 用户密码
4. **数据库创建**：检查并创建 `clothing_management` 数据库
5. **数据表创建**：检查并创建所有必要的数据表
6. **数据初始化**：检查并初始化示例数据

## 执行步骤

### macOS 系统

1. 打开终端，进入项目目录：
   ```bash
   cd /Users/luo/Project/clothing-management-server
   ```

2. 给脚本添加执行权限：
   ```bash
   chmod +x setup-mysql-mac.sh
   ```

3. 执行脚本：
   ```bash
   ./setup-mysql-mac.sh
   ```

### Linux 系统

1. 打开终端，进入项目目录：
   ```bash
   cd /Users/luo/Project/clothing-management-server
   ```

2. 给脚本添加执行权限：
   ```bash
   chmod +x setup-mysql-linux.sh
   ```

3. 执行脚本：
   ```bash
   ./setup-mysql-linux.sh
   ```

## 执行结果

脚本执行完成后，会显示以下信息：

- MySQL 安装和配置状态
- 数据库连接信息
- 执行结果和提示

## 数据库连接信息

默认连接信息：

- **主机**：localhost
- **端口**：3306
- **用户**：root
- **密码**：password
- **数据库**：clothing_management

## 注意事项

1. **权限要求**：
   - macOS 系统：需要有 Homebrew 安装权限
   - Linux 系统：需要 sudo 权限

2. **网络要求**：
   - 安装过程需要网络连接，用于下载 MySQL 及相关依赖

3. **时间要求**：
   - 首次安装可能需要较长时间，取决于网络速度和系统性能

4. **错误处理**：
   - 脚本会在遇到错误时停止执行并显示错误信息
   - 请根据错误信息解决问题后重新执行脚本

5. **重复执行**：
   - 脚本具有幂等性，重复执行不会导致重复操作
   - 如果 MySQL 已安装、数据库已创建、数据表已存在，脚本会跳过相应步骤

## 手动配置

如果需要手动配置数据库连接信息，请修改 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=clothing_management
```

## 故障排查

1. **MySQL 安装失败**：
   - 检查网络连接
   - 检查系统权限
   - 尝试手动安装 MySQL

2. **数据库连接失败**：
   - 检查 MySQL 服务是否正在运行
   - 检查用户名和密码是否正确
   - 检查数据库是否存在

3. **数据表创建失败**：
   - 检查 MySQL 权限
   - 检查 Drizzle ORM 配置
   - 尝试手动运行 `bunx drizzle-kit push` 命令

4. **数据初始化失败**：
   - 检查数据库连接
   - 检查数据表结构是否正确
   - 尝试手动运行 `bun run src/db/seed.ts` 命令

## 联系支持

如果遇到无法解决的问题，请联系系统管理员或技术支持。
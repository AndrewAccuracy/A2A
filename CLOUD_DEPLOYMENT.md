# 云服务器部署指南

## 前端服务器在云服务器上运行

### 方法一：使用启动脚本（推荐）

```bash
./start_frontend_cloud.sh
```

### 方法二：直接使用 npm 命令

```bash
cd frontend
npm run dev:cloud
```

### 方法三：生产模式

```bash
cd frontend
npm run build
npm run start:cloud
```

## 重要配置说明

### 1. 防火墙配置

确保云服务器的防火墙已开放 3000 端口：

**阿里云/腾讯云：**
- 在安全组规则中添加：端口 3000，协议 TCP，允许访问

**AWS：**
- 在 Security Groups 中添加 Inbound Rule：Port 3000, Protocol TCP

**其他云服务商：**
- 在防火墙设置中开放 3000 端口

### 2. 访问方式

启动后，可以通过以下方式访问：
- `http://你的云服务器IP:3000`
- `http://你的域名:3000`（如果配置了域名）

### 3. SSH 隧道（可选，更安全）

如果你不想直接暴露端口，可以使用 SSH 隧道：

```bash
# 在本地机器上执行
ssh -L 3000:localhost:3000 用户名@云服务器IP

# 然后在云服务器上正常启动（使用 npm run dev）
# 本地访问 http://localhost:3000
```

### 4. 使用 PM2 保持运行（推荐用于生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 使用 PM2 启动
cd frontend
pm2 start npm --name "frontend" -- run dev:cloud

# 查看状态
pm2 status

# 查看日志
pm2 logs frontend

# 停止
pm2 stop frontend
```

## 端口自定义

如果需要使用其他端口，可以修改 `package.json` 中的端口号，或者直接使用：

```bash
cd frontend
next dev --turbopack -H 0.0.0.0 -p 你的端口号
```

## 注意事项

1. **安全性**：开发模式不建议直接暴露在公网，建议使用 SSH 隧道或配置反向代理（如 Nginx）
2. **HTTPS**：生产环境建议配置 HTTPS，可以使用 Nginx 反向代理 + Let's Encrypt
3. **性能**：生产环境建议使用 `npm run build` 构建后再运行


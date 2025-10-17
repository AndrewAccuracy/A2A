# API端点连接检查

## 前端调用的API端点 vs 后端实现

### 服务器包装器 (server_wrapper.py - 端口9998)

| 前端调用 | 后端实现 | 状态 |
|---------|---------|------|
| `GET /status` | `@app.get("/status")` | ✅ 已实现 |
| `POST /start` | `@app.post("/start")` | ✅ 已实现 |
| `POST /stop` | `@app.post("/stop")` | ✅ 已实现 |
| `GET /` | `@app.get("/")` | ✅ 已实现 |

### 客户端包装器 (client_wrapper.py - 端口8889)

| 前端调用 | 后端实现 | 状态 |
|---------|---------|------|
| `POST /save_secret` | `@app.post("/save_secret")` | ✅ 已实现 |
| `POST /start` | `@app.post("/start")` | ✅ 已实现 |
| `POST /stop` | `@app.post("/stop")` | ✅ 已实现 |
| `GET /status` | `@app.get("/status")` | ✅ 已实现 |
| `GET /` | `@app.get("/")` | ✅ 已实现 |

## 修复的问题

### ❌ 之前的问题
- `handleStartCovertCommunication` 函数尝试连接 `http://localhost:8000/api/start-communication`
- 这个端点在后端不存在

### ✅ 修复后
- 现在正确连接到 `http://localhost:8889/save_secret` 和 `http://localhost:8889/start`
- 所有API调用都有对应的后端实现

## 完整的API流程

### 1. 服务器控制流程
```
前端 → server_wrapper.py (9998端口)
├── GET /status - 检查服务器状态
├── POST /start - 启动A2A服务器
└── POST /stop - 停止A2A服务器
```

### 2. 隐蔽通信流程
```
前端 → client_wrapper.py (8889端口)
├── POST /save_secret - 保存隐蔽信息
├── POST /start - 启动隐蔽通信
└── POST /stop - 停止隐蔽通信
```

### 3. 系统重置流程
```
前端 → 多个API调用
├── client_wrapper.py: POST /stop - 停止客户端通信
├── server_wrapper.py: POST /stop - 停止服务器
├── server_wrapper.py: POST /start - 重启服务器
└── server_wrapper.py: GET /status - 检查最终状态
```

## 端口分配

| 服务 | 端口 | 用途 |
|------|------|------|
| 前端 (Next.js) | 3000 | 用户界面 |
| 服务器包装器 | 9998 | A2A服务器控制API |
| 客户端包装器 | 8889 | 隐蔽通信控制API |
| A2A服务器 | 9999 | 实际的A2A服务器进程 |

## 验证方法

运行测试脚本验证所有连接：
```bash
python test_api_connection.py
```

## 潜在问题检查

### ✅ 已解决的问题
1. 所有API端点都有对应的后端实现
2. 端口配置正确
3. 错误处理完善
4. 状态同步正常

### ⚠️ 需要注意的问题
1. 确保所有后端服务都在运行
2. 模型路径需要根据实际环境调整
3. 文件路径需要确保存在
4. 网络连接稳定

## 启动顺序建议

1. 启动服务器包装器: `python server_wrapper.py`
2. 启动客户端包装器: `python client_wrapper.py`
3. 启动前端: `cd frontend && npm run dev`
4. 通过前端界面启动A2A服务器

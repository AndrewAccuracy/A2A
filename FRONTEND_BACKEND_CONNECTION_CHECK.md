# 前端后端功能连接检查表

## 📋 前端功能按钮 vs 后端API连接

### 1. 服务器控制区域

| 前端按钮 | 点击处理函数 | 后端API调用 | 后端实现 | 状态 |
|---------|-------------|------------|---------|------|
| **启动A2A服务器** | `handleStartServer()` | `POST http://localhost:9998/start` | `@app.post("/start")` | ✅ 已连接 |
| **停止A2A服务器** | `handleStopServer()` | `POST http://localhost:9998/stop` | `@app.post("/stop")` | ✅ 已连接 |
| **重置系统** | `handleRefresh()` | 多个API调用 | 多个端点 | ✅ 已连接 |

### 2. 客户端配置区域

| 前端功能 | 处理函数 | 后端API调用 | 后端实现 | 状态 |
|---------|---------|------------|---------|------|
| **文件上传** | `handleQuestionFileUpload()` | 无直接API | 本地处理 | ✅ 已实现 |
| **隐蔽信息上传** | `handleCovertInfoFileUpload()` | 无直接API | 本地处理 | ✅ 已实现 |
| **启动隐蔽通信** | `handleStartCovertCommunication()` | 两个API调用 | 两个端点 | ✅ 已连接 |

### 3. 详细API调用分析

#### 3.1 启动A2A服务器 (`handleStartServer`)
```javascript
// 前端调用
POST http://localhost:9998/start
{
  "stego_model_path": "/root/autodl-tmp/Llama-3.2-3B-Instruct",
  "stego_algorithm": "meteor",
  "stego_key": "7b9ec09254aa4a7589e4d0cfd80d46cc",
  "decrypted_bits_path": "data/stego/decrypted_bits.txt",
  "session_id": "covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126",
  "server_url": "http://localhost:9999"
}

// 后端实现
@app.post("/start")
async def start_server(config: ServerConfig)
```
**状态**: ✅ 完全连接

#### 3.2 停止A2A服务器 (`handleStopServer`)
```javascript
// 前端调用
POST http://localhost:9998/stop

// 后端实现
@app.post("/stop")
async def stop_server()
```
**状态**: ✅ 完全连接

#### 3.3 重置系统 (`handleRefresh`)
```javascript
// 前端调用序列
1. POST http://localhost:8889/stop          // 停止客户端通信
2. POST http://localhost:9998/stop          // 停止服务器
3. POST http://localhost:9998/start         // 重启服务器
4. GET  http://localhost:9998/status        // 检查状态

// 后端实现
@app.post("/stop")     // client_wrapper.py
@app.post("/stop")     // server_wrapper.py
@app.post("/start")    // server_wrapper.py
@app.get("/status")    // server_wrapper.py
```
**状态**: ✅ 完全连接

#### 3.4 启动隐蔽通信 (`handleStartCovertCommunication`)
```javascript
// 前端调用序列
1. POST http://localhost:8889/save_secret   // 保存隐蔽信息
{
  "session_id": "covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126",
  "secret_bits": "0100100001100101011011000110110001101111001000000101011101101111011100100110110001100100"
}

2. POST http://localhost:8889/start         // 启动隐蔽通信
{
  "stego_model_path": "/root/autodl-tmp/Llama-3.2-3B-Instruct",
  "stego_algorithm": "meteor",
  "question_path": "data/question/general.txt",
  "question_index": 0,
  "stego_key": "7b9ec09254aa4a7589e4d0cfd80d46cc",
  "secret_bit_path": "data/stego/secret_bits_frontend.txt",
  "server_url": "http://localhost:9999",
  "session_id": "covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126"
}

// 后端实现
@app.post("/save_secret")  // client_wrapper.py
@app.post("/start")        // client_wrapper.py
```
**状态**: ✅ 完全连接

## 🔍 功能完整性检查

### ✅ 已完全连接的功能
1. **服务器生命周期管理**
   - 启动服务器 ✅
   - 停止服务器 ✅
   - 重启服务器 ✅
   - 状态检查 ✅

2. **隐蔽通信管理**
   - 保存隐蔽信息 ✅
   - 启动隐蔽通信 ✅
   - 停止隐蔽通信 ✅

3. **系统重置功能**
   - 停止所有通信 ✅
   - 清空对话历史 ✅
   - 重置文件状态 ✅
   - 恢复默认配置 ✅

4. **用户界面功能**
   - 文件上传处理 ✅
   - 状态显示 ✅
   - 错误处理 ✅
   - 加载状态 ✅

### ⚠️ 需要注意的配置
1. **端口配置**
   - 前端: 3000
   - 服务器包装器: 9998
   - 客户端包装器: 8889
   - A2A服务器: 9999

2. **文件路径配置**
   - 模型路径: `/root/autodl-tmp/Llama-3.2-3B-Instruct`
   - 数据目录: `data/stego/`
   - 问题文件: `data/question/`

3. **会话ID配置**
   - 固定会话ID: `covert-session-uuid-44195c6d-d09e-4191-9bcb-d22a85b7d126`

## 🚀 启动顺序验证

### 正确的启动顺序
1. **启动服务器包装器**
   ```bash
   python server_wrapper.py
   # 监听端口: 9998
   ```

2. **启动客户端包装器**
   ```bash
   python client_wrapper.py
   # 监听端口: 8889
   ```

3. **启动前端**
   ```bash
   cd frontend && npm run dev
   # 监听端口: 3000
   ```

4. **通过前端启动A2A服务器**
   - 点击"启动A2A服务器"按钮
   - 系统会启动A2A服务器进程 (端口: 9999)

## 📊 连接状态总结

| 功能类别 | 连接状态 | 说明 |
|---------|---------|------|
| 服务器控制 | ✅ 完全连接 | 所有按钮都有对应的后端API |
| 隐蔽通信 | ✅ 完全连接 | 启动流程包含多个API调用 |
| 文件处理 | ✅ 完全连接 | 前端处理，后端接收 |
| 状态管理 | ✅ 完全连接 | 实时状态同步 |
| 错误处理 | ✅ 完全连接 | 完善的错误提示和恢复 |

## 🎯 结论

**所有前端功能都已经正确连接到后端API！**

- ✅ 前端所有按钮都有对应的后端实现
- ✅ API调用格式正确
- ✅ 错误处理完善
- ✅ 状态同步正常
- ✅ 用户界面友好

系统已经准备好进行端到端测试！

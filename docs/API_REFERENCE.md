# 智学AI API 参考文档

> 在线文档: `/docs/api` | OpenAPI 规范: `public/openapi.yaml`

## 认证

所有 API 调用需要认证。支持两种方式：

### Session 认证（Web 端）
自动使用 NextAuth JWT Session Cookie。

### API Key 认证（第三方调用）
在请求头中携带：
```
X-API-Key: sk-edu-xxxxxxxx-xxxxxxxxxxxxxx
```
或
```
Authorization: Bearer sk-edu-xxxxxxxx-xxxxxxxxxxxxxx
```

---

## API 端点一览

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/[...nextauth]` | NextAuth 登录 |

---

### AI 辅导

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/chat` | AI 苏格拉底式对话 |
| GET | `/api/ai/conversations` | 获取对话列表 |
| GET | `/api/ai/keys` | 获取 API Key 列表 |
| POST | `/api/ai/keys` | 创建 API Key |
| DELETE | `/api/ai/keys/[id]` | 吊销 API Key |

#### POST /api/ai/chat
```json
{
  "subject": "math",
  "message": "3x + 7 = 22 怎么解？",
  "conversationId": "uuid (可选)"
}
```
响应:
```json
{
  "response": "我们先来想一想...",
  "stage": "diagnostic",
  "conversationId": "uuid",
  "safe": true,
  "model": { "provider": "deepseek", "model": "deepseek-chat" }
}
```

---

### LLM 代理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/llm-api/chat` | API Key | LLM 代理对话（OpenAI 兼容） |
| GET | `/llm-api/models` | API Key | 可用模型列表 |

#### POST /llm-api/chat
```json
{
  "model": "deepseek-chat",
  "messages": [
    { "role": "user", "content": "解释二次函数" }
  ],
  "stream": false
}
```
响应含 `X-Usage-Cost` 和 `X-Balance-Remaining` 头。

---

### 题库

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/questions` | 获取题目列表（分页/筛选） |
| POST | `/api/questions/submit` | 提交答案 |
| GET | `/api/questions/search` | 搜索题目 |

#### GET /api/questions
参数: `subject`, `difficulty`, `page`, `limit`

---

### 计费

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/billing/balance` | 查询余额 |
| GET | `/api/billing/usage` | 查询用量统计 |
| POST | `/api/billing/recharge` | 发起充值 |
| POST | `/api/billing/recharge/callback` | 支付回调 |

---

### 游戏系统

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/game/xp` | XP 操作 |
| GET | `/api/game/daily-challenge` | 每日挑战 |
| GET | `/api/game/leaderboard` | 排行榜 |

---

### 学习数据

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/home-stats` | 首页聚合数据 |
| GET | `/api/user/balance` | 用户余额 |
| GET | `/api/user/profile` | 用户资料 |
| GET | `/api/knowledge-graph` | 知识图谱 |
| GET | `/api/analytics/report` | 学习报告 |
| GET | `/api/error-notes` | 错题本 |
| POST | `/api/error-notes/[id]/review` | 错题复习 |

---

### 安全

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/safety/check` | 内容安全检测 |

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / API Key 无效 |
| 402 | 余额不足，请充值 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |
| 503 | 服务暂时不可用 |

---

## 速率限制

| 维度 | 限制 | 周期 |
|------|------|------|
| 单 API Key | 120 次 | 每分钟 |
| 单 IP | 300 次 | 每分钟 |
| 全局 | 10000 次 | 每分钟 |

触发限流时返回 429，响应头包含 `Retry-After`、`X-RateLimit-Limit`、`X-RateLimit-Remaining`。

## 计费定价

| 模型 | 输入 (¥/千Token) | 输出 (¥/千Token) |
|------|-------------------|-------------------|
| deepseek-chat | 0.001 | 0.002 |
| deepseek-reasoner | 0.002 | 0.008 |
| qwen-turbo | 0.001 | 0.002 |
| gpt-4o-mini | 0.0015 | 0.006 |
| ollama (本地) | 0 | 0 |

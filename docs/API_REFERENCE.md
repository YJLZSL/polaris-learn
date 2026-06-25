# 智学AI API 参考文档

> 在线文档: `/docs/api` | OpenAPI 规范: `public/openapi.yaml`

## 认证

所有 API 调用需要认证，统一使用 NextAuth JWT Session Cookie（Web 端自动携带）。本平台不提供 API Key 网关，所有大模型调用由用户在「设置」页面配置的 Key 完成。

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

### 题库

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/questions` | 获取题目列表（分页/筛选） |
| POST | `/api/questions/submit` | 提交答案 |
| GET | `/api/questions/search` | 搜索题目 |

#### GET /api/questions
参数: `subject`, `difficulty`, `page`, `limit`

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
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |
| 503 | 服务暂时不可用 |

---

## 速率限制

限流采用纯内存实现（无外部依赖），按用户与 IP 维度统计：

| 维度 | 限制 | 周期 |
|------|------|------|
| 单用户 | 120 次 | 每分钟 |
| 单 IP | 300 次 | 每分钟 |
| 全局 | 10000 次 | 每分钟 |

触发限流时返回 429，响应头包含 `Retry-After`、`X-RateLimit-Limit`、`X-RateLimit-Remaining`。

> 注：大模型调用产生的费用由用户自带的 API Key 直接与其 LLM 供应商结算，本平台不参与计费。

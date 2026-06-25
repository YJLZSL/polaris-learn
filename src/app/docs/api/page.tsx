"use client";

import Link from "next/link";
import { useState } from "react";
import {
  HiChevronDown,
  HiArrowLeft,
  HiClipboardDocument,
  HiCheckCircle,
} from "react-icons/hi2";

/* ============================================================
   辅助函数
   ============================================================ */

function copyText(text: string, cb: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    cb(true);
    setTimeout(() => cb(false), 2000);
  });
}

const methodColors: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800",
  PATCH: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-200 dark:border-purple-800",
};

/* ============================================================
   Type
   ============================================================ */

type Param = {
  name: string;
  location: string;
  type: string;
  required: boolean;
  desc: string;
  defaultV?: string;
};

type BodyField = {
  name: string;
  type: string;
  required: boolean;
  desc: string;
};

type RespExample = {
  code: string;
  desc: string;
  example: string;
};

type EndpointDef = {
  method: string;
  path: string;
  summary: string;
  description: string;
  auth: "session" | "apiKey" | "none";
  params?: Param[];
  bodyFields?: BodyField[];
  bodyExample?: string;
  responses: RespExample[];
};

type Group = {
  id: string;
  icon: string;
  name: string;
  description: string;
  endpoints: EndpointDef[];
};

/* ============================================================
   API Data
   ============================================================ */

const groups: Group[] = [
  {
    id: "auth",
    icon: "🔑",
    name: "Auth · 认证",
    description: "用户注册和认证相关接口",
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/register",
        summary: "用户注册",
        description: "创建新用户账号，自动生成初始 API Key。",
        auth: "none",
        bodyFields: [
          { name: "name", type: "string", required: true, desc: "用户姓名" },
          { name: "email", type: "string", required: true, desc: "邮箱地址" },
          { name: "password", type: "string", required: true, desc: "密码（至少6位）" },
          { name: "grade", type: "string", required: false, desc: "年级" },
          { name: "role", type: "string", required: false, desc: "student / teacher，默认 student" },
        ],
        bodyExample: `{
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "password123",
  "grade": "初三",
  "role": "student"
}`,
        responses: [
          { code: "200", desc: "注册成功", example: `{ "id": "user_abc123", "name": "张三", "email": "zhangsan@example.com", "grade": "初三", "role": "student" }` },
          { code: "400", desc: "参数校验失败", example: `{ "error": "姓名不能为空" }` },
          { code: "409", desc: "邮箱已被注册", example: `{ "error": "该邮箱已被注册" }` },
        ],
      },
    ],
  },
  {
    id: "ai-tutoring",
    icon: "✨",
    name: "AI Tutoring · AI辅导",
    description: "苏格拉底式教学对话、会话管理与 API Key 管理",
    endpoints: [
      {
        method: "POST",
        path: "/api/ai/chat",
        summary: "AI 辅导对话",
        description: "向 AI 老师发送消息，获取苏格拉底式教学辅导。支持多轮会话记忆，通过 conversationId 继续已有对话。\n教学阶段：diagnostic → clarification → hypothesis → reasoning → reflection → verification → guide",
        auth: "session",
        bodyFields: [
          { name: "message", type: "string", required: true, desc: "用户消息内容" },
          { name: "conversationId", type: "string", required: false, desc: "对话ID，继续已有对话" },
          { name: "subject", type: "string", required: false, desc: "学科" },
          { name: "stream", type: "boolean", required: false, desc: "是否流式响应，默认 false" },
        ],
        bodyExample: `{ "message": "请帮我理解勾股定理", "subject": "数学" }`,
        responses: [
          { code: "200", desc: "AI 回复", example: `{ "id": "msg_xyz789", "conversationId": "conv_abc123", "role": "assistant", "content": "好的，让我们从勾股定理的基本定义开始...", "stage": "diagnostic", "tokens": { "input": 45, "output": 98 }, "cost": 0.0002 }` },
          { code: "400", desc: "参数错误", example: `{ "error": "消息内容不能为空" }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
          { code: "402", desc: "余额不足", example: `{ "error": "余额不足，请充值后重试" }` },
        ],
      },
      {
        method: "GET",
        path: "/api/ai/conversations",
        summary: "获取对话列表",
        description: "获取当前用户的 AI 对话历史，支持状态筛选和分页。",
        auth: "session",
        params: [
          { name: "status", location: "query", type: "string", required: false, desc: "active / completed" },
          { name: "limit", location: "query", type: "integer", required: false, desc: "每页数量（最大50）", defaultV: "20" },
          { name: "offset", location: "query", type: "integer", required: false, desc: "偏移量", defaultV: "0" },
        ],
        responses: [
          { code: "200", desc: "对话列表", example: `{ "conversations": [{ "id": "conv_abc123", "subject": "数学", "title": "勾股定理学习", "status": "active", "lastMessage": { "role": "assistant", "content": "很好，你已经理解了...", "createdAt": "2026-05-07T10:30:00Z" }, "createdAt": "2026-05-07T10:00:00Z", "updatedAt": "2026-05-07T10:30:00Z" }], "total": 25, "limit": 20, "offset": 0 }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
        ],
      },
      {
        method: "GET",
        path: "/api/ai/keys",
        summary: "获取 API Key 列表",
        description: "获取当前用户的所有虚拟 API Key（不含完整密钥）。",
        auth: "session",
        responses: [
          { code: "200", desc: "Key 列表", example: `{ "keys": [{ "id": "key_abc123", "name": "我的API Key", "prefix": "sk-edu-a1b2c3", "status": "active", "rateLimitRpm": 50, "createdAt": "2026-05-01T08:00:00Z", "lastUsedAt": "2026-05-07T09:30:00Z", "revokedAt": null }] }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
        ],
      },
      {
        method: "POST",
        path: "/api/ai/keys",
        summary: "创建 API Key",
        description: "创建新的虚拟 API Key。完整 Key 仅在创建时返回一次，请妥善保管。格式：sk-edu-{6hex}-{32hex}",
        auth: "session",
        bodyFields: [
          { name: "name", type: "string", required: true, desc: "API Key 名称" },
          { name: "rateLimitRpm", type: "integer", required: false, desc: "每分钟请求限制，默认 50" },
        ],
        bodyExample: `{ "name": "我的API Key", "rateLimitRpm": 50 }`,
        responses: [
          { code: "200", desc: "创建成功", example: `{ "id": "key_abc123", "name": "我的API Key", "prefix": "sk-edu-a1b2c3", "rawKey": "sk-edu-a1b2c3-d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9", "status": "active", "rateLimitRpm": 50, "createdAt": "2026-05-07T10:00:00Z" }` },
          { code: "400", desc: "参数错误", example: `{ "error": "请为API Key命名" }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
        ],
      },
      {
        method: "DELETE",
        path: "/api/ai/keys/{id}",
        summary: "撤销 API Key",
        description: "软删除指定 API Key，撤销后无法再使用。",
        auth: "session",
        params: [
          { name: "id", location: "path", type: "string", required: true, desc: "API Key ID", defaultV: "key_abc123" },
        ],
        responses: [
          { code: "200", desc: "撤销成功", example: `{ "id": "key_abc123", "name": "我的API Key", "prefix": "sk-edu-a1b2c3", "status": "revoked", "revokedAt": "2026-05-07T12:00:00Z" }` },
          { code: "403", desc: "无权操作", example: `{ "error": "无权操作此Key" }` },
          { code: "404", desc: "Key 不存在", example: `{ "error": "Key不存在" }` },
        ],
      },
    ],
  },
  {
    id: "llm-proxy",
    icon: "📦",
    name: "LLM Proxy · LLM代理",
    description: "OpenAI 兼容的公开 LLM 接口，多模型聚合",
    endpoints: [
      {
        method: "POST",
        path: "/llm-api/chat",
        summary: "LLM 聊天补全（OpenAI 兼容）",
        description: "公开LLM代理接口，兼容 OpenAI Chat Completions API。使用 API Key 认证，支持 Provider 健康检查和故障转移。\n支持的 Provider：deepseek、qwen、openai、ollama、custom",
        auth: "apiKey",
        bodyFields: [
          { name: "model", type: "string", required: true, desc: "模型名称，如 deepseek-chat" },
          { name: "messages", type: "array", required: true, desc: "消息列表 [{role, content}]" },
          { name: "stream", type: "boolean", required: false, desc: "是否流式响应，默认 false" },
          { name: "temperature", type: "number", required: false, desc: "0-2，默认 0.7" },
          { name: "max_tokens", type: "integer", required: false, desc: "最大 token 数，默认 2048" },
        ],
        bodyExample: `{
  "model": "deepseek-chat",
  "messages": [
    { "role": "system", "content": "你是一位专业的数学老师。" },
    { "role": "user", "content": "请解释什么是微积分？" }
  ],
  "temperature": 0.7,
  "max_tokens": 2048
}`,
        responses: [
          { code: "200", desc: "补全结果", example: `{ "id": "chatcmpl-abc123", "object": "chat.completion", "created": 1746600000, "model": "deepseek-chat", "choices": [{ "index": 0, "message": { "role": "assistant", "content": "微积分是数学的一个分支..." }, "finish_reason": "stop" }], "usage": { "prompt_tokens": 45, "completion_tokens": 200, "total_tokens": 245, "cost": 0.0006 } }` },
          { code: "401", desc: "API Key 无效", example: `{ "error": "Invalid API key" }` },
          { code: "402", desc: "余额不足", example: `{ "error": "余额不足，请充值后重试" }` },
          { code: "429", desc: "频率超限", example: `{ "error": "请求频率过高，请稍后重试" }` },
        ],
      },
      {
        method: "GET",
        path: "/llm-api/models",
        summary: "获取可用模型列表",
        description: "返回所有健康 Provider 的可用模型及定价信息。",
        auth: "apiKey",
        responses: [
          { code: "200", desc: "模型列表", example: `{ "providers": [{ "name": "deepseek", "healthy": true, "models": [{ "id": "deepseek-chat", "provider": "deepseek", "displayName": "DeepSeek Chat", "pricing": { "input": 0.000001, "output": 0.000002 } }] }], "healthyCount": 3, "totalCount": 4 }` },
          { code: "401", desc: "API Key 无效", example: `{ "error": "Invalid API key" }` },
        ],
      },
    ],
  },
  {
    id: "billing",
    icon: "💰",
    name: "Billing · 计费",
    description: "账户余额查询、充值和用量统计",
    endpoints: [
      {
        method: "GET",
        path: "/api/billing/balance",
        summary: "查询账户余额",
        description: "获取当前用户账户余额（优先 Redis，降级数据库）。",
        auth: "session",
        responses: [
          { code: "200", desc: "余额信息", example: `{ "balance": 12.50, "currency": "CNY" }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
        ],
      },
      {
        method: "POST",
        path: "/api/billing/recharge",
        summary: "账户充值",
        description: "创建充值订单。金额范围 1-10000 CNY，支付方式 alipay / wechat。开发环境自动完成，生产环境生成支付链接。",
        auth: "session",
        bodyFields: [
          { name: "amount", type: "number", required: true, desc: "充值金额（CNY）1-10000" },
          { name: "paymentMethod", type: "string", required: true, desc: "alipay / wechat" },
        ],
        bodyExample: `{ "amount": 10, "paymentMethod": "alipay" }`,
        responses: [
          { code: "200", desc: "充值订单", example: `{ "id": "rech_abc123", "amount": 10, "paymentMethod": "alipay", "status": "pending", "paymentUrl": "https://pay.example.com/order/abc123", "createdAt": "2026-05-07T10:00:00Z" }` },
          { code: "400", desc: "参数错误", example: `{ "error": "充值金额必须为有效数字" }` },
        ],
      },
      {
        method: "GET",
        path: "/api/billing/usage",
        summary: "查询用量统计",
        description: "获取当月 API 用量汇总和近30天每日明细。",
        auth: "session",
        responses: [
          { code: "200", desc: "用量统计", example: `{ "monthSummary": { "requestCount": 256, "totalTokens": 128000, "totalCost": 0.35 }, "dailyUsage": [{ "date": "2026-05-01", "requestCount": 15, "totalTokens": 7500, "totalCost": 0.02 }] }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
        ],
      },
    ],
  },
  {
    id: "questions",
    icon: "📚",
    name: "Questions · 题库",
    description: "题目查询、搜索和错题管理",
    endpoints: [
      {
        method: "GET",
        path: "/api/questions",
        summary: "获取题目列表",
        description: "公开获取题目列表，支持按学科、难度、年级、题型筛选。",
        auth: "session",
        params: [
          { name: "subject", location: "query", type: "string", required: false, desc: "学科筛选", defaultV: "数学" },
          { name: "difficulty", location: "query", type: "integer", required: false, desc: "难度 1-5" },
          { name: "gradeLevel", location: "query", type: "string", required: false, desc: "年级", defaultV: "初三" },
          { name: "type", location: "query", type: "string", required: false, desc: "choice / fill / essay" },
          { name: "limit", location: "query", type: "integer", required: false, desc: "每页数量（最大100）", defaultV: "20" },
          { name: "offset", location: "query", type: "integer", required: false, desc: "偏移量", defaultV: "0" },
        ],
        responses: [
          { code: "200", desc: "题目列表", example: `{ "questions": [{ "id": "q_abc123", "subject": "数学", "type": "choice", "difficulty": 3, "content": "已知直角三角形两条直角边分别为3和4，则斜边长为？", "options": ["A. 5", "B. 6", "C. 7", "D. 8"], "answer": "A", "explanation": "根据勾股定理：3²+4²=25", "source": "人教版数学", "gradeLevel": "初二", "knowledgePoints": [{ "id": "kp_001", "name": "勾股定理", "subject": "数学" }], "errorNoteCount": 2, "createdAt": "2026-04-01T08:00:00Z" }], "total": 1200, "limit": 20, "offset": 0 }` },
        ],
      },
      {
        method: "GET",
        path: "/api/questions/search",
        summary: "搜索题目",
        description: "按关键词搜索题目，支持内容、答案、解析多字段匹配。",
        auth: "session",
        params: [
          { name: "keyword", location: "query", type: "string", required: true, desc: "搜索关键词", defaultV: "勾股定理" },
          { name: "subject", location: "query", type: "string", required: false, desc: "学科筛选" },
          { name: "difficulty", location: "query", type: "integer", required: false, desc: "难度 1-5" },
          { name: "gradeLevel", location: "query", type: "string", required: false, desc: "年级" },
          { name: "limit", location: "query", type: "integer", required: false, desc: "每页数量（最大100）", defaultV: "20" },
          { name: "offset", location: "query", type: "integer", required: false, desc: "偏移量", defaultV: "0" },
        ],
        responses: [
          { code: "200", desc: "搜索结果（格式同题目列表）", example: `{ "questions": [...], "total": 120, "limit": 20, "offset": 0 }` },
          { code: "400", desc: "搜索关键词为空", example: `{ "error": "请输入搜索关键词" }` },
        ],
      },
      {
        method: "GET",
        path: "/api/error-notes",
        summary: "获取错题本",
        description: "获取当前用户的错题本，支持按学科和状态（active/eliminated）筛选。",
        auth: "session",
        params: [
          { name: "subject", location: "query", type: "string", required: false, desc: "学科筛选" },
          { name: "status", location: "query", type: "string", required: false, desc: "active / eliminated" },
          { name: "page", location: "query", type: "integer", required: false, desc: "页码", defaultV: "1" },
          { name: "limit", location: "query", type: "integer", required: false, desc: "每页数量（最大50）", defaultV: "20" },
        ],
        responses: [
          { code: "200", desc: "错题列表", example: `{ "errorNotes": [{ "id": "en_abc123", "question": { "id": "q_abc123", "subject": "数学", "type": "choice", "difficulty": 3, "content": "已知直角三角形...", "options": ["A. 5", "B. 6", "C. 7", "D. 8"], "answer": "A", "explanation": "根据勾股定理..." }, "wrongAnswer": "C", "correctAnswer": "A", "status": "active", "timesWrong": 3, "createdAt": "2026-05-07T10:00:00Z", "lastMistakeAt": "2026-05-07T10:05:00Z" }], "total": 45, "totalPages": 3, "page": 1, "limit": 20 }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
        ],
      },
    ],
  },
  {
    id: "game",
    icon: "🏆",
    name: "Game · 游戏化",
    description: "经验值系统和每日挑战",
    endpoints: [
      {
        method: "POST",
        path: "/api/game/xp",
        summary: "增加经验值",
        description: "为用户添加经验值（XP），自动计算等级变化。单次最多 10000。",
        auth: "session",
        bodyFields: [
          { name: "amount", type: "integer", required: true, desc: "经验值数量 1-10000" },
          { name: "reason", type: "string", required: true, desc: "来源原因" },
          { name: "source", type: "string", required: false, desc: "来源类型" },
        ],
        bodyExample: `{ "amount": 50, "reason": "完成每日挑战", "source": "daily_challenge" }`,
        responses: [
          { code: "200", desc: "添加结果", example: `{ "xpEarned": 50, "totalXP": 1250, "level": 5, "leveledUp": false, "levelTitle": "中学学徒" }` },
          { code: "400", desc: "参数错误", example: `{ "error": "经验值必须为正整数" }` },
        ],
      },
      {
        method: "GET",
        path: "/api/game/daily-challenge",
        summary: "获取每日挑战",
        description: "获取当天每日挑战题目，无记录时自动创建新挑战。",
        auth: "session",
        responses: [
          { code: "200", desc: "每日挑战", example: `{ "id": "dc_abc123", "date": "2026-05-07", "question": { "id": "q_abc123", "subject": "数学", "type": "choice", "difficulty": 3, "content": "对于二次函数 y=ax²+bx+c，其对称轴方程是？", "options": ["A. x=-b/2a", "B. x=b/2a", "C. x=-b/a", "D. x=b/a"], "answer": "A", "explanation": "二次函数的对称轴公式为 x=-b/(2a)", "source": "人教版数学", "gradeLevel": "初三" }, "completed": false, "createdAt": "2026-05-07T00:01:00Z" }` },
          { code: "404", desc: "暂无可用的题目", example: `{ "error": "暂无可用的题目" }` },
        ],
      },
    ],
  },
  {
    id: "knowledge",
    icon: "🗺️",
    name: "Knowledge · 知识图谱",
    description: "学科知识图谱与掌握度评估",
    endpoints: [
      {
        method: "GET",
        path: "/api/knowledge-graph",
        summary: "获取知识图谱",
        description: "获取指定学科的知识图谱，以节点（知识点）和边（父子/前置关系）组织，包含用户掌握度。",
        auth: "session",
        params: [
          { name: "subject", location: "query", type: "string", required: false, desc: "学科名称", defaultV: "数学" },
        ],
        responses: [
          { code: "200", desc: "知识图谱数据", example: `{ "nodes": [{ "id": "kp_001", "name": "勾股定理", "subject": "数学", "description": "直角三角形两直角边的平方和等于斜边的平方", "gradeLevel": "初二", "parentId": null, "orderIndex": 1, "masteryLevel": 85, "practiceCount": 12, "lastPracticedAt": "2026-05-07T09:30:00Z" }], "edges": [{ "from": "kp_001", "to": "kp_003", "relation": "prerequisite" }] }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
        ],
      },
    ],
  },
  {
    id: "user",
    icon: "👤",
    name: "User · 用户",
    description: "用户资料、统计和余额查询",
    endpoints: [
      {
        method: "GET",
        path: "/api/user/profile",
        summary: "获取用户资料",
        description: "获取完整用户资料，包含等级、徽章、学习统计等。",
        auth: "session",
        responses: [
          { code: "200", desc: "用户资料", example: `{ "id": "user_abc123", "name": "张三", "email": "zhangsan@example.com", "grade": "初三", "role": "student", "xp": 2500, "level": 8, "streak": 15, "maxStreak": 30, "balance": 12.50, "badges": [{ "id": "badge_001", "name": "初来乍到", "description": "完成首次学习", "icon": "star", "earnedAt": "2026-04-01T08:00:00Z" }], "stats": { "conversationsCount": 42, "errorNotesCount": 15, "todayQuestionsDone": 25, "todayQuestionsCorrect": 20, "todayXPEarned": 150, "todayStudyDuration": 45 }, "hasApiKey": true }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
          { code: "404", desc: "用户不存在", example: `{ "error": "用户不存在" }` },
        ],
      },
      {
        method: "GET",
        path: "/api/user/home-stats",
        summary: "获取首页统计数据",
        description: "首页所需基础信息和今日学习统计。",
        auth: "session",
        responses: [
          { code: "200", desc: "首页统计", example: `{ "user": { "id": "user_abc123", "name": "张三", "xp": 2500, "level": 8, "streak": 15, "maxStreak": 30 }, "todayStats": { "duration": 45, "questionsDone": 25, "questionsCorrect": 20, "xpEarned": 150, "correctRate": 80 }, "recentRecords": [{ "id": "rec_001", "questionsDone": 10, "xpEarned": 60, "duration": 20, "createdAt": "2026-05-07T09:00:00Z" }] }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
        ],
      },
      {
        method: "GET",
        path: "/api/user/balance",
        summary: "获取用户余额",
        description: "获取当前用户账户余额（与 /api/billing/balance 功能相同）。",
        auth: "session",
        responses: [
          { code: "200", desc: "余额信息", example: `{ "balance": 12.50, "currency": "CNY" }` },
          { code: "401", desc: "未登录", example: `{ "error": "请先登录" }` },
        ],
      },
    ],
  },
  {
    id: "safety",
    icon: "🛡️",
    name: "Safety · 安全检测",
    description: "内容安全检测",
    endpoints: [
      {
        method: "POST",
        path: "/api/safety/check",
        summary: "内容安全检测",
        description: "对用户输入或 AI 输出进行安全检测。高风险事件记录到安全日志。",
        auth: "session",
        bodyFields: [
          { name: "content", type: "string", required: true, desc: "待检测文本内容" },
          { name: "type", type: "string", required: false, desc: "input / output，默认 input" },
        ],
        bodyExample: `{ "content": "你好，请问这道题怎么做？", "type": "input" }`,
        responses: [
          { code: "200", desc: "安全", example: `{ "safe": true, "checkedAt": "2026-05-07T10:00:00Z" }` },
          { code: "400", desc: "参数错误", example: `{ "error": "请提供待检测内容" }` },
        ],
      },
    ],
  },
];

/* ============================================================
   Components
   ============================================================ */

function AuthBadge({ auth }: { auth: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    session: { label: "Session", cls: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
    apiKey: { label: "API Key", cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
    none: { label: "None", cls: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700" },
  };
  const c = cfg[auth] || cfg.none;
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${c.cls}`}>{c.label}</span>;
}

function EndpointCard({ ep }: { ep: EndpointDef }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-shadow hover:shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold font-mono ${methodColors[ep.method]}`}>
          {ep.method}
        </span>
        <code className="flex-1 text-sm font-mono font-medium text-slate-700 dark:text-slate-300 break-all">
          {ep.path}
        </code>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <AuthBadge auth={ep.auth} />
          <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[220px] truncate">{ep.summary}</span>
        </div>
        <HiChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-5 space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{ep.description}</p>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">认证方式</h4>
            <AuthBadge auth={ep.auth} />
          </div>

          {/* 参数表 */}
          {ep.params && ep.params.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">请求参数</h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">名称</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">位置</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">类型</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">必填</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.params.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                        <td className="px-3 py-2.5"><code className="text-xs font-mono text-slate-800 dark:text-slate-200">{p.name}</code></td>
                        <td className="px-3 py-2.5"><span className="text-xs text-green-600 dark:text-green-400">{p.location}</span></td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{p.type}</td>
                        <td className="px-3 py-2.5">{p.required ? <span className="text-xs font-medium text-red-500">是</span> : <span className="text-xs text-slate-400">否</span>}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{p.desc}{p.defaultV && <span className="ml-1 text-slate-400">(默认: {p.defaultV})</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 请求体 */}
          {ep.bodyFields && ep.bodyFields.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">请求体 - application/json</h4>
              <div className="mb-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">字段</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">类型</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">必填</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.bodyFields.map((f, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                        <td className="px-3 py-2.5"><code className="text-xs font-mono text-slate-800 dark:text-slate-200">{f.name}</code></td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{f.type}</td>
                        <td className="px-3 py-2.5">{f.required ? <span className="text-xs font-medium text-red-500">是</span> : <span className="text-xs text-slate-400">否</span>}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{f.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ep.bodyExample && (
                <CodeBlock label="示例请求" code={ep.bodyExample} copied={copied === "rb"} onCopy={() => { setCopied("rb"); copyText(ep.bodyExample!, (v) => { if (!v) setCopied(null) }); }} />
              )}
            </div>
          )}

          {/* 响应 */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">响应</h4>
            {ep.responses.map((r, ri) => (
              <div key={ri} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-mono font-bold ${r.code.startsWith("2") ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : r.code.startsWith("4") ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>{r.code}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{r.desc}</span>
                </div>
                <CodeBlock label="响应示例" code={r.example} copied={copied === `r${ri}`} onCopy={() => { setCopied(`r${ri}`); copyText(r.example, (v) => { if (!v) setCopied(null) }); }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ label, code, copied, onCopy }: { label: string; code: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="relative rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
        <span className="text-xs text-slate-400">{label}</span>
        <button onClick={onCopy} className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all">
          {copied ? <><HiCheckCircle className="h-3 w-3 text-green-400" />已复制</> : <><HiClipboardDocument className="h-3 w-3" />复制</>}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed"><code className="text-slate-100">{code}</code></pre>
    </div>
  );
}

/* ============================================================
   Main Page
   ============================================================ */

export default function ApiReferencePage() {
  const [activeId, setActiveId] = useState(groups[0].id);
  const [mobileOpen, setMobileOpen] = useState(false);

  const group = groups.find((g) => g.id === activeId) || groups[0];

  const selectGroup = (id: string) => {
    setActiveId(id);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen">
      {/* ---- Header ---- */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/docs" className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              <HiArrowLeft className="h-4 w-4" />文档首页
            </Link>
            <span className="h-5 w-px bg-slate-300 dark:bg-slate-700" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">API 参考</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/openapi.yaml" target="_blank" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <HiClipboardDocument className="h-4 w-4" /><span className="hidden sm:inline">OpenAPI 规范</span>
            </a>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-10">
          {/* ---- Sidebar (desktop) ---- */}
          <aside className="hidden lg:block w-64 shrink-0">
            <nav className="sticky top-24 space-y-1">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">接口分组</h3>
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => selectGroup(g.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    activeId === g.id
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span className="shrink-0 text-base">{g.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{g.name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{g.endpoints.length} 个接口</div>
                  </div>
                </button>
              ))}
            </nav>
          </aside>

          {/* ---- Mobile nav overlay ---- */}
          {mobileOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
              <div className="absolute left-0 top-16 bottom-0 w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">接口分组</h3>
                <nav className="space-y-1">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => selectGroup(g.id)}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        activeId === g.id
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <span className="shrink-0 text-base">{g.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{g.name}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{g.endpoints.length} 个接口</div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* ---- Main content ---- */}
          <main className="flex-1 min-w-0">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{group.icon}</span>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{group.name}</h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400">{group.description}</p>
            </div>

            <div className="space-y-3">
              {group.endpoints.map((ep, i) => (
                <EndpointCard key={i} ep={ep} />
              ))}
            </div>

            {/* 占位底部间距 */}
            <div className="h-16" />
          </main>
        </div>
      </div>
    </div>
  );
}
# AI教育平台 - API网关与云接入安全方案

> **文档版本**: v1.0  
> **定位**: 云API服务的后端基础设施——API网关、计费引擎、多模型路由、安全接入  
> **目标**: 让用户安全、低成本地使用AI教育能力，平台通过API调用量盈利

---

## 目录

1. [整体架构](#1-整体架构)
2. [API网关核心模块](#2-api网关核心模块)
3. [用户与API Key管理体系](#3-用户与api-key管理体系)
4. [多模型后端路由](#4-多模型后端路由)
5. [计费引擎设计](#5-计费引擎设计)
6. [安全防护体系](#6-安全防护体系)
7. [监控与告警系统](#7-监控与告警系统)
8. [数据库设计](#8-数据库设计)
9. [部署架构](#9-部署架构)
10. [关键接口定义](#10-关键接口定义)

---

## 1. 整体架构

### 1.1 架构概览

```
用户请求
  │
  ▼
┌──────────────────────────────────────────────────────────────┐
│                     负载均衡层                                 │
│              Cloudflare / Nginx / Traefik                     │
│         SSL终止 / DDoS防护 / 全球CDN                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    API Gateway 层                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. 认证鉴权模块（Auth）                                  │  │
│  │    • 验证用户API Key有效性                               │  │
│  │    • 检查用户余额（余额不足直接拒绝）                     │  │
│  │    • 查询用户权限（可用模型/功能）                        │  │
│  │                                                          │  │
│  │ 2. 限流模块（Rate Limiter）                              │  │
│  │    • 按用户限流（RPM/TPM）                               │  │
│  │    • 按IP限流（防攻击）                                  │  │
│  │    • 全局限流（系统保护）                                 │  │
│  │                                                          │  │
│  │ 3. 安全过滤模块（Security Filter）                        │  │
│  │    • 内容安全检查（教育护栏）                             │  │
│  │    • Prompt Injection检测                                │  │
│  │    • 敏感词过滤                                          │  │
│  │                                                          │  │
│  │ 4. 路由模块（Router）                                    │  │
│  │    • 模型选择路由（gpt-4 / deepseek / qwen）            │  │
│  │    • 负载均衡（多Key轮询）                               │  │
│  │    • 故障转移（Provider宕机自动切换）                     │  │
│  │    • 成本路由（优先低成本模型）                           │  │
│  │                                                          │  │
│  │ 5. 计费采集模块（Billing Collector）                      │  │
│  │    • Token计数（输入/输出分别计费）                       │  │
│  │    • 调用次数计费                                        │  │
│  │    • 实时扣费                                            │  │
│  │                                                          │  │
│  │ 6. 日志模块（Logger）                                    │  │
│  │    • 请求/响应全链路日志                                 │  │
│  │    • Token用量统计                                       │  │
│  │    • 延迟追踪                                            │  │
│  │                                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  技术栈: Kong + Go/Python自定义插件 / APISIX + AI Proxy插件   │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                   业务服务层                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│
│  │ 拍题服务  │  │ AI教学    │  │ 出题服务  │  │ 知识图谱      ││
│  │ eduocr   │  │ edullm   │  │ edu-qgen │  │ edu-kgraph   ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘│
│                                                              │
│  每个服务内部通过LLM Adapter调用后端大模型                     │
│  不直接向用户暴露大模型API Key                                │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                   大模型后端层（Provider）                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ DeepSeek     │  │ OpenAI       │  │ Qwen（阿里云）    │  │
│  │ ¥1/M tokens  │  │ ¥15/M tokens │  │ ¥2/M tokens      │  │
│  │ 低成本首选    │  │ 高端能力     │  │ 中文优化         │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  API Key存储: 加密存储（AES-256-GCM）+ KMS托管               │
│  用户不可见真实Key，只看到自己的虚拟Key                        │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 一次请求的完整旅程

```
Step 1: 用户发起请求
        POST /v1/tutoring/sessions
        Header: X-API-Key: sk-edu-abc123...

Step 2: Gateway - 认证鉴权
        ↓ 验证API Key是否存在且有效
        ↓ 查询用户余额（余额 <= 0 → 直接返回402 Payment Required）
        ↓ 检查该Key是否有权限调用 /v1/tutoring/sessions
        ↓ 记录请求元数据（时间、IP、用户ID）

Step 3: Gateway - 限流检查
        ↓ 检查用户RPM（每分钟请求数）是否超限
        ↓ 检查用户TPM（每分钟Token数）是否超限
        ↓ 检查来源IP是否异常（高频/异地）
        ↓ 超限 → 返回429 Too Many Requests

Step 4: Gateway - 安全过滤
        ↓ 检测Prompt Injection攻击
        ↓ 教育内容范围检查（非教育话题拦截）
        ↓ 敏感词过滤

Step 5: Gateway - 路由到大模型后端
        ↓ 根据请求中的model参数选择Provider
        ↓ 负载均衡（多Key轮询）
        ↓ 获取加密的Provider API Key，解密后转发请求

Step 6: 大模型处理并返回
        ↓ DeepSeek/OpenAI/Qwen处理请求
        ↓ 返回响应（含usage: {prompt_tokens, completion_tokens}）

Step 7: Gateway - 计费扣费
        ↓ 从响应中提取Token用量
        ↓ 实时计算费用（prompt_tokens × 输入单价 + completion_tokens × 输出单价）
        ↓ 从用户余额中扣除
        ↓ 记录账单明细

Step 8: Gateway - 记录日志并返回给用户
        ↓ 记录完整请求日志（延迟、Token数、费用）
        ↓ 返回给用户（响应中不含任何Provider Key信息）
```

### 1.3 核心原则

> **密钥零暴露原则**: 用户的请求全程不接触真实的大模型API Key。用户只持有平台分配的虚拟Key，平台内部管理真实Key的加密存储和调用。
>
> **余额不足即停原则**: 用户余额小于等于0时，所有请求立即返回402错误，没有任何宽限期或透支。
>
> **纯按量计费原则**: 无免费层、无包月套餐、无企业定制。用多少扣多少，计费精确到单个Token。

---

## 2. API网关核心模块

### 2.1 认证鉴权模块（Auth）

#### 2.1.1 虚拟Key系统设计

```python
# 虚拟Key生成与管理
import secrets
import hashlib

class VirtualKeyManager:
    """
    给用户分配虚拟Key，隐藏真实模型API Key
    虚拟Key格式: sk-edu-{prefix}-{random}
    示例: sk-edu-x7k9-a1b2c3d4e5f6...
    """
    
    KEY_PREFIX = "sk-edu"
    KEY_LENGTH = 48  # 可见部分长度
    
    def generate_key(self, user_id: str) -> str:
        """生成新的虚拟Key"""
        prefix = secrets.token_urlsafe(6)[:6]  # 6位前缀用于快速查找
        random_part = secrets.token_urlsafe(32)[:32]
        key = f"{self.KEY_PREFIX}-{prefix}-{random_part}"
        
        # 存储Key哈希（不存储明文Key）
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        # 存储前缀用于快速查找
        # 存储Key前缀关联用户ID
        
        return key  # 只返回一次，之后无法查看明文
    
    def validate_key(self, api_key: str) -> dict:
        """
        验证虚拟Key有效性
        返回用户信息或None
        """
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Redis快速查找
        cached = redis.get(f"key:{key_hash}")
        if cached:
            return json.loads(cached)
        
        # 数据库查找
        key_info = db.query("""
            SELECT k.user_id, k.status, k.permissions, u.balance, u.rate_limit
            FROM api_keys k
            JOIN users u ON k.user_id = u.id
            WHERE k.key_hash = %s
        """, (key_hash,))
        
        if not key_info:
            return None
        
        if key_info['status'] != 'active':
            return None
        
        if key_info['balance'] <= 0:
            return {'error': 'insufficient_balance', 'balance': 0}
        
        # 缓存到Redis（TTL: 60秒）
        redis.setex(f"key:{key_hash}", 60, json.dumps(key_info))
        
        return key_info
```

#### 2.1.2 鉴权中间件流程

```python
async def auth_middleware(request):
    """认证鉴权中间件"""
    
    # 1. 提取API Key
    api_key = request.headers.get("X-API-Key") or \
              request.headers.get("Authorization", "").replace("Bearer ", "")
    
    if not api_key:
        return Response(status=401, body={"error": "Missing API Key"})
    
    # 2. 验证Key格式
    if not api_key.startswith("sk-edu-"):
        return Response(status=401, body={"error": "Invalid API Key format"})
    
    # 3. 验证Key有效性和余额
    key_info = VirtualKeyManager().validate_key(api_key)
    
    if not key_info:
        return Response(status=401, body={"error": "Invalid API Key"})
    
    if key_info.get('error') == 'insufficient_balance':
        return Response(status=402, body={
            "error": "Insufficient balance",
            "message": "Please recharge your account",
            "balance": 0,
            "recharge_url": "https://dashboard.openedu-ai.org/recharge"
        })
    
    # 4. 将用户信息附加到请求上下文
    request.ctx.user_id = key_info['user_id']
    request.ctx.permissions = key_info['permissions']
    request.ctx.balance = key_info['balance']
    
    return None  # 鉴权通过，继续后续处理
```

### 2.2 限流模块（Rate Limiter）

#### 2.2.1 多级限流策略

```python
class RateLimiter:
    """
    多级限流系统
    使用Redis作为计数器存储
    """
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def check(self, request) -> Optional[Response]:
        user_id = request.ctx.user_id
        api_key_hash = request.ctx.key_hash
        client_ip = request.ip
        
        # 第一级: 全局紧急限流（系统保护）
        global_rpm = await self._get_global_rpm()
        if global_rpm > GLOBAL_RPM_LIMIT:
            return Response(status=503, body={
                "error": "Service temporarily overloaded",
                "retry_after": 30
            })
        
        # 第二级: 按用户限流（RPM - 每分钟请求数）
        user_rpm = await self._get_counter(f"rpm:user:{user_id}", 60)
        if user_rpm > USER_RPM_LIMIT:
            return Response(status=429, body={
                "error": "Rate limit exceeded",
                "limit": USER_RPM_LIMIT,
                "current": user_rpm,
                "reset_in": await self._get_reset_time(f"rpm:user:{user_id}")
            })
        
        # 第三级: 按用户限流（TPM - 每分钟Token数）
        user_tpm = await self._get_counter(f"tpm:user:{user_id}", 60)
        if user_tpm > USER_TPM_LIMIT:
            return Response(status=429, body={
                "error": "Token rate limit exceeded",
                "limit": USER_TPM_LIMIT,
                "current": user_tpm
            })
        
        # 第四级: 按IP限流（防攻击/滥用）
        ip_rpm = await self._get_counter(f"rpm:ip:{client_ip}", 60)
        if ip_rpm > IP_RPM_LIMIT:
            # 标记异常IP
            await self._flag_suspicious_ip(client_ip)
            return Response(status=429, body={
                "error": "IP rate limit exceeded",
                "message": "Unusual activity detected from your IP"
            })
        
        # 限流通过，增加计数器
        await self._increment_counter(f"rpm:user:{user_id}", 60)
        await self._increment_counter(f"rpm:ip:{client_ip}", 60)
        
        return None  # 限流通过
    
    async def record_tokens(self, user_id: str, prompt_tokens: int, completion_tokens: int):
        """记录Token用量用于TPM限流"""
        total = prompt_tokens + completion_tokens
        await self._increment_counter(f"tpm:user:{user_id}", 60, increment=total)
    
    # 限流阈值配置
    USER_RPM_LIMIT = 120      # 每个用户每分钟最多120次请求
    USER_TPM_LIMIT = 100000   # 每个用户每分钟最多100K Token
    IP_RPM_LIMIT = 300        # 每个IP每分钟最多300次请求（防共享Key）
    GLOBAL_RPM_LIMIT = 10000  # 全局每分钟最多10K次请求（系统保护）
```

#### 2.2.2 滑动窗口限流实现

```python
class SlidingWindowRateLimiter:
    """
    基于Redis的滑动窗口限流
    比固定窗口更精确，避免窗口边界突发流量
    """
    
    async def is_allowed(self, key: str, limit: int, window: int) -> bool:
        """
        key: 限流键（如 "rpm:user:123"）
        limit: 窗口内最大请求数
        window: 窗口大小（秒）
        """
        now = time.time()
        window_start = now - window
        
        # 使用Redis Sorted Set存储请求时间戳
        pipe = self.redis.pipeline()
        
        # 移除窗口外的旧记录
        pipe.zremrangebyscore(key, 0, window_start)
        
        # 统计当前窗口内的请求数
        pipe.zcard(key)
        
        # 添加当前请求
        pipe.zadd(key, {str(now): now})
        
        # 设置过期时间
        pipe.expire(key, window + 1)
        
        results = await pipe.execute()
        current_count = results[1]
        
        return current_count < limit
```

### 2.3 安全过滤模块（Security Filter）

#### 2.3.1 内容安全检查

```python
class SecurityFilter:
    """
    请求内容安全检查
    在请求到达大模型之前进行过滤
    """
    
    async def filter(self, request) -> Optional[Response]:
        body = await request.json()
        
        # 1. Prompt Injection检测
        if await self._detect_injection(body):
            await self._log_security_event(request, "injection_detected")
            return Response(status=400, body={
                "error": "Security violation: Potential prompt injection detected"
            })
        
        # 2. 教育内容范围检查
        messages = body.get("messages", [])
        user_content = " ".join([m.get("content", "") for m in messages if m.get("role") == "user"])
        
        if await self._is_non_educational(user_content):
            return Response(status=400, body={
                "error": "Content out of educational scope",
                "message": "This query is outside the educational scope of our service"
            })
        
        # 3. 敏感内容检查
        moderation_result = await self._moderation_check(user_content)
        if moderation_result.flagged:
            await self._log_security_event(request, "content_flagged", moderation_result)
            return Response(status=400, body={
                "error": "Content flagged by safety filter",
                "categories": moderation_result.categories
            })
        
        return None  # 安全过滤通过
```

### 2.4 路由模块（Router）

#### 2.4.1 多模型路由

```python
class ModelRouter:
    """
    多模型后端路由
    将用户的模型请求路由到对应的Provider
    """
    
    # 模型映射表
    MODEL_MAP = {
        # 逻辑模型名 -> 实际Provider和模型
        "gpt-4": {"provider": "openai", "model": "gpt-4o"},
        "gpt-4-turbo": {"provider": "openai", "model": "gpt-4o"},
        "deepseek": {"provider": "deepseek", "model": "deepseek-chat"},
        "deepseek-reasoner": {"provider": "deepseek", "model": "deepseek-reasoner"},
        "qwen-turbo": {"provider": "qwen", "model": "qwen-turbo"},
        "qwen-max": {"provider": "qwen", "model": "qwen-max"},
        "default": {"provider": "deepseek", "model": "deepseek-chat"},
    }
    
    # 成本优先级（优先使用低成本模型）
    COST_PRIORITY = {
        "deepseek": 1,    # 最低成本
        "qwen": 2,
        "openai": 3,      # 最高成本
    }
    
    async def route(self, request) -> dict:
        """
        确定请求应该路由到哪个Provider
        """
        body = await request.json()
        requested_model = body.get("model", "default")
        
        # 1. 查找模型映射
        mapping = self.MODEL_MAP.get(requested_model)
        if not mapping:
            # 未识别的模型，使用默认
            mapping = self.MODEL_MAP["default"]
        
        provider = mapping["provider"]
        actual_model = mapping["model"]
        
        # 2. 检查Provider是否可用
        if not await self._is_provider_available(provider):
            # 故障转移：切换到次优Provider
            fallback = await self._find_fallback(requested_model)
            if fallback:
                provider = fallback["provider"]
                actual_model = fallback["model"]
            else:
                return Response(status=503, body={
                    "error": "All providers for this model are temporarily unavailable"
                })
        
        # 3. 获取Provider的API Key（加密存储）
        api_key = await self._get_provider_key(provider)
        
        # 4. 构建转发请求
        forward_body = body.copy()
        forward_body["model"] = actual_model
        
        return {
            "provider": provider,
            "api_key": api_key,
            "body": forward_body,
            "endpoint": self._get_provider_endpoint(provider),
            "pricing": self._get_pricing(provider, actual_model),
        }
    
    async def _is_provider_available(self, provider: str) -> bool:
        """检查Provider是否可用（健康检查）"""
        health = await redis.get(f"provider:health:{provider}")
        if health:
            return health == "healthy"
        # 实时健康检查
        return await self._health_check(provider)
    
    async def _find_fallback(self, requested_model: str) -> Optional[dict]:
        """
        查找备选Provider
        按成本优先级排序，选择可用的最低成本Provider
        """
        # 获取同类型的所有可用Provider
        available = []
        for name, info in self.MODEL_MAP.items():
            if await self._is_provider_available(info["provider"]):
                available.append(info)
        
        # 按成本排序
        available.sort(key=lambda x: self.COST_PRIORITY.get(x["provider"], 99))
        
        return available[0] if available else None
```

### 2.5 计费采集模块（Billing Collector）

#### 2.5.1 实时扣费引擎

```python
class BillingEngine:
    """
    实时计费引擎
    精确到每个Token的计费
    """
    
    # 对外售价（平台向用户收取的价格）
    RETAIL_PRICING = {
        "deepseek": {
            "deepseek-chat": {
                "input": 0.000001,    # 每输入Token ¥0.000001
                "output": 0.000002,   # 每输出Token ¥0.000002
            },
            "deepseek-reasoner": {
                "input": 0.000002,
                "output": 0.000008,
            },
        },
        "openai": {
            "gpt-4o": {
                "input": 0.000015,
                "output": 0.000060,
            },
        },
        "qwen": {
            "qwen-turbo": {
                "input": 0.000001,
                "output": 0.000002,
            },
            "qwen-max": {
                "input": 0.000005,
                "output": 0.000010,
            },
        },
    }
    
    # 对公成本（平台向Provider支付的价格）
    COST_PRICING = {
        "deepseek": {
            "deepseek-chat": {"input": 0.0000007, "output": 0.0000014},
        },
        # ... 其他模型的成本价
    }
    
    async def charge(self, user_id: str, provider: str, model: str, 
                     prompt_tokens: int, completion_tokens: int) -> dict:
        """
        实时计费
        返回扣费结果
        """
        pricing = self.RETAIL_PRICING.get(provider, {}).get(model, {})
        
        input_cost = prompt_tokens * pricing.get("input", 0)
        output_cost = completion_tokens * pricing.get("output", 0)
        total_cost = input_cost + output_cost
        
        # 使用Redis原子操作扣费
        # Lua脚本保证原子性
        lua_script = """
        local balance_key = KEYS[1]
        local balance = tonumber(redis.call('GET', balance_key) or 0)
        
        if balance <= 0 then
            return {-1, balance}  -- 余额不足
        end
        
        local new_balance = balance - tonumber(ARGV[1])
        if new_balance < 0 then
            return {-2, balance}  -- 余额不够扣
        end
        
        redis.call('SET', balance_key, new_balance)
        return {1, new_balance}  -- 扣费成功
        """
        
        result = await redis.eval(
            lua_script,
            1,  # 1个key
            f"user:{user_id}:balance",  # KEYS[1]
            str(total_cost)  # ARGV[1]
        )
        
        status, new_balance = result[0], result[1]
        
        if status == -1:
            return {"success": False, "reason": "insufficient_balance", "balance": 0}
        
        if status == -2:
            return {"success": False, "reason": "balance_not_enough", 
                    "balance": new_balance, "required": total_cost}
        
        # 扣费成功，记录账单
        await self._record_usage(user_id, provider, model, 
                                  prompt_tokens, completion_tokens, total_cost)
        
        return {
            "success": True,
            "charged": total_cost,
            "balance": new_balance,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
        }
    
    async def _record_usage(self, user_id, provider, model, 
                            prompt_tokens, completion_tokens, cost):
        """记录用量到数据库"""
        # 异步写入，不阻塞响应
        await async_db.execute("""
            INSERT INTO usage_logs (user_id, provider, model, 
                                    prompt_tokens, completion_tokens, cost, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """, (user_id, provider, model, prompt_tokens, completion_tokens, cost))
```

---

## 3. 用户与API Key管理体系

### 3.1 用户注册与充值流程

```
用户注册
  │
  ▼
┌─────────────────────┐
│ 1. 邮箱/手机号注册   │
│ 2. 实名认证（可选）  │
│ 3. 创建默认API Key   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. 充值账户          │
│    • 支付宝          │
│    • 微信支付        │
│    • 对公转账        │
│    • USDT（可选）    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. 开始使用API       │
│    余额 > 0 即可调用 │
│    余额 <= 0 立即停用 │
└─────────────────────┘
```

### 3.2 API Key管理

```python
class APIKeyService:
    """
    API Key生命周期管理
    """
    
    async def create_key(self, user_id: str, name: str, permissions: dict) -> str:
        """
        为用户创建新的API Key
        返回明文Key（只显示一次）
        """
        key = VirtualKeyManager().generate_key(user_id)
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        await db.execute("""
            INSERT INTO api_keys (user_id, name, key_hash, prefix, 
                                  permissions, status, created_at)
            VALUES (%s, %s, %s, %s, %s, 'active', NOW())
        """, (user_id, name, key_hash, key[:12], json.dumps(permissions)))
        
        return key  # 明文Key只返回一次
    
    async def revoke_key(self, key_id: str, user_id: str):
        """吊销API Key"""
        await db.execute("""
            UPDATE api_keys SET status = 'revoked', revoked_at = NOW()
            WHERE id = %s AND user_id = %s
        """, (key_id, user_id))
        
        # 清除Redis缓存
        # Key将立即失效
    
    async def list_keys(self, user_id: str) -> list:
        """列出用户的所有API Key（不返回明文）"""
        keys = await db.query("""
            SELECT id, name, prefix, status, permissions, 
                   created_at, last_used_at
            FROM api_keys
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        return keys
```

### 3.3 用户Dashboard

用户可以在Dashboard中：
- 查看余额和充值
- 创建/管理API Key
- 查看用量统计
- 查看账单明细
- 设置消费告警

---

## 4. 多模型后端路由

### 4.1 Provider管理

```python
class ProviderManager:
    """
    管理多个大模型Provider
    包括API Key的加密存储和健康检查
    """
    
    async def add_provider(self, name: str, api_key: str, 
                           endpoint: str, config: dict):
        """
        添加新的Provider
        API Key使用AES-256-GCM加密存储
        """
        encrypted_key = self._encrypt_key(api_key)
        
        await db.execute("""
            INSERT INTO providers (name, api_key_encrypted, endpoint, 
                                   config, status, created_at)
            VALUES (%s, %s, %s, %s, 'active', NOW())
        """, (name, encrypted_key, endpoint, json.dumps(config)))
    
    def _encrypt_key(self, api_key: str) -> str:
        """使用AES-256-GCM加密API Key"""
        # 密钥从KMS/环境变量获取
        master_key = os.environ["MASTER_KEY"]
        
        iv = secrets.token_bytes(12)
        cipher = Cipher(algorithms.AES(master_key), modes.GCM(iv))
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(api_key.encode()) + encryptor.finalize()
        
        # 存储: iv + tag + ciphertext
        return base64.b64encode(iv + encryptor.tag + ciphertext).decode()
    
    def _decrypt_key(self, encrypted: str) -> str:
        """解密API Key"""
        master_key = os.environ["MASTER_KEY"]
        data = base64.b64decode(encrypted.encode())
        
        iv, tag, ciphertext = data[:12], data[12:28], data[28:]
        
        cipher = Cipher(algorithms.AES(master_key), modes.GCM(iv, tag))
        decryptor = cipher.decryptor()
        return (decryptor.update(ciphertext) + decryptor.finalize()).decode()
    
    async def health_check_all(self):
        """对所有Provider进行健康检查"""
        providers = await db.query("SELECT * FROM providers WHERE status = 'active'")
        
        for provider in providers:
            healthy = await self._check_provider(provider)
            status = "healthy" if healthy else "unhealthy"
            
            # 更新Redis中的健康状态
            await redis.setex(f"provider:health:{provider['name']}", 60, status)
            
            if not healthy:
                await self._alert_admin(f"Provider {provider['name']} is unhealthy")
```

### 4.2 故障转移机制

```python
class FailoverManager:
    """
    Provider故障自动转移
    """
    
    async def handle_request(self, request, primary_provider: str):
        """
        处理请求，带故障转移
        """
        providers_to_try = [primary_provider] + \
                           await self._get_fallback_providers(primary_provider)
        
        last_error = None
        
        for provider in providers_to_try:
            try:
                response = await self._call_provider(provider, request)
                return response
            except ProviderUnavailableError as e:
                last_error = e
                # 标记Provider为不健康
                await self._mark_unhealthy(provider)
                continue
            except ProviderRateLimitError as e:
                last_error = e
                # 触发限流，尝试下一个Provider
                continue
        
        # 所有Provider都失败
        return Response(status=503, body={
            "error": "All AI providers are temporarily unavailable",
            "message": "Please retry after a few moments"
        })
```

---

## 5. 计费引擎设计

### 5.1 计费模型

| 计费项 | 单位 | 价格示例 |
|--------|------|----------|
| AI对话（输入Token） | 每千Token | ¥0.001 |
| AI对话（输出Token） | 每千Token | ¥0.002 |
| 拍题识别 | 每次调用 | ¥0.02 |
| AI出题 | 每道题目 | ¥0.01 |
| 知识图谱查询 | 每次调用 | ¥0.001 |
| 语音合成 | 每百字符 | ¥0.005 |
| 语音转写 | 每分钟 | ¥0.01 |

### 5.2 实时扣费流程

```
用户请求 → Gateway处理 → 大模型返回响应
                                    │
                                    ▼
                            提取usage信息
                            {prompt_tokens: 150, completion_tokens: 80}
                                    │
                                    ▼
                            计算费用
                            input: 150 × ¥0.000001 = ¥0.00015
                            output: 80 × ¥0.000002 = ¥0.00016
                            total: ¥0.00031
                                    │
                                    ▼
                            Redis原子扣费
                            balance -= 0.00031
                                    │
                                    ▼
                            异步记录账单
                            INSERT usage_logs ...
                                    │
                                    ▼
                            返回用户响应
                            (Header中携带本次费用)
                            X-Usage-Cost: 0.00031
                            X-Balance-Remaining: 45.67
```

### 5.3 账单系统

```python
class BillingService:
    """
    账单服务
    """
    
    async def get_daily_usage(self, user_id: str, date: str) -> dict:
        """获取某日用量统计"""
        result = await db.query("""
            SELECT 
                provider,
                model,
                SUM(prompt_tokens) as total_prompt_tokens,
                SUM(completion_tokens) as total_completion_tokens,
                SUM(total_tokens) as total_tokens,
                SUM(cost) as total_cost,
                COUNT(*) as request_count
            FROM usage_logs
            WHERE user_id = %s AND DATE(created_at) = %s
            GROUP BY provider, model
        """, (user_id, date))
        return result
    
    async def get_cost_forecast(self, user_id: str) -> dict:
        """基于历史用量预测未来7天费用"""
        # 简单线性预测
        recent_avg = await db.query("""
            SELECT AVG(daily_cost) as avg_cost
            FROM (
                SELECT DATE(created_at) as day, SUM(cost) as daily_cost
                FROM usage_logs
                WHERE user_id = %s AND created_at > NOW() - INTERVAL 7 DAY
                GROUP BY DATE(created_at)
            ) daily
        """, (user_id,))
        
        avg_cost = recent_avg[0]['avg_cost'] or 0
        current_balance = await self._get_balance(user_id)
        
        days_remaining = current_balance / avg_cost if avg_cost > 0 else float('inf')
        
        return {
            "avg_daily_cost": round(avg_cost, 4),
            "current_balance": current_balance,
            "estimated_days_remaining": round(days_remaining, 1),
            "recommend_recharge": days_remaining < 3,
        }
```

---

## 6. 安全防护体系

### 6.1 密钥安全

```
┌─────────────────────────────────────────────────────────────┐
│                    密钥安全架构                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  用户的虚拟Key（sk-edu-xxx）                                  │
│  │                                                           │
│  │  用户持有，用于API调用                                     │
│  │  存储Key的SHA256哈希（不存明文）                           │
│  │  明文Key只在新创建时返回一次                               │
│                                                              │
│  Provider的真实API Key（sk-真实Key）                          │
│  │                                                           │
│  │  用户不可见，完全隔离                                     │
│  │  AES-256-GCM加密存储在数据库                              │
│  │  加密主密钥存储在KMS/环境变量                             │
│  │  只在转发请求时临时解密使用                                │
│  │  解密后的Key不进入日志                                     │
│  │  定期轮换                                                 │
│                                                              │
│  Master Key（加密主密钥）                                     │
│  │                                                           │
│  │  存储在AWS KMS /阿里云KMS / HashiCorp Vault               │
│  │  程序启动时从KMS获取                                      │
│  │  不硬编码在代码中                                         │
│  │  支持自动轮换                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 请求安全

| 安全措施 | 实现方式 | 说明 |
|----------|----------|------|
| **HTTPS强制** | TLS 1.3 | 所有API通信强制HTTPS |
| **请求签名** | HMAC-SHA256 | 可选的请求签名验证 |
| **IP白名单** | 用户配置 | 限制Key的调用来源IP |
| **CORS控制** | 严格限制 | 前端直接调用时的跨域控制 |
| **请求体大小限制** | 最大8MB | 防止超大请求攻击 |
| **超时控制** | 60秒 | 防止长连接占用资源 |
| **防重放攻击** | 时间戳+Nonce | 拒绝过期或重复的请求 |

### 6.3 防滥用检测

```python
class AbuseDetector:
    """
    异常行为检测系统
    """
    
    async def detect(self, request, response) -> Optional[dict]:
        """
        检测异常使用行为
        """
        alerts = []
        
        # 检测1: 异常高频调用
        rpm = await self._get_user_rpm(request.ctx.user_id)
        if rpm > 1000:
            alerts.append({
                "type": "high_frequency",
                "severity": "high",
                "message": f"User {request.ctx.user_id} calling at {rpm} RPM"
            })
        
        # 检测2: 多IP共享同一个Key
        unique_ips = await self._get_key_unique_ips(request.ctx.key_hash, hours=1)
        if unique_ips > 5:
            alerts.append({
                "type": "key_sharing",
                "severity": "medium",
                "message": f"Key used from {unique_ips} different IPs in 1 hour"
            })
        
        # 检测3: 异常时段调用
        hour = datetime.now().hour
        if hour in [2, 3, 4, 5]:  # 凌晨时段
            alerts.append({
                "type": "unusual_hours",
                "severity": "low",
                "message": f"API call at unusual hour: {hour}"
            })
        
        # 检测4: 异常Token消耗
        if response and hasattr(response, 'usage'):
            tokens = response.usage.total_tokens
            if tokens > 100000:  # 单次请求超过100K Token
                alerts.append({
                    "type": "high_token_usage",
                    "severity": "medium",
                    "message": f"Single request used {tokens} tokens"
                })
        
        # 处理告警
        for alert in alerts:
            await self._handle_alert(request.ctx.user_id, alert)
        
        return alerts if alerts else None
    
    async def _handle_alert(self, user_id: str, alert: dict):
        """处理告警"""
        # 记录告警
        await db.execute("""
            INSERT INTO security_alerts (user_id, type, severity, message, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (user_id, alert["type"], alert["severity"], alert["message"]))
        
        # 高严重度：自动限流
        if alert["severity"] == "high":
            await self._auto_restrict(user_id)
        
        # 通知管理员
        if alert["severity"] in ["high", "medium"]:
            await self._notify_admin(alert)
```

---

## 7. 监控与告警系统

### 7.1 监控指标

| 指标类别 | 指标名 | 说明 |
|----------|--------|------|
| **请求量** | request_total | 总请求数（按状态码分类） |
| **延迟** | request_latency_seconds | P50/P95/P99延迟 |
| **Token用量** | tokens_used_total | 输入/输出Token总数 |
| **收入** | revenue_total | 实时收入统计 |
| **错误率** | error_rate | 5xx错误占比 |
| **Provider健康** | provider_health | 各Provider可用性 |
| **用户活跃** | active_users | 5分钟内的活跃用户 |
| **余额告警** | low_balance_users | 余额不足的用户数 |

### 7.2 告警规则

```yaml
# alerting_rules.yaml
rules:
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    action: notify_admin + auto_switch_provider

  - name: provider_down
    condition: provider_health == 0
    duration: 1m
    severity: critical
    action: notify_admin + activate_fallback

  - name: high_latency
    condition: p99_latency > 10s
    duration: 5m
    severity: warning
    action: notify_admin

  - name: revenue_drop
    condition: hourly_revenue < avg_hourly_revenue * 0.5
    duration: 30m
    severity: warning
    action: notify_admin

  - name: abuse_detected
    condition: abuse_alert_severity == "high"
    duration: 0s
    severity: high
    action: auto_restrict + notify_admin
```

### 7.3 Grafana Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    API运营Dashboard                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [实时QPS: 1,234]  [今日收入: ¥4,567]  [活跃用户: 89]        │
│  [P50延迟: 320ms]  [P99延迟: 2.1s]  [错误率: 0.3%]          │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  请求量趋势图      │  │  Token用量趋势    │                │
│  │  (最近24小时)      │  │  (按模型分类)      │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  收入趋势图        │  │  Provider健康状态  │                │
│  │  (最近7天)         │  │  (DeepSeek/OpenAI) │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Top 10用户用量    │  │  异常事件列表      │                │
│  │  (今日)            │  │  (实时)            │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 数据库设计

### 8.1 核心表结构

```sql
-- 用户表
CREATE TABLE users (
    id              VARCHAR(32) PRIMARY KEY,     -- 用户ID
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    balance         DECIMAL(16, 8) NOT NULL DEFAULT 0,  -- 账户余额
    total_spent     DECIMAL(16, 8) NOT NULL DEFAULT 0,  -- 累计消费
    status          ENUM('active', 'suspended', 'banned') DEFAULT 'active',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- API Key表
CREATE TABLE api_keys (
    id              VARCHAR(32) PRIMARY KEY,
    user_id         VARCHAR(32) NOT NULL REFERENCES users(id),
    name            VARCHAR(100) NOT NULL,       -- Key名称（用户自定义）
    key_hash        VARCHAR(64) UNIQUE NOT NULL,  -- SHA256哈希（不存明文）
    prefix          VARCHAR(20) NOT NULL,         -- Key前缀（用于快速查找）
    permissions     JSON NOT NULL,                -- 权限配置
    rate_limit_rpm  INT DEFAULT 120,              -- 自定义RPM限流
    allowed_ips     JSON,                        -- IP白名单
    status          ENUM('active', 'revoked') DEFAULT 'active',
    last_used_at    DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at      DATETIME,
    INDEX idx_user (user_id),
    INDEX idx_hash (key_hash)
);

-- Provider表（大模型后端）
CREATE TABLE providers (
    id              VARCHAR(32) PRIMARY KEY,
    name            VARCHAR(50) UNIQUE NOT NULL,  -- deepseek / openai / qwen
    api_key_encrypted TEXT NOT NULL,              -- AES-256-GCM加密
    endpoint        VARCHAR(255) NOT NULL,
    config          JSON NOT NULL,                -- 模型映射、定价等配置
    status          ENUM('active', 'inactive') DEFAULT 'active',
    health_status   ENUM('healthy', 'unhealthy', 'unknown') DEFAULT 'unknown',
    last_health_check DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用量日志表（大表，需分片/归档）
CREATE TABLE usage_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         VARCHAR(32) NOT NULL,
    api_key_id      VARCHAR(32),
    provider        VARCHAR(50) NOT NULL,
    model           VARCHAR(100) NOT NULL,
    endpoint        VARCHAR(255) NOT NULL,        -- 调用的API端点
    prompt_tokens   INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    total_tokens    INT NOT NULL DEFAULT 0,
    cost            DECIMAL(16, 8) NOT NULL DEFAULT 0,
    latency_ms      INT,                          -- 请求延迟
    status_code     INT,                          -- HTTP状态码
    client_ip       VARCHAR(45),
    request_id      VARCHAR(64) UNIQUE,           -- 请求唯一ID
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_time (user_id, created_at),
    INDEX idx_time (created_at),
    INDEX idx_provider (provider, created_at)
) PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
    PARTITION p202501 VALUES LESS THAN (UNIX_TIMESTAMP('2025-02-01')),
    PARTITION p202502 VALUES LESS THAN (UNIX_TIMESTAMP('2025-03-01')),
    -- 每月自动新增分区
);

-- 充值记录表
CREATE TABLE recharges (
    id              VARCHAR(32) PRIMARY KEY,
    user_id         VARCHAR(32) NOT NULL REFERENCES users(id),
    amount          DECIMAL(16, 8) NOT NULL,      -- 充值金额
    payment_method  ENUM('alipay', 'wechat', 'bank_transfer', 'usdt'),
    transaction_id  VARCHAR(255),                 -- 第三方支付流水号
    status          ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME
);

-- 安全告警表
CREATE TABLE security_alerts (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         VARCHAR(32) NOT NULL,
    alert_type      VARCHAR(50) NOT NULL,
    severity        ENUM('low', 'medium', 'high', 'critical'),
    message         TEXT NOT NULL,
    auto_action     VARCHAR(100),                 -- 自动执行的操作
    resolved        BOOLEAN DEFAULT FALSE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. 部署架构

### 9.1 生产部署

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  # 负载均衡
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api-gateway

  # API网关（Kong）
  api-gateway:
    image: kong:3.5
    environment:
      KONG_DATABASE: "off"           # dbless模式
      KONG_DECLARATIVE_CONFIG: /kong/declarative/kong.yml
      KONG_PLUGINS: bundled,edu-auth,edu-billing,edu-security
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
    volumes:
      - ./kong.yml:/kong/declarative/kong.yml
      - ./plugins:/usr/local/share/lua/5.1/kong/plugins
    depends_on:
      - redis
      - postgres

  # 计费服务
  billing-service:
    image: openedu-ai/billing:latest
    environment:
      DATABASE_URL: postgres://billing:${DB_PASSWORD}@postgres:5432/billing
      REDIS_URL: redis://redis:6379
      MASTER_KEY_KMS: ${MASTER_KEY_KMS}
    depends_on:
      - postgres
      - redis

  # 监控服务
  monitoring:
    image: openedu-ai/monitoring:latest
    environment:
      DATABASE_URL: postgres://monitor:${DB_PASSWORD}@postgres:5432/monitoring
      REDIS_URL: redis://redis:6379
      PROMETHEUS_URL: http://prometheus:9090

  # Redis（限流/缓存/会话）
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    command: redis-server --requirepass ${REDIS_PASSWORD}

  # PostgreSQL（主数据库）
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: edu
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: eduapi
    volumes:
      - postgres-data:/var/lib/postgresql/data

  # Prometheus（指标收集）
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus

  # Grafana（可视化）
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-dashboards:/etc/grafana/provisioning/dashboards

volumes:
  redis-data:
  postgres-data:
  prometheus-data:
  grafana-data:
```

### 9.2 技术栈

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **API网关** | Kong / APISIX | 开源API网关，支持自定义插件 |
| **认证鉴权** | Kong Plugin + JWT | 虚拟Key + JWT双认证 |
| **限流** | Redis + 滑动窗口 | 分布式限流 |
| **计费** | Go/Python + Redis原子操作 | 实时扣费 |
| **数据库** | PostgreSQL 16 | 主存储，按月分区 |
| **缓存** | Redis 7 | 会话/限流/热点数据 |
| **监控** | Prometheus + Grafana | 指标收集和可视化 |
| **日志** | Loki + Grafana | 日志收集和查询 |
| **告警** | Alertmanager | 告警通知 |
| **密钥加密** | AES-256-GCM + KMS | 密钥安全存储 |
| **消息队列** | Redis Stream / Kafka | 异步账单记录 |

---

## 10. 关键接口定义

### 10.1 面向用户的API端点

```http
### AI对话（苏格拉底式教学）
POST /v1/tutoring/chat
Authorization: Bearer {sk-edu-xxx}
Content-Type: application/json

{
  "model": "deepseek",
  "messages": [
    {"role": "system", "content": "你是苏格拉底式AI老师..."},
    {"role": "user", "content": "3x + 7 = 22 怎么解？"}
  ],
  "stream": false
}

Response:
{
  "id": "chat-abc123",
  "model": "deepseek-chat",
  "choices": [...],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 120,
    "total_tokens": 165
  }
}
# Header: X-Balance-Remaining: 45.6789
# Header: X-Usage-Cost: 0.000285

### 拍题识别
POST /v1/ocr/solve
Authorization: Bearer {sk-edu-xxx}
Content-Type: multipart/form-data

image: (binary)
mode: socratic
grade: 8

Response:
{
  "recognized_text": "f(x) = x² - 4x + 3，求最小值",
  "guidance": "你还记得二次函数的图像是什么形状吗？",
  "usage": {"cost": 0.02}
}

### 查询余额
GET /v1/user/balance
Authorization: Bearer {sk-edu-xxx}

Response:
{
  "balance": 45.6789,
  "currency": "CNY",
  "total_spent": 123.45,
  "total_calls": 45678
}

### 查询用量
GET /v1/user/usage?start=2025-01-01&end=2025-01-31
Authorization: Bearer {sk-edu-xxx}

Response:
{
  "total_cost": 45.67,
  "total_tokens": 12345678,
  "total_calls": 5678,
  "daily_breakdown": [
    {"date": "2025-01-15", "cost": 2.34, "calls": 234},
    ...
  ]
}
```

### 10.2 管理平台接口（内部使用）

```http
### Provider管理（仅管理员）
POST /admin/providers
Authorization: Bearer {admin-jwt}

{
  "name": "deepseek",
  "api_key": "sk-真实Key",
  "endpoint": "https://api.deepseek.com/v1",
  "config": {
    "models": ["deepseek-chat", "deepseek-reasoner"],
    "pricing": {"input": 0.000001, "output": 0.000002}
  }
}

### 查看系统统计（仅管理员）
GET /admin/stats
Authorization: Bearer {admin-jwt}

Response:
{
  "total_users": 1234,
  "active_users_24h": 234,
  "total_revenue_today": 4567.89,
  "total_calls_today": 123456,
  "provider_status": {
    "deepseek": {"healthy": true, "qps": 123, "avg_latency_ms": 320},
    "openai": {"healthy": true, "qps": 45, "avg_latency_ms": 800}
  }
}
```

---

> **本文档定义了AI教育平台云API服务的完整后端基础设施，包括API网关、多模型路由、实时计费、安全防护和监控系统。这是平台唯一的收入来源，所有设计围绕"安全、低成本、易用"三个核心目标。**
>
> **核心原则重申**：
> - 密钥零暴露：用户只持有虚拟Key，真实模型Key完全隔离
> - 余额不足即停：余额为0时所有请求立即返回402错误
> - 纯按量计费：无免费层、无包月、无企业定制

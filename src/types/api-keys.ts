// AGPL-3.0
// API Key 生命周期管理 - 类型定义

/** API Key 状态 */
export type ApiKeyStatus = "active" | "revoked";

/** API Key 列表项（不包含敏感信息） */
export interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  status: ApiKeyStatus;
  rateLimitRpm: number;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** GET /api/ai/keys 响应 */
export interface ApiKeyListResponse {
  keys: ApiKeyListItem[];
}

/** POST /api/ai/keys 请求体 */
export interface CreateApiKeyRequest {
  name: string;
  rateLimitRpm?: number;
}

/** POST /api/ai/keys 响应 - 创建成功后返回（含一次性完整Key） */
export interface ApiKeyCreateResult {
  success: true;
  key: ApiKeyListItem;
  /** 完整的 API Key 明文，仅在创建响应中返回一次 */
  fullKey: string;
  warning: string;
}

/** DELETE /api/ai/keys/[id] 响应 */
export interface ApiKeyRevokeResult {
  success: true;
  key: Pick<ApiKeyListItem, "id" | "name" | "prefix" | "status" | "revokedAt">;
}

/** API 通用错误响应 */
export interface ApiErrorResponse {
  error: string;
}

/**
 * Task 9.5: API Key 加密存储
 *
 * 轻量加密：Web 端用 btoa + 反转混淆（非强加密，防肉眼读取）。
 * - Electron 生产环境建议改用 safeStorage（通过 IPC 调用，此处先实现 Web fallback）。
 * - Capacitor 建议改用 @capacitor/preferences + AES（需插件，此处先实现 Web fallback）。
 *
 * 同时提供 sync / async 两套 API：
 * - async 版本（encryptAndStore / retrieveAndDecrypt）：供组件在异步流程中使用。
 * - sync 版本（encryptAndStoreSync / retrieveAndDecryptSync）：供 loadAIServiceConfig 等需保持同步签名的函数使用，向后兼容 chat() 调用链。
 */

// UTF-8 安全的 base64 编码（兼容含非 ASCII 字符的值，避免 btoa 直接抛错）
function encodeBase64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

function decodeBase64(value: string): string {
  return decodeURIComponent(escape(atob(value)));
}

/** 混淆：base64 + 反转字符串 */
function obscure(value: string): string {
  return encodeBase64(value).split("").reverse().join("");
}

/** 解混淆：反转字符串 + base64 解码 */
function deobfuscate(obscured: string): string | null {
  try {
    return decodeBase64(obscured.split("").reverse().join(""));
  } catch {
    return null;
  }
}

/* ---------------- 同步版本（供 loadAIServiceConfig 等使用） ---------------- */

export function encryptAndStoreSync(key: string, value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, obscure(value));
}

export function retrieveAndDecryptSync(key: string): string | null {
  if (typeof window === "undefined") return null;
  const obscured = localStorage.getItem(key);
  if (!obscured) return null;
  return deobfuscate(obscured);
}

/* ---------------- 异步版本（供组件在异步流程中使用） ---------------- */

export async function encryptAndStore(key: string, value: string): Promise<void> {
  encryptAndStoreSync(key, value);
}

export async function retrieveAndDecrypt(key: string): Promise<string | null> {
  return retrieveAndDecryptSync(key);
}

/* ---------------- 直接对值进行混淆/解混淆（用于 JSON 内联字段） ---------------- */

export function obscureValue(value: string): string {
  return obscure(value);
}

export function deobscureValue(obscured: string): string {
  return deobfuscate(obscured) ?? "";
}

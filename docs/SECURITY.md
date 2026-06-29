# 密钥与安全规范

本规范用于约束 `polaris-learn` 仓库的密钥、证书、构建产物管理,避免敏感信息泄露。所有贡献者在提交前必须遵守。

## v3.0.0 客户端架构安全说明

v3.0.0 起 Polaris 改为纯前端静态化架构,所有数据存储在浏览器本地,所有 LLM 调用由客户端直连。这种架构下的安全特性如下：

### LLM API Key 安全

- **存储位置**：用户的 LLM API Key（DeepSeek / Qwen / OpenAI / Ollama）**仅存储在浏览器 `localStorage`** 中
- **不上传服务器**：应用本身是纯静态的（Next.js `output: 'export'`），没有后端服务器，API Key **永远不会上传到任何服务器**
- **客户端直连**：客户端通过 `fetch` 直接调用 LLM 供应商的 API，请求不经任何中间代理
- **设备隔离**：API Key 仅在当前浏览器/设备有效，不会跨设备同步
- **清除方式**：用户可在「设置」页面手动清除，或通过浏览器「清除站点数据」功能移除

```ts
// 写入（仅在用户主动配置时）
localStorage.setItem('llm_api_key', apiKey);
localStorage.setItem('llm_provider', provider);

// 读取（仅在客户端运行时）
const apiKey = localStorage.getItem('llm_api_key');
```

### 用户密码安全

- **哈希算法**：使用 Web Crypto API 的 **PBKDF2** 算法（基于 SHA-256）
- **迭代次数**：**100000 次**，符合 OWASP 2023 推荐
- **Salt**：每个用户独立生成 **16 字节**随机 salt（`crypto.getRandomValues`）
- **不离开设备**：密码哈希与 salt 仅存储在浏览器 IndexedDB 中，**永不离开客户端设备**
- **无 bcrypt 兼容**：v3.0.0 使用 PBKDF2 替代 v2.x 的 bcrypt，两者不兼容，旧用户需重新设置密码

```ts
// PBKDF2 哈希流程
const salt = crypto.getRandomValues(new Uint8Array(16));
const keyMaterial = await crypto.subtle.importKey('raw', encodedPassword, 'PBKDF2', false, ['deriveBits']);
const hash = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
  keyMaterial,
  256  // 32 bytes
);
```

### 会话 Token 安全

- **生成方式**：使用 `crypto.randomUUID()` 生成密码学安全的 UUID
- **存储位置**：`localStorage`（客户端快速读取）+ IndexedDB `sessions` store（验证有效性）
- **过期机制**：会话 token 有 `expiresAt` 字段，过期后自动失效
- **登出**：清除 `localStorage` 中的 token 与 IndexedDB 中的 session 记录

### 数据存储安全

- **无服务端数据库**：v3.0.0 完全移除了 PostgreSQL / SQLite / Prisma，所有数据存储在浏览器 IndexedDB
- **无 SQL 注入风险**：IndexedDB 是 NoSQL 对象存储，不存在 SQL 注入攻击面
- **无 NextAuth**：完全移除 NextAuth v5 与 OAuth 流程，认证完全在客户端完成
- **数据隔离**：每个浏览器/设备的数据相互隔离，不会跨用户共享
- **数据清除**：用户可通过浏览器「清除站点数据」一键清除所有 IndexedDB 数据与 localStorage

### 架构风险与缓解

| 风险 | 说明 | 缓解措施 |
|------|------|---------|
| API Key 在 localStorage 中可被 JS 读取 | 任何运行在同一源的脚本都能读取 localStorage | v3.0.0 是纯静态应用，不加载第三方脚本；用户应避免在不信任的环境中使用 |
| 用户可查看自己的密码哈希 | 客户端架构无法对设备所有者隐藏数据 | 用户本就该能查看自己的数据，这不构成安全风险 |
| IndexedDB 数据可被浏览器清除 | 用户清除浏览器数据会丢失学习记录 | 提醒用户定期备份；未来可加入导出/导入功能 |
| 浏览器扩展可能读取数据 | 恶意扩展可访问页面 DOM 与 localStorage | 建议用户仅安装可信扩展；或使用隐身模式 |
| LLM API 调用暴露 Key 给供应商 | 客户端直连会暴露 Key 给 LLM API 域名 | 这是直连架构的固有特性，Key 本就该发给供应商进行认证 |

### 与 v2.x 的安全差异

| 维度 | v2.x（已废弃） | v3.0.0 |
|------|----------------|--------|
| API Key 存储 | 服务端环境变量 + 客户端 localStorage（双重） | 仅客户端 localStorage |
| 密码哈希 | bcrypt（服务端 Node.js） | PBKDF2（客户端 Web Crypto API） |
| 会话管理 | NextAuth JWT + 服务端验证 | 本地 token + IndexedDB 验证 |
| 数据库 | SQLite / PostgreSQL | IndexedDB（浏览器原生） |
| SQL 注入风险 | 存在（需 Prisma 参数化查询防护） | **无**（无 SQL 数据库） |
| OAuth 流程 | 支持（NextAuth） | **不支持**（无 NextAuth） |
| 服务端密钥泄露风险 | AUTH_SECRET 等可能泄露 | **无**（无服务端密钥） |

---

## 禁止入库文件清单

| 文件 / 目录 | 禁止入库原因 |
|-------------|--------------|
| `.env` / `.env.local` / `.env.*.local` | 含真实密钥与环境变量(Next.js 本地覆盖文件) |
| `*.keystore` / `*.jks` | Android 应用签名密钥 |
| `*.p12` / `*.pfx` | 代码签名证书及私钥 |
| `*.cert` / `*.cer` / `*.pem` | 证书文件 |
| `key.properties` / `signing.properties` | Android / Electron 签名配置(引用密钥口令) |
| `dev-app-update.yml` | Electron 自动更新配置,可能内嵌 GitHub token |
| `*.code-signing` | Electron 代码签名相关材料 |
| `capacitor.config.ts` | 含本地真值服务器地址,已被 `.gitignore` 忽略 |
| `android/` 目录 | 含本地构建产物与签名配置 |
| `ios/` 目录 | 含本地构建产物 |
| `.next/` / `node_modules/` / `electron-dist/` / `out/` / `build/` | 构建产物与依赖,不应入库 |
| `*.db` / `*.db-journal` | 本地数据库文件,可能含用户数据 |
| `.DS_Store` / `*.log` | 系统文件与调试日志 |

> 这些规则已写入仓库根目录 `.gitignore`。若需新增忽略项,请同步更新本表与 `.gitignore`。

## Android keystore 管理

Android 应用发布签名密钥由维护者本地生成,严禁入库。

```bash
keytool -genkey -v -keystore release.keystore -alias polaris -keyalg RSA -keysize 2048 -validity 10000
```

- 密钥文件 `release.keystore` 应存放于 `~/.android/` 或项目目录之外的安全位置,**不要放在仓库目录内**。
- 在 Gradle 中通过 `key.properties` 引用密钥路径与口令,该文件已被 `.gitignore` 忽略。
- CI 构建时通过 GitHub Actions Secrets 注入 `KEYSTORE_BASE64`、`KEYSTORE_PASSWORD`、`KEY_ALIAS`、`KEY_PASSWORD`,在 workflow 内临时解码生成 `key.properties` 与 keystore,构建结束自动清理。
- 严禁在 `build.gradle`、`capacitor.config.ts` 或任何源文件中硬编码密钥口令。

## Electron 代码签名

桌面端发布需进行代码签名,签名材料严禁入库。

- **Windows**:使用 `.pfx` 证书文件,通过 `CSC_LINK`(证书文件 base64 或路径)与 `CSC_KEY_PASSWORD`(证书口令)环境变量注入。
- **macOS**:使用 Developer ID Application 证书,同样通过 `CSC_LINK` / `CSC_KEY_PASSWORD` 注入;如需公证,通过 `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` 注入。
- 上述环境变量仅在 CI 或本地构建机环境中提供,不写入仓库任何文件。
- `dev-app-update.yml`(本地开发用自动更新配置)已被 `.gitignore` 忽略,因为它可能包含测试 token。

## GitHub Token 管理

- `electron-updater` 自动发布需要 `GH_TOKEN`(或 `GITHUB_TOKEN`),**仅放 CI Secrets**,不在 workflow 文件中硬编码。
- 不要将 token 写入 `dev-app-update.yml`,该文件已被 gitignore。
- 在 workflow 中通过 `secrets.GH_TOKEN` 引用,例如 `env: GH_TOKEN: ${{ secrets.GH_TOKEN }}`。
- 个人访问令牌(PAT)如需用于发布,scope 最小化(只选 `repo` 或更细粒度),并定期轮换。

## CI Secrets 注入

- 所有密钥(数据库连接串、`AUTH_SECRET`、签名口令、API Key、Token 等)通过 GitHub Actions Secrets 管理,在 workflow 中以 `secrets.<NAME>` 引用。
- **禁止在 workflow YAML、shell 脚本、源文件中硬编码任何密钥字面量**。
- 使用 `env:` 上下文注入,而非直接拼接进命令字符串,避免被日志或子进程泄露。
- 对可能被日志打印的敏感输出,使用 `::add-mask::` 或在步骤上设置 `continue-on-error` 配合 `if: always()` 时不打印密钥。
- Secrets 名称应在仓库内统一命名(如 `PROD_AUTH_SECRET`、`ANDROID_KEYSTORE_BASE64`),避免歧义。

## 提交前自查清单

提交前请逐项核对,任何一项未通过都不要提交:

- [ ] ① `git status` 输出中无 `.env` / `.env.local` / 密钥 / 证书 / `android/` / `.next/` / `electron-dist/` 等敏感或构建产物文件
- [ ] ② `git diff --staged` 中无密钥字符串、口令、token、数据库连接串等敏感内容
- [ ] ③ `npm run lint` 通过,无 lint 错误
- [ ] ④ `npm run build` 通过,构建成功
- [ ] ⑤ 未使用 `git add -A` 或 `git add .` 整目录暂存,而是按具体文件名 `git add <file>` 暂存

# 密钥与安全规范

本规范用于约束 `ai-edu-platform` 仓库的密钥、证书、构建产物管理,避免敏感信息泄露。所有贡献者在提交前必须遵守。

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
keytool -genkey -v -keystore release.keystore -alias zixueai -keyalg RSA -keysize 2048 -validity 10000
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

# 贡献指南

感谢你关注 Polaris！本项目是一个纯开源的个人 AI 学习平台（AGPL-3.0），欢迎任何形式的贡献：修复 Bug、新增功能、完善文档、提出建议或翻译。

## 如何贡献

整体流程遵循标准的 Fork → Branch → Commit → PR 工作流：

1. **Fork** 本仓库到你的 GitHub 账号
2. **克隆** Fork 仓库到本地：
   ```bash
   git clone https://github.com/<你的用户名>/polaris-learn.git
   cd polaris-learn
   ```
3. **关联上游**仓库以便同步最新代码：
   ```bash
   git remote add upstream https://github.com/YJLZSL/polaris-learn.git
   ```
4. **创建功能分支**（不要直接在 `main` 上开发）：
   ```bash
   git checkout -b feature/my-feature
   ```
5. **提交更改**，使用 Conventional Commits 规范（见下文）：
   ```bash
   git commit -m "feat: 添加拍照搜题离线缓存"
   ```
6. **推送分支**到你的 Fork：
   ```bash
   git push origin feature/my-feature
   ```
7. 在 GitHub 上发起 **Pull Request**，目标分支为 `main`

## 开发环境设置

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local

# 3. 编辑 .env.local，至少配置 DATABASE_URL 与 AUTH_SECRET
#    平台不内置 LLM Key，可在设置页填入你自己的 Key 用于调试

# 4. 初始化数据库
npx prisma db push
npx prisma generate

# 5. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

> 提示：登录后前往 **设置** 页面填入你的 LLM API Key（如 DeepSeek），Key 仅保存在浏览器本地，不会上传服务器。

## 构建目标

本项目仅支持以下两个构建目标,不要引入其他平台(如 iOS、Tauri 等)的相关代码与依赖:

- **PC 桌面端**:基于 Electron(`npm run electron:build`),支持 Windows / macOS / Linux。
- **Android 移动端**:基于 Capacitor(`npm run android:build`),输出 APK / AAB。

iOS 不在当前支持范围内,相关 `ios/` 目录与配置已被 `.gitignore` 忽略,无需维护。

## 提交前自查清单

提交前请逐项核对(详见 [密钥与安全规范](docs/SECURITY.md)),任何一项未通过都不要提交:

- [ ] ① `git status` 输出中无 `.env` / `.env.local` / 密钥 / 证书 / `android/` / `.next/` / `electron-dist/` 等敏感或构建产物文件
- [ ] ② `git diff --staged` 中无密钥字符串、口令、token、数据库连接串等敏感内容
- [ ] ③ `npm run lint` 通过,无 lint 错误
- [ ] ④ `npm run build` 通过,构建成功
- [ ] ⑤ 未使用 `git add -A` 或 `git add .` 整目录暂存,而是按具体文件名 `git add <file>` 暂存

## 原子提交规范

- **一个逻辑变更一个 commit**:不要把无关的功能、修复、重构混在同一个 commit 里,便于 review 与回滚。
- **禁止 `git add -A` / `git add .` 整工作区暂存**:必须按具体文件名 `git add <file1> <file2>` 暂存,避免误将构建产物、密钥、临时文件入库。
- **禁止提交构建产物与密钥**:包括但不限于 `.next/`、`electron-dist/`、`out/`、`build/`、`android/`、`*.db`、`.env`、`.env.local`、`*.keystore`、`*.pfx`、`key.properties`、`dev-app-update.yml` 等(完整清单见 [docs/SECURITY.md](docs/SECURITY.md))。
- **提交信息遵循 Conventional Commits**(`feat:` / `fix:` / `docs:` / `refactor:` / `chore:` / `test:`),正文简述动机与影响。

## 代码规范

- **TypeScript 严格模式**：所有新增代码需通过类型检查
- **ESLint**：遵循项目已有的 ESLint 配置，提交前确保无 lint 错误
- **Conventional Commits**：提交信息使用规范前缀
  - `feat:` 新功能
  - `fix:` Bug 修复
  - `docs:` 文档变更
  - `refactor:` 重构（不影响功能）
  - `chore:` 构建 / 工具 / 杂项
  - `test:` 测试相关
- **前端规范**
  - 页面组件使用 `"use client"` 指令
  - 必须覆盖 Loading / Error / Empty 三种状态
  - 使用 TailwindCSS 样式
  - 图标统一使用 `react-icons/hi2`
  - 通知统一使用 `react-hot-toast`
- **API 规范**
  - 所有路由需做鉴权检查
  - 统一错误处理与状态码返回

## 提交 PR

提交 Pull Request 前，请确认：

1. **本地通过 lint 与 build**：
   ```bash
   npm run lint
   npm run build
   ```
2. **PR 描述清晰**：说明本次变更的目的、内容、影响范围，如有 UI 变更请附截图
3. **关联 Issue**：如修复某个 Issue，请在描述中注明 `Closes #issue编号`
4. **保持单一职责**：一个 PR 只解决一个问题，便于 review
5. **不要引入新的外部付费依赖**：本项目定位为纯开源个人学习平台，不引入计费 / 后台管理 / API 网关类能力

维护者会在收到 PR 后尽快 review，可能提出修改建议，请耐心配合。

## 报告问题

如果你在使用中发现 Bug 或有功能建议，请通过 [GitHub Issues](https://github.com/YJLZSL/polaris-learn/issues) 反馈：

- 标题简明描述问题
- 在正文中说明：复现步骤、期望行为、实际行为、运行环境（浏览器/系统/部署方式）
- 如有可能，附上截图或错误日志
- 安全漏洞请勿公开 Issue，参见 [Security Policy](SECURITY.md)（如有）或私下联系维护者

## 开源协议

本项目采用 **AGPL-3.0** 协议开源。提交的贡献代码将同样以 AGPL-3.0 协议发布，提交 PR 即视为你同意此协议安排。

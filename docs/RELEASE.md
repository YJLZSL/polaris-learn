# Polaris V2.0 发布流程

本文档规范 `polaris-learn` V2.0 大版本的版本管理、CI/CD 构建、asar repack 验证与 GitHub Release 发布。V2.0 是自学本质回归的 BREAKING 重构大版本，版本号从 v1.0.0 升级到 **v2.0.0**，并保留 v1.0.0 历史不删除。

> 配套文档：[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)（开发与 asar 解压调试）、[ARCHITECTURE.md](./ARCHITECTURE.md)（架构与模块清单）、[SECURITY.md](./SECURITY.md)（密钥与签名）。

---

## 1. V2.0 版本说明（面向用户）

**Polaris 北极星学习平台 V2.0.0** 是自学本质回归的 BREAKING 大版本，抛弃 v1.0 的商业平台范式，做功能减法、做工程规范。

### 主要变更

- **删除商业平台特征**：双货币、排行榜、每日任务、专注护盾、连胜、消灭战、学段自适应 token 全部移除。
- **首页去 Dashboard**：Bento Grid 改为安静桌面（问候语 + 3 入口 + 小灵 + 鼓励语）。
- **AI 老师去阶段化**：删除苏格拉底 6 阶段环形进度，降级为安静对话窗口。
- **知识地图去游戏化**：从 `@antv/g6` 力导向图迁移到自绘 SVG 静态树/网图。
- **错题本去战斗化**：从消灭战改为 Anki 式 SM-2 间隔重复复习卡片。
- **视觉语言 4.0**：单色（北极星靛蓝 #6366F1）+ 安静动效（150ms/300ms 两档 + ease-out）。
- **学段简化**：5 档简化为 3 档（YOUTH/TEEN/ADULT），仅驱动 AI prompt。
- **app.asar 解压调试模式**：`POLARIS_DEV_MODE` 三态 + userData 分桶。

完整变更见 [CHANGELOG.md](../CHANGELOG.md) 的 v2.0.0 条目。

---

## 2. 版本号规范

采用 [语义化版本控制（SemVer）](https://semver.org/lang/zh-CN/)，格式为 `MAJOR.MINOR.PATCH`。

- **MAJOR**：破坏性变更（V2 删除大量商业特征，属 BREAKING）
- **MINOR**：向下兼容的新功能
- **PATCH**：向下兼容的 Bug 修复

版本号统一维护在根目录 `package.json` 的 `version` 字段，V2 目标版本为 **`2.0.0`**，`src/lib/version.ts` 同步。Electron 与 Android 客户端共用此版本号，Android `versionCode` 由 `package.json` 版本自动推导。

### 2.1 版本号同步清单

发布前确认以下位置版本号一致为 `2.0.0`：

- `package.json` → `version`
- `src/lib/version.ts` → 静态版本信息
- Git Tag → `v2.0.0`
- GitHub Release → `v2.0.0`

---

## 3. asar repack 验证（发布前必做）

V2 新增 app.asar 解压调试模式后，发布前**必须**验证最终安装包内只有 `app.asar`，不存在解压态 `app/` 目录。

### 3.1 验证步骤

```bash
# 1. 确认已 repack（回到 packaged 态）
npm run electron:repack
# 若提示"无需 repack"则说明已是 packaged 态，正常

# 2. 重新构建安装包
npm run electron:build

# 3. 验证 app.asar 存在、app/ 目录已删除
ls electron-dist/win-unpacked/resources/
# 应只看到 app.asar（与可能的 app.asar.unpacked），不应看到 app/ 目录

# 4. 验证 app.asar.bak 不存在（备份已恢复）
ls electron-dist/win-unpacked/resources/app.asar.bak 2>nul
# 应提示文件不存在
```

### 3.2 发布红线

- ⚠️ 若 `electron-dist/win-unpacked/resources/` 下存在 `app/` 目录，**禁止发布**——这会导致用户安装的是解压态而非打包态。
- ⚠️ 若 `app.asar.bak` 存在，说明 repack 未完成，必须重新执行 `npm run electron:repack`。
- 启动安装包后访问 `polaris://__health`，应显示 `Mode: packaged`。

---

## 4. CI/CD 构建流程

仓库配置以下 GitHub Actions 工作流：

### 4.1 build-windows.yml（Windows NSIS 安装包）

触发条件：`push` 到 `main`/`master` 分支，或手动 `workflow_dispatch`。

执行步骤：

1. Checkout 代码
2. 设置 Node.js 22
3. `npm ci`
4. `npm run build`
5. `npm run electron:build`
6. 上传产物：`electron-dist/*.exe`、`electron-dist/latest.yml`

产物：`Polaris 北极星学习平台 Setup.exe`（NSIS x64 安装包）。

### 4.2 build-android.yml（Android APK）

触发条件：`push` 到 `main`/`master` 分支，或手动 `workflow_dispatch`。

执行步骤：

1. Checkout 代码
2. 设置 Node.js 22 + Java 17
3. `npm ci`
4. `npm run build`
5. `npx cap sync android`
6. Gradle 构建 release APK（`./gradlew assembleRelease`）
7. 签名 APK（CI keystore）
8. 上传产物：`android/app/build/outputs/apk/release/app-release.apk`

产物：`app-release.apk`（Release 签名版）。V2 收尾 v1.0 遗留——验证 Android release APK 通过 CI 构建成功（v1.0 因网络问题本地未跑通）。

### 4.3 build-unpacked.yml（V2 新增，staging 产物）

触发条件：`push` 到 `main`。

执行步骤：

1. Checkout 代码
2. 设置 Node.js 22
3. `npm ci` → `npm run build` → `npm run electron:build`
4. `npm run electron:unpack`（解压 asar）
5. 上传解压态 `win-unpacked/resources/app/` 作为 staging 产物供测试

> staging 产物仅用于测试解压调试态，不作为正式发行物。

---

## 5. GitHub Release 流程

### 5.1 历史保留原则

- **v1.0.0 Release 保留不删除**：v1.0.0 已正式发布，作为历史参考保留。
- v2.0.0 作为新版本追加发布。
- v4.x / v5.0.0 历史状态由用户决定（V2 不主动清理）。

### 5.2 v2.0.0 发布步骤

1. **确认版本号**：`package.json` 与 `src/lib/version.ts` 均为 `2.0.0`。
2. **asar repack 验证**：按第 3 节流程确认 `app.asar` 存在、`app/` 已删除。
3. **本地构建验证**：
   ```bash
   npm run build
   npx tsc --noEmit
   npm run electron:build
   npm run android:build
   ```
4. **创建 Git Tag**：
   ```bash
   git tag v2.0.0
   git push origin v2.0.0
   ```
5. **等待 CI 构建**：push 到 `main` 触发 `build-windows.yml` 与 `build-android.yml`。
6. **创建 GitHub Release**：
   - Release 标题：`v2.0.0 - 自学本质回归`
   - Release 说明：引用 [CHANGELOG.md](../CHANGELOG.md) 的 v2.0.0 条目。
   - 上传产物：
     - `Polaris 北极星学习平台 Setup.exe`（Windows NSIS）
     - `app-release.apk`（Android）
     - `latest.yml`（electron-updater 元数据）
7. **验证安装**：在干净环境安装 Windows 安装包与 Android APK，确认 `polaris://__health` 显示 `Mode: packaged`。

### 5.3 v1.0.0 历史处理

- 若 v1.0.0 GitHub Release 已发布：保留不动，v2.0.0 作为新版本追加。
- 若 v1.0.0 GitHub Release 未发布（因 v1.0 Android 本地构建未跑通）：直接跳过发布 v1.0.0，只发 v2.0.0。

---

## 6. V2 发布 Checklist

发布前逐项核验：

### 代码与版本

- [ ] `package.json` 版本为 `2.0.0`
- [ ] `src/lib/version.ts` 版本为 `2.0.0`
- [ ] `npx tsc --noEmit` 零错误
- [ ] `npm run lint` 零错误
- [ ] `npm run build` 成功

### asar 验证

- [ ] `npm run electron:repack` 已执行（或提示无需 repack）
- [ ] `electron-dist/win-unpacked/resources/app.asar` 存在
- [ ] `electron-dist/win-unpacked/resources/app/` 目录不存在
- [ ] `electron-dist/win-unpacked/resources/app.asar.bak` 不存在
- [ ] 安装后 `polaris://__health` 显示 `Mode: packaged`

### 商业特征清除验证

- [ ] 首页无 Bento Grid、无任务卡、无连胜、无 XP、无双货币
- [ ] AI 老师页无 6 阶段环形进度
- [ ] 知识地图为 SVG 静态图（无 `@antv/g6` 残留 import）
- [ ] 错题本为 Anki 复习卡片（无消灭战 60 秒倒计时）
- [ ] 路由无 `/leaderboard`
- [ ] 全应用无 `#F59E0B` 作为奖励色

### 构建产物

- [ ] Windows NSIS 安装包构建成功（`npm run electron:build`）
- [ ] Android release APK 构建成功（`npm run android:build` 或 CI）
- [ ] 安装包文件名含 `2.0.0`

### 发布

- [ ] Git Tag `v2.0.0` 已推送
- [ ] CI 构建成功（build-windows.yml + build-android.yml）
- [ ] GitHub Release v2.0.0 已创建，产物已上传
- [ ] v1.0.0 Release 保留未删除
- [ ] 干净环境安装验证通过

---

## 7. 密钥与签名

> 详细密钥管理见 [SECURITY.md](./SECURITY.md)。

- **Windows**：NSIS 安装包使用 code signing certificate 签名（若有）；无证书则跳过签名，用户首次安装会有 SmartScreen 警告。
- **Android**：CI 使用 GitHub Secrets 注入 keystore 与密码，签名 release APK。
- **敏感文件不入库**：`.env`、`*.keystore`、`*.pfx`、`*.cer` 已在 `.gitignore` 排除。

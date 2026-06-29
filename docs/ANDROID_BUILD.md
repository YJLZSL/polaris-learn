# Polaris - Android APK 构建指南（v3.0.0 静态化）

> v3.0.0 起 Polaris 改为纯前端静态化架构，所有数据存储在浏览器 IndexedDB，所有 LLM 调用由客户端直连。Android 端通过 Capacitor 将静态产物 `out/` 内嵌到原生 WebView 中运行，**无需后端服务器**。

## 前置条件

在开始构建 Android APK 之前，请确保你的开发环境满足以下要求：

### 1. 安装 Android Studio
- 下载并安装 [Android Studio](https://developer.android.com/studio)
- 安装时勾选 **Android SDK** 和 **Android SDK Platform-Tools**

### 2. 配置 Android SDK
- 打开 Android Studio → SDK Manager
- 安装至少一个 **Android API Level 34+** 的 SDK Platform
- 安装 **Android SDK Build-Tools**
- 确保安装了 **Android Gradle Plugin (AGP)** 所需的组件

### 3. 配置环境变量（重要）

将以下路径添加到系统环境变量 `PATH` 中：

```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

其中 `%ANDROID_HOME%` 通常是：
- Windows: `C:\Users\<你的用户名>\AppData\Local\Android\Sdk`
- macOS: `~/Library/Android/sdk`
- Linux: `~/Android/Sdk`

### 4. 安装 Java JDK 17+
- Android Gradle Plugin 8.x 需要 JDK 17 或更高版本
- 确保 `JAVA_HOME` 环境变量正确指向 JDK 安装目录

### 5. Node.js 和 npm
- Node.js 18+ 已安装（项目已有）

> **v3.0.0 重要变化**：无需配置任何环境变量（如 `DATABASE_URL`、`AUTH_SECRET`、`CAPACITOR_SERVER_URL`），无需运行 `prisma db push` 或 `prisma db seed`。应用本身是纯静态的，所有数据由 IndexedDB 在客户端持久化。

---

## Capacitor 配置说明（v3.0.0）

### `capacitor.config.ts` 关键配置

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polaris.learn',
  appName: 'Polaris',
  webDir: 'out',                  // ← 指向 Next.js 静态导出目录
  server: {
    androidScheme: 'https',      // ← 强制 HTTPS scheme
    // 注意：v3.0.0 不再设置 server.url
    // 让 WebView 直接加载本地 out/ 目录的静态文件
  },
};

export default config;
```

**与 v2.x 的差异**：

| 配置项 | v2.x（已废弃） | v3.0.0 |
|--------|----------------|--------|
| `webDir` | `'www'` 或未设置 | `'out'`（Next.js 静态导出目录） |
| `server.url` | 指向生产 Next.js 服务地址 | **不设置**（加载本地静态文件） |
| `server.androidScheme` | 未设置 | `'https'` |
| 后端服务依赖 | 必须有运行中的 Next.js 服务 | **无**（纯静态） |

### `network_security_config.xml`

为允许 Android WebView 连接本地 Ollama 服务（用于本地大模型推理），需要白名单 localhost 与局域网 IP。该文件位于：

```
android/app/src/main/res/xml/network_security_config.xml
```

并在 `AndroidManifest.xml` 中引用：

```xml
<application
    android:usesCleartextTraffic="true"
    android:networkSecurityConfig="@xml/network_security_config">
```

> 此配置解决了 v2.x 中 Android 启动时的 `ERR_CLEARTEXT_NOT_PERMITTED` 错误。

---

## 构建步骤

### 第一步：初始化 Capacitor Android（首次执行）

```bash
npm run android:init
```

此命令会执行：
- `npx cap init Polaris com.polaris.learn --web-dir=out`
- `npx cap add android`

> **注意**：此步骤仅需在首次构建或重新生成 Android 项目时执行。若 `android/` 目录已存在则可跳过。

### 第二步：构建 Next.js 静态站点并同步

```bash
npm run android:build
```

此命令会：
1. 运行 `next build`（启用 `output: 'export'`）生成静态站点到 `out/` 目录
2. 执行 `cap sync android` 将 Web 资源同步到 Android 项目

你也可以使用 PowerShell 脚本完成相同操作：

```powershell
.\scripts\build-apk.ps1
```

> v3.0.0 起无需运行 `prisma db push` 或 `prisma db seed`，所有数据初始化在应用首次启动时由前端自动完成（向 IndexedDB 注入种子数据）。

### 第三步：生成 APK

进入 Android 项目目录，使用 Gradle 构建：

```bash
cd android

# 生成 Debug APK（开发测试用）
.\gradlew assembleDebug

# 生成 Release APK（需配置签名密钥）
.\gradlew assembleRelease
```

> **Debug APK** 可直接安装测试，无需签名配置。
> **Release APK** 需要先配置签名密钥文件，参见下文「签名配置」章节。

### 第四步：获取 APK 文件

构建成功后，APK 文件位于：

```
android/app/build/outputs/apk/
```

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## 签名配置（Release APK）

如需构建可发布的 Release APK，需先配置签名：

### 1. 生成签名密钥

```bash
keytool -genkey -v -keystore polaris-release.keystore \
  -alias polaris -keyalg RSA -keysize 2048 -validity 10000
```

### 2. 创建 `android/key.properties`

```properties
storePassword=<你设置的密码>
keyPassword=<你设置的密码>
keyAlias=polaris
storeFile=../polaris-release.keystore
```

---

## 常见问题

### Q: 提示"找不到 Android SDK"
**A**: 检查 `ANDROID_HOME` 环境变量是否正确设置，或通过 Android Studio SDK Manager 确认 SDK 路径。

### Q: Gradle 构建速度很慢
**A**: 首次构建 Gradle 会下载依赖，需要较好的网络环境。可考虑配置国内镜像源（见下文「网络问题排查」）。

## 网络问题排查（SSL 握手失败 / 依赖下载超时）

在中国大陆网络环境下，Gradle 下载分发包或依赖时可能遇到：
- `SSLHandshakeException: PKIX path building failed`（下载 `gradle-*-all.zip` 时）
- `Remote host terminated the handshake`（连接 `dl.google.com` 时）
- `Read timed out`（依赖下载超时）

### 方案 1：使用本地缓存的 Gradle 分发包

若 `~/.gradle/wrapper/dists/` 下已有对应版本的 `gradle-*-all.zip`，可修改 `android/gradle/wrapper/gradle-wrapper.properties`，将 `distributionUrl` 指向本地文件：

```properties
distributionUrl=file\:///C:/Users/<你的用户名>/.gradle/wrapper/dists/gradle-8.14.3-all/<hash>/gradle-8.14.3-all.zip
```

### 方案 2：配置阿里云 Maven 镜像（推荐）

创建 `android/init-mirror.gradle`，将 Google Maven 和 Maven Central 重定向到阿里云镜像：

```groovy
allprojects {
    repositories {
        maven { url 'https://maven.aliyun.com/repository/google' }
        maven { url 'https://maven.aliyun.com/repository/public' }
        maven { url 'https://maven.aliyun.com/repository/central' }
        google()
        mavenCentral()
    }
}
```

构建时通过 `--init-script` 传入：

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew assembleDebug --init-script init-mirror.gradle --no-daemon
```

> **注意**：`init-mirror.gradle` 已在 `.gitignore` 的 `/android/` 规则中被忽略，不会提交到仓库。每位开发者需自行创建。

### 方案 3：组合使用

若分发包和依赖都下载失败，需同时使用方案 1（本地分发包）+ 方案 2（镜像），即可完成首次构建。构建成功后，依赖会被缓存到 `~/.gradle/caches/`，后续构建可直接使用 `--offline` 标志。

### Q: `capacitor.config.ts` 被 .gitignore 忽略了
**A**: 是的，该文件包含本地开发配置。首次 clone 项目后请自行创建该文件，参考本文档「Capacitor 配置说明」章节中的配置模板。

### Q: Next.js 构建报错
**A**: 确保 `next.config.ts` 中 `output: 'export'` 已正确配置。检查是否有使用不支持静态导出的 Next.js 特性（如 middleware、ISR、server components、API Routes 等）。v3.0.0 已移除所有 API Routes，理论上不应有此问题。

### Q: APK 启动后白屏 / 报错 `ERR_CLEARTEXT_NOT_PERMITTED`
**A**: 检查 `AndroidManifest.xml` 是否同时配置了：
1. `android:usesCleartextTraffic="true"`
2. `android:networkSecurityConfig="@xml/network_security_config"`

并确认 `android/app/src/main/res/xml/network_security_config.xml` 文件存在且包含 localhost 与 10.0.2.2 白名单。

### Q: APK 中无法连接 Ollama 本地服务
**A**: 这是 `network_security_config.xml` 没有正确白名单 localhost/127.0.0.1/10.0.2.2 所致。请确认配置中包含：

```xml
<domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">127.0.0.1</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">10.0.0.0/8</domain>
</domain-config>
```

---

## 快速参考

| 命令 | 说明 |
|------|------|
| `npm run android:init` | 初始化 Capacitor Android 项目（首次执行） |
| `npm run android:build` | 构建静态站点并同步到 Android |
| `npm run android:sync` | 仅同步 Web 资源到 Android（不重新构建） |
| `npm run android:open` | 在 Android Studio 中打开项目 |
| `npm run android:dev` | 开发模式（热更新 + Android 模拟器） |
| `cd android && ./gradlew assembleDebug` | 构建 Debug APK |
| `cd android && ./gradlew assembleRelease` | 构建 Release APK（需签名配置） |

## v3.0.0 与 v2.x 构建流程对比

| 步骤 | v2.x（已废弃） | v3.0.0 |
|------|----------------|--------|
| 1 | `npm install` | `npm install` |
| 2 | `cp .env.example .env.local` | ❌ 不需要 |
| 3 | `npx prisma db push` | ❌ 不需要 |
| 4 | `npx prisma db seed` | ❌ 不需要（前端首次启动自动注入） |
| 5 | `npm run android:build` | `npm run android:build` |
| 6 | `cd android && ./gradlew assembleDebug` | `cd android && ./gradlew assembleDebug` |

v3.0.0 把 4 个步骤简化为 2 个步骤，且无需任何环境变量配置。

## 相关文档

- [架构说明](./ARCHITECTURE.md) - v3.0.0 静态化架构设计
- [部署指南](./DEPLOYMENT.md) - 各平台部署方案
- [安全规范](./SECURITY.md) - 密钥与数据安全
- [README](../README.md) - 项目概览

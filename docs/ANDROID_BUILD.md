# Polaris - Android APK 构建指南（V1.0）

> V1.0 是 Polaris 的全新大版本，版本号从 v5.0.0 重置为 **v1.0.0**。Android 端通过 Capacitor 8 将 Vite 构建产物 `dist/` 内嵌到原生 WebView 中运行，**无需后端服务器**。本指南描述 V1.0 的 Release APK 完整构建流程、环境要求、常见问题与中国大陆网络环境下的镜像配置。

## 前置条件

### 1. 安装 Android Studio

- 下载并安装 [Android Studio](https://developer.android.com/studio)（推荐最新稳定版）。
- 安装时勾选 **Android SDK** 和 **Android SDK Platform-Tools**。

### 2. 配置 Android SDK

- 打开 Android Studio → SDK Manager。
- 安装 **Android API Level 34+** 的 SDK Platform。
- 安装 **Android SDK Build-Tools**。
- 安装 **Android Gradle Plugin (AGP)** 所需的组件。
- 最低目标 API 为 **28**（Android 9），编译目标为 **34+**。

### 3. 配置环境变量

将以下路径添加到系统环境变量 `PATH`：

```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

其中 `%ANDROID_HOME%` 通常是：

- Windows: `C:\Users\<用户名>\AppData\Local\Android\Sdk`
- macOS: `~/Library/Android/sdk`
- Linux: `~/Android/Sdk`

### 4. 安装 Java JDK 17+

- Android Gradle Plugin 8.x 需要 JDK 17 或更高版本。
- 确保 `JAVA_HOME` 环境变量正确指向 JDK 安装目录，例如：

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
```

### 5. Node.js 和 npm

- Node.js 18+（推荐 LTS）。
- 项目根目录运行 `npm install` 安装依赖。

> V1.0 仍保持纯前端 SPA 架构，无需配置数据库、无需运行后端服务、无需 `.env` 真值。

## V1.0 Capacitor 配置

`capacitor.config.ts` 关键配置：

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polaris.learn',
  appName: 'Polaris',
  webDir: 'dist',                  // Vite 构建产物目录
  server: {
    androidScheme: 'https',        // 强制 HTTPS scheme
  },
};

export default config;
```

| 配置项 | V1.0 值 | 说明 |
|--------|---------|------|
| `webDir` | `'dist'` | Vite 构建产物目录 |
| `server.url` | **不设置** | 加载本地静态文件，不连接远程服务 |
| `server.androidScheme` | `'https'` | 强制 HTTPS scheme |
| `android.allowMixedContent` | **不设置** | 启动时无 HTTP 请求，无需混合内容 |
| 后端服务依赖 | **无** | 纯静态 SPA |

### 本地 Ollama 网络安全配置

V1.0 应用启动时不再发起任何 HTTP 请求，但用户可能通过 AI 老师连接本地 Ollama 服务，因此仍需白名单 localhost 与局域网 IP。配置文件：

```
android/app/src/main/res/xml/network_security_config.xml
```

并在 `AndroidManifest.xml` 中引用：

```xml
<application
    android:usesCleartextTraffic="true"
    android:networkSecurityConfig="@xml/network_security_config">
```

`network_security_config.xml` 示例：

```xml
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

## V1.0 构建流程

### 第一步：初始化 Capacitor Android（首次执行）

```bash
npm run android:init
```

此命令会执行：

- `npx cap init Polaris com.polaris.learn --web-dir=dist`
- `npx cap add android`

> 仅需在首次构建或重新生成 Android 项目时执行。若 `android/` 目录已存在则可跳过。

### 第二步：构建 Web 资源并同步到 Android

```bash
npm run android:build
```

此命令等价于：

```bash
vite build && npx cap sync android
```

它会：

1. 运行 `vite build` 生成静态站点到 `dist/` 目录。
2. 执行 `cap sync android` 将 Web 资源同步到 Android 项目。

也可以使用 PowerShell 脚本：

```powershell
.\scripts\build-apk.ps1
```

### 第三步：配置 Release 签名

Release APK 必须配置签名才能安装到普通设备或分发。详见下文「Release 签名配置」。

### 第四步：构建 Release APK

```bash
cd android
.\gradlew assembleRelease
```

构建成功后，APK 位于：

```
android/app/build/outputs/apk/release/app-release.apk
```

### 完整一键命令（PowerShell）

```powershell
npm run android:build
cd android
.\gradlew assembleRelease
```

## Release 签名配置

### 1. 生成签名密钥

```bash
keytool -genkey -v -keystore polaris-release.keystore `
  -alias polaris -keyalg RSA -keysize 2048 -validity 10000
```

> 请妥善保管 `polaris-release.keystore` 与密码，丢失后无法更新同一签名的 APK。

### 2. 创建 `android/key.properties`

```properties
storePassword=<你的密钥库密码>
keyPassword=<你的别名密码>
keyAlias=polaris
storeFile=../polaris-release.keystore
```

### 3. 在 `android/app/build.gradle` 中引用

```groovy
android {
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("key.properties")
            def keystoreProperties = new Properties()
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4. CI/CD 签名（GitHub Actions）

在仓库 Settings → Secrets and variables → Actions 中配置：

- `ANDROID_KEYSTORE_BASE64`：将 `polaris-release.keystore` 进行 base64 编码后的字符串。
- `ANDROID_KEYSTORE_PASSWORD`：密钥库密码。
- `ANDROID_KEY_ALIAS`：别名，例如 `polaris`。
- `ANDROID_KEY_PASSWORD`：别名密码。

Workflow 示例片段：

```yaml
- name: Decode keystore
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/polaris-release.keystore

- name: Build Release APK
  run: |
    cd android
    ./gradlew assembleRelease
```

## 常见问题

### Q: 提示"找不到 Android SDK"

**A**: 检查 `ANDROID_HOME` 环境变量是否正确设置，或在 Android Studio SDK Manager 中确认 SDK 路径。

### Q: Gradle 构建速度很慢或依赖下载失败

**A**: 首次构建 Gradle 会下载分发包与依赖。在中国大陆网络环境下，建议配置国内镜像（见下文「中国大陆网络镜像配置」）。

### Q: APK 启动后白屏

**A**: V1.0 已通过以下手段解决：

1. `index.html` 移除所有外部 CDN，字体本地托管。
2. Capacitor 原生环境不注册 Service Worker。
3. `capacitor.config.ts` 中 `webDir: 'dist'` 指向本地静态文件。

如仍白屏，请检查：

- `npm run android:build` 是否成功执行（`dist/index.html` 是否存在）。
- `cap sync android` 是否成功同步资源。
- Android Studio Logcat 是否有 WebView 加载错误。

### Q: `ERR_CLEARTEXT_NOT_PERMITTED` 错误

**A**: 应用启动本身不再发起 HTTP 请求。若在使用本地 Ollama 时出现此错误，请确认 `network_security_config.xml` 已正确白名单 `localhost` / `127.0.0.1` / `10.0.2.2`。

### Q: Vite 构建报错

**A**: 检查 `npm install` 是否完成，运行 `npx tsc --noEmit` 定位类型错误。确保 Node.js 版本 ≥ 18。

### Q: `capacitor.config.ts` 是否需要本地创建

**A**: 不需要。V1.0 已将 `capacitor.config.ts` 纳入版本控制，直接随仓库提供。

## 中国大陆网络镜像配置

在中国大陆网络环境下，Gradle 下载分发包或依赖时可能遇到 `SSLHandshakeException`、`Read timed out` 等问题。推荐以下方案。

### 方案 1：配置阿里云 Maven 镜像（推荐）

创建 `android/init-mirror.gradle`（已被 `.gitignore` 忽略，不会提交）：

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
cd android
.\gradlew assembleRelease --init-script init-mirror.gradle --no-daemon
```

### 方案 2：使用本地 Gradle 分发包

若 `~/.gradle/wrapper/dists/` 下已有对应版本的 `gradle-*-all.zip`，可修改 `android/gradle/wrapper/gradle-wrapper.properties`，将 `distributionUrl` 指向本地文件：

```properties
distributionUrl=file\:///C:/Users/<用户名>/.gradle/wrapper/dists/gradle-8.14.3-all/<hash>/gradle-8.14.3-all.zip
```

### 方案 3：组合使用

若分发包和依赖都下载失败，可同时使用方案 1（镜像）+ 方案 2（本地分发包）。构建成功后，依赖会被缓存到 `~/.gradle/caches/`，后续构建可尝试加 `--offline`。

## 快速参考

| 命令 | 说明 |
|------|------|
| `npm run android:init` | 初始化 Capacitor Android 项目（首次执行） |
| `npm run android:build` | 构建 Vite 静态站点并同步到 Android |
| `npm run android:sync` | 仅同步 Web 资源到 Android（不重新构建） |
| `npm run android:open` | 在 Android Studio 中打开项目 |
| `npm run android:dev` | 开发模式（Vite + Android 模拟器） |
| `cd android && ./gradlew assembleDebug` | 构建 Debug APK |
| `cd android && ./gradlew assembleRelease` | 构建 Release APK（需签名配置） |

## 相关文档

- [架构说明](./ARCHITECTURE.md) - V1.0 架构设计、平台抽象层、离线策略
- [部署指南](./DEPLOYMENT.md) - 各平台部署方案
- [安全规范](./SECURITY.md) - 密钥与数据安全
- [UI_DESIGN.md](./UI_DESIGN.md) - "深空北极星"设计系统
- [ANIMATION.md](./ANIMATION.md) - 动效规范
- [README](../README.md) - 项目概览

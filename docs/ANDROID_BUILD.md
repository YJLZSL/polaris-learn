# Polaris - Android APK 构建指南

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

---

## 构建步骤

### 第一步：初始化 Capacitor Android（首次执行）

```bash
npm run android:init
```

此命令会：
- 初始化 Capacitor 配置
- 创建 `android/` 目录并生成 Android 原生项目

> **注意**：此步骤仅需在首次构建或重新生成 Android 项目时执行。

### 第二步：构建 Next.js 静态站点并同步

```bash
npm run android:build
```

此命令会：
1. 运行 `next build` 生成静态站点到 `out/` 目录
2. 执行 `cap sync android` 将 Web 资源同步到 Android 项目

你也可以使用 PowerShell 脚本完成相同操作：

```powershell
.\scripts\build-apk.ps1
```

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
**A**: 首次构建 Gradle 会下载依赖，需要较好的网络环境。可考虑配置国内镜像源。

### Q: `capacitor.config.ts` 被 .gitignore 忽略了
**A**: 是的，该文件包含本地开发配置。首次 clone 项目后请自行创建该文件，参考 `ANDROID_BUILD.md` 中的配置模板。

### Q: Next.js 构建报错
**A**: 确保 `next.config.ts` 中 `output: 'export'` 已正确配置。检查是否有使用不支持静态导出的 Next.js 特性（如 middleware、ISR、server components 等）。

---

## 快速参考

| 命令 | 说明 |
|------|------|
| `npm run android:init` | 初始化 Capacitor Android 项目 |
| `npm run android:build` | 构建静态站点并同步到 Android |
| `npm run android:sync` | 仅同步 Web 资源到 Android（不重新构建） |
| `npm run android:open` | 在 Android Studio 中打开项目 |
| `npm run android:dev` | 开发模式（热更新 + Android 模拟器） |

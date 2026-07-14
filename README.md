# 灵犀学院 Lingxi Academy

> 引导式 AI 学习应用 —— 让每个人都能在 AI 时代学会学习

[![CI](https://github.com/lingxiacademy/lingxi-academy/actions/workflows/ci.yml/badge.svg)](https://github.com/lingxiacademy/lingxi-academy/actions/workflows/ci.yml)
[![Release](https://github.com/lingxiacademy/lingxi-academy/actions/workflows/release.yml/badge.svg)](https://github.com/lingxiacademy/lingxi-academy/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Windows%20%7C%20macOS-blue)](https://github.com/lingxiacademy/lingxi-academy)
[![Flutter](https://img.shields.io/badge/Flutter-3.44.4-02569B?logo=flutter)](https://flutter.dev)
[![Stars](https://img.shields.io/github/stars/lingxiacademy/lingxi-academy?style=social)](https://github.com/lingxiacademy/lingxi-academy)

灵犀学院是一款开源的引导式 AI 学习应用，致力于帮助用户在人工智能时代掌握学习的方法与思维。应用以**苏格拉底式对话**为核心教学方式——通过引导式提问而非直接给答案，培养用户的批判性思维与自主学习能力。

## 核心理念

- **非商业化** —— 项目以 MIT 协议开源，不内置任何付费墙或广告，不以盈利为目的。
- **用户自备 API** —— 应用本身不分发 AI 服务，用户需自行配置自己的 API Key（OpenAI / Claude / Gemini / Ollama）。API Key 仅本地加密存储，**永不上传**。
- **苏格拉底式引导** —— AI 导师以提问引导思考，而非直接给出答案，培养独立思考与问题拆解能力。

## 吉祥物小犀

小犀是一只星空小犀牛，头戴学士帽、身披星光翅膀，是灵犀学院的学习伙伴。它拥有 6 种情绪状态（待机 / 开心 / 思考 / 难过 / 庆祝 / 好奇），会随学习进程联动变化——AI 思考时它会托腮沉思，完成知识点时它会欢呼撒花，连续点击 5 次还能触发彩蛋。名字取自"心有灵犀一点通"，寓意学习中的灵光乍现。

## 学习路径 L0-L4

灵犀学院提供五层渐进式学习路径，从零基础到进阶实践：

| 级别 | 定位 | 内容方向 |
|------|------|----------|
| **L0** | 启蒙 | AI 基础概念与工具入门 |
| **L1** | 基础 | 编程语言与提示词工程基础 |
| **L2** | 进阶 | 机器学习与数据处理 |
| **L3** | 实践 | 深度学习与模型训练 |
| **L4** | 应用 | AI 项目实战与部署 |

每个知识点包含：知识卡片学习 → 测验检验 → 苏格拉底式对话深化，完成即解锁下一节点。

<!-- 截图：首页吉祥物欢迎区（后续补充） -->
<!-- 截图：学习路径 L0-L4 路线图（后续补充） -->
<!-- 截图：对话页苏格拉底引导（后续补充） -->
<!-- 截图：成就页徽章网格（后续补充） -->

## 功能特性

- 🤔 **引导式学习** —— 苏格拉底式问答，AI 不给答案给引导，通过提问激发思考
- 💬 **自由对话** —— 支持配置 OpenAI / Claude / Gemini / Ollama 四类 Provider，自由切换模型
- 📚 **学习路径 L0-L4** —— 结构化知识点卡片 + 测验 + 苏格拉底对话，循序渐进
- 🦏 **吉祥物小犀** —— 6 状态机情绪联动，点击交互，连点 5 次触发彩蛋
- 🔥 **Streak 连续打卡** —— 连续学习天数追踪 + 成就徽章系统，保持学习动力
- 🔍 **分级探索** —— 简化 / 深入 / 图示三按钮，按需调整 AI 回复的详略程度
- 🔒 **数据安全** —— API Key 硬件级加密存储（flutter_secure_storage），日志自动脱敏，永不上传
- 🖥️ **三端支持** —— Android + Windows + macOS，一套代码跨平台运行
- 📝 **富文本渲染** —— Markdown 渲染 + LaTeX 数学公式 + 代码高亮

## 下载安装

前往 [GitHub Releases](https://github.com/lingxiacademy/lingxi-academy/releases) 下载最新版本：

- **Android**：下载 `.apk` 文件直接安装
- **Windows**：下载 `.zip` 解压后运行 `.exe`
- **macOS**：下载 `.dmg` 拖入 Applications

> 首次启动后会进入引导页，带领你完成 API 配置。

## 快速开始

### 1. 下载并安装应用

从 [Releases 页面](https://github.com/lingxiacademy/lingxi-academy/releases) 下载对应平台的安装包。

### 2. 首次启动引导

首次启动会进入 5 步引导页：欢迎 → 自备 API 说明 → 小犀彩蛋介绍 → 学习路径介绍 → 苏格拉底式引导介绍。

### 3. 配置 API

引导完成后，进入 **API 设置向导**（或设置 → AI 服务 → 添加 Provider），选择你要使用的服务商：

- **OpenAI 兼容**（OpenAI / DeepSeek / 其他兼容服务）
- **Anthropic Claude**
- **Google Gemini**
- **Ollama**（本地部署，无需 API Key）

填入你的 API Key 与模型名，点击"测试连接"验证通过后即可使用。详见 [API 设置向导](https://github.com/lingxiacademy/lingxi-academy/blob/main/docs/architecture.md#ai-调用流程)。

### 4. 开始学习或对话

- **学习路径**：从首页进入"学习路径"，选择 L0 课程开始
- **自由对话**：从首页进入"对话"，直接与 AI 交流

## 构建指南

### 环境要求

| 项 | 要求 |
|----|------|
| Flutter SDK | 3.44.4（推荐），兼容 `sdk: '>=3.10.0 <4.0.0'` |
| Dart SDK | 3.12.2（随 Flutter 3.44.4 自带） |
| Android | minSdkVersion 24 |
| Windows | Windows 10+，需启用开发者模式 + Visual Studio C++ build tools |
| macOS | 11.0+，需 Xcode 命令行工具 |

### 从源码构建

```bash
# 1. 克隆仓库
git clone https://github.com/lingxiacademy/lingxi-academy.git
cd lingxi-academy

# 2. 安装依赖
flutter pub get

# 3. 运行代码生成（Drift / Riverpod / JSON）
flutter pub run build_runner build --delete-conflicting-outputs

# 4. 运行应用（开发模式）
flutter run

# 5. 构建发布版本
flutter build apk --release      # Android
flutter build windows --release  # Windows
flutter build macos --release    # macOS
```

### 各端运行命令

```bash
flutter run -d <android-device-id>  # Android 设备
flutter run -d windows               # Windows 桌面
flutter run -d macos                 # macOS 桌面
flutter devices                      # 列出可用设备
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Flutter](https://flutter.dev) | 3.44.4 | 跨平台 UI 框架 |
| [flutter_riverpod](https://riverpod.dev) | ^2.5.1 | 状态管理（主框架） |
| [riverpod_annotation](https://pub.dev/packages/riverpod_annotation) | ^2.3.5 | Riverpod 代码生成注解 |
| [go_router](https://pub.dev/packages/go_router) | ^14.2.0 | 声明式路由 |
| [drift](https://pub.dev/packages/drift) | ^2.18.0 | 类型安全 SQLite ORM |
| [sqlite3_flutter_libs](https://pub.dev/packages/sqlite3_flutter_libs) | ^0.5.24 | 桌面端 SQLite FFI |
| [sqlcipher_flutter_libs](https://pub.dev/packages/sqlcipher_flutter_libs) | ^0.6.4 | 加密 SQLite（预留） |
| [flutter_secure_storage](https://pub.dev/packages/flutter_secure_storage) | ^9.2.2 | API Key 加密存储 |
| [dio](https://pub.dev/packages/dio) | ^5.4.3+1 | HTTP 客户端 |
| [rive](https://rive.app) | ^0.13.13 | 吉祥物动画（目标方案） |
| [lottie](https://pub.dev/packages/lottie) | ^3.1.2 | 备用动画 |
| [flutter_svg](https://pub.dev/packages/flutter_svg) | ^2.0.10+1 | SVG 渲染 |
| [flutter_markdown](https://pub.dev/packages/flutter_markdown) | ^0.7.2+1 | Markdown 渲染 |
| [flutter_highlight](https://pub.dev/packages/flutter_highlight) | ^0.7.0 | 代码高亮 |
| [flutter_math_fork](https://pub.dev/packages/flutter_math_fork) | ^0.7.2 | 数学公式渲染 |
| [google_fonts](https://pub.dev/packages/google_fonts) | ^6.2.1 | 字体（Noto Sans SC + Quicksand） |
| [intl](https://pub.dev/packages/intl) | ^0.20.2 | 国际化工具 |
| [shared_preferences](https://pub.dev/packages/shared_preferences) | ^2.2.3 | KV 偏好存储 |
| [uuid](https://pub.dev/packages/uuid) | ^4.4.0 | UUID v4 主键生成 |

## 项目结构

```
lingxi-academy/
├── lib/
│   ├── main.dart                     # 应用入口
│   ├── app.dart                      # MaterialApp 根 Widget
│   ├── core/                         # 核心层：主题、路由、常量、动画
│   │   ├── constants/
│   │   ├── motion/
│   │   ├── providers/
│   │   ├── router/
│   │   └── theme/
│   ├── data/                         # 数据层：Drift 数据库、模型、仓库
│   │   ├── db/
│   │   ├── models/
│   │   ├── providers/
│   │   ├── repositories/
│   │   └── services/
│   ├── features/                     # 功能层：按业务模块组织
│   │   ├── achievements/             #   成就页
│   │   ├── ai/                       #   AI Provider 抽象与实现、SSE、安全日志
│   │   ├── chat/                     #   对话列表与对话页
│   │   ├── help/                     #   帮助中心
│   │   ├── home/                     #   首页
│   │   ├── learning/                 #   学习路径与课时
│   │   ├── mascot/                   #   吉祥物小犀
│   │   ├── notes/                    #   笔记
│   │   ├── onboarding/               #   引导与 API 配置向导
│   │   ├── progress/                 #   进度统计、成就、连续学习
│   │   └── settings/                 #   设置、API 配置
│   └── shared/                       # 共享层：跨 feature 复用组件与工具
│       ├── utils/
│       └── widgets/
├── assets/                           # 静态资源
│   ├── images/
│   ├── courses/
│   ├── rive/
│   └── prompts/
├── docs/                             # 项目文档
├── test/                             # 测试
├── .github/workflows/                # CI/CD 配置
├── pubspec.yaml
└── config.example.json               # 配置文件示例
```

## 贡献

欢迎参与项目贡献！无论是修复 Bug、完善文档，还是开发新功能，每一份贡献都让这个项目变得更好。

请阅读 [贡献指南](CONTRIBUTING.md) 了解如何提交 Issue、修复 Bug 或开发新功能。AI 协作者请额外阅读 [AGENTS.md](AGENTS.md) 了解项目约定与安全红线。

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

## 致谢

灵犀学院在设计与开发过程中参考了以下优秀项目与资源，在此表示衷心感谢：

- [LearnLM](https://blog.google/technology/learnlm/) —— Google 的学习模型，引导式学习五原则的方法论参考
- [Material 3 Expressive](https://m3.material.io/) —— Google 设计系统，提供动态配色与组件规范
- [Flutter](https://flutter.dev) —— 跨平台应用开发框架，让一套代码运行于三端成为可能
- [Khanmigo](https://www.khanmigo.ai/) —— Khan Academy 的 AI 导师，启发式教学理念的灵感来源
- [mlabonne/llm-course](https://github.com/mlabonne/llm-course) —— LLM 系统化课程的内容结构参考
- 所有为开源社区做出贡献的开发者们

## 相关文档

- [AGENTS.md](AGENTS.md) —— AI 协作者规范（项目约定、代码规范、安全红线）
- [docs/architecture.md](docs/architecture.md) —— 架构设计文档（分层架构、数据流、AI 调用流程、路由结构）
- [docs/mascot-design.md](docs/mascot-design.md) —— 吉祥物小犀设计文档（设定、6 状态机、Rive 升级方案）
- [docs/frontend-redesign-guide.md](docs/frontend-redesign-guide.md) —— 前端界面重设计指南
- [docs/ci-badge-urls.md](docs/ci-badge-urls.md) —— CI/CD 徽章 URL 参考
- [CONTRIBUTING.md](CONTRIBUTING.md) —— 贡献指南

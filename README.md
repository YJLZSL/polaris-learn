# 灵犀学院 Lingxi Academy

> 引导式 AI 学习应用 —— 让每个人都能在 AI 时代学会学习

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Windows-blue)](#)
[![Flutter](https://img.shields.io/badge/Flutter-3.44.4-02569B?logo=flutter)](https://flutter.dev)
[![Version](https://img.shields.io/badge/Version-v0.4.0-6750A4)](#)

灵犀学院是一款开源的引导式 AI 学习应用，以**苏格拉底式对话**为核心教学方式——通过引导式提问而非直接给答案，培养批判性思维与自主学习能力。

## 项目状态

| 项 | 状态 |
|----|------|
| 当前版本 | v0.4.0（双端专注版） |
| 支持平台 | Android + Windows |
| CI 状态 | GitHub Actions（质量门禁 + 双端构建发布） |
| 测试覆盖 | 149+ 测试用例 |
| 开源协议 | MIT |

## 核心理念

- **非商业化** —— MIT 协议开源，无付费墙、无广告
- **用户自备 API** —— 用户自行配置 API Key（OpenAI / Claude / Gemini / Ollama），仅本地加密存储，**永不上传**
- **苏格拉底式引导** —— AI 导师以提问引导思考，培养独立思考与问题拆解能力

## 吉祥物小犀

小犀是一只星空小犀牛，头戴学士帽、身披星光翅膀，拥有 6 种情绪状态（待机 / 开心 / 思考 / 难过 / 庆祝 / 好奇），随学习进程联动变化——AI 思考时托腮沉思，完成知识点时欢呼撒花，连点 5 次触发彩蛋。名字取自"心有灵犀一点通"。

## 学习路径 L0-L4

| 级别 | 定位 | 内容方向 |
|------|------|----------|
| **L0** | 启蒙 | AI 基础概念与工具入门 |
| **L1** | 基础 | 编程语言与提示词工程 |
| **L2** | 进阶 | 机器学习与数据处理 |
| **L3** | 实践 | 深度学习与模型训练 |
| **L4** | 应用 | AI 项目实战与部署 |

每个知识点包含：知识卡片学习 → 测验检验 → 苏格拉底式对话深化，完成即解锁下一节点。

## 功能特性

- 🤔 **引导式学习** —— 苏格拉底式问答，AI 不给答案给引导
- 💬 **自由对话** —— 支持 OpenAI / Claude / Gemini / Ollama 四类 Provider
- 📚 **学习路径** —— 结构化知识点卡片 + 测验 + 苏格拉底对话
- 🦏 **吉祥物小犀** —— 6 状态情绪联动，点击交互，连点 5 次彩蛋
- 🔥 **Streak 打卡** —— 连续学习天数追踪 + 成就徽章系统
- 🔍 **分级探索** —— 简化 / 深入 / 图示三按钮，按需调整回复详略
- 🔒 **数据安全** —— API Key 硬件级加密存储，日志自动脱敏
- 🖥️ **双端支持** —— Android + Windows
- 📝 **富文本渲染** —— Markdown + LaTeX 数学公式 + 代码高亮

## 动画亮点

v0.3.0 在动画与性能体验上全面打磨，目标 60fps 无丢帧：

- 🎭 **Hero 共享元素动画** —— 吉祥物在首页 / 学习路径 / 对话页之间视觉延续，自定义 `flightShuttleBuilder` 使用 `SpringMotion.gentleSpeed` 曲线
- 🎨 **微交互反馈** —— 按压（`LingxiButton` scale 0.96 / `LingxiCard` scale 0.99）、选中（`LingxiChip` `AnimatedSwitcher`）、过渡均有弹性动画
- 🌊 **流式响应节流** —— 首 token 立即渲染，后续 50ms 节流刷新，流式结束强制刷新，兼顾即时反馈与性能
- 🎭 **6 状态吉祥物** —— idle / happy / thinking / sad / celebrate / curious 差异化矢量绘制（径向渐变身体 / 角部高光 / 瞳孔高光）
- ♿ **无障碍降级** —— `reduceMotion` 全覆盖，开启系统"移除动画"后所有动画降级为即时切换或按钮切换
- 📊 **性能预算** —— 60fps 目标，`RepaintBoundary` 隔离持续动画，`cacheExtent` 优化列表滚动，`PerformanceOverlay` 静态审查无红条

## 下载安装

前往 [Releases](https://github.com/YJLZSL/polaris-learn/releases) 下载最新版本：

- **Android**：下载 `.apk` 直接安装
- **Windows**：下载 `.zip` 解压后运行

> 首次启动后会进入引导页，带领完成 API 配置。

## 快速开始

1. **下载安装**：从 [Releases](https://github.com/YJLZSL/polaris-learn/releases) 下载对应平台安装包
2. **首次引导**：5 步引导页（欢迎 → API 说明 → 小犀彩蛋 → 学习路径 → 苏格拉底介绍）
3. **配置 API**：选择服务商（OpenAI 兼容 / Anthropic / Gemini / Ollama），填入 API Key 与模型名，点击"测试连接"
4. **开始学习**：从首页进入"学习路径"选 L0 课程，或进入"对话"自由交流

## 构建指南

### 环境要求

| 项 | 要求 |
|----|------|
| Flutter SDK | 3.44.4（兼容 `sdk: '>=3.10.0 <4.0.0'`） |
| Dart SDK | 3.12.2（随 Flutter 自带） |
| Android | minSdkVersion 24 |
| Windows | Windows 10+，需 Visual Studio C++ build tools |

### 从源码构建

```bash
git clone https://github.com/YJLZSL/polaris-learn.git
cd polaris-learn
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter run                          # 开发模式
flutter build apk --release          # Android
flutter build windows --release      # Windows
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Flutter](https://flutter.dev) | 3.44.4 | 跨平台 UI 框架 |
| [flutter_riverpod](https://riverpod.dev) | ^2.5.1 | 状态管理 |
| [go_router](https://pub.dev/packages/go_router) | ^14.2.0 | 声明式路由 |
| [drift](https://pub.dev/packages/drift) | ^2.18.0 | SQLite ORM |
| [flutter_secure_storage](https://pub.dev/packages/flutter_secure_storage) | ^9.2.2 | API Key 加密存储 |
| [dio](https://pub.dev/packages/dio) | ^5.4.3+1 | HTTP 客户端 |
| [rive](https://rive.app) | ^0.13.13 | 吉祥物动画 |
| [flutter_markdown](https://pub.dev/packages/flutter_markdown) | ^0.7.2+1 | Markdown 渲染 |
| [flutter_math_fork](https://pub.dev/packages/flutter_math_fork) | ^0.7.2 | 数学公式渲染 |
| [google_fonts](https://pub.dev/packages/google_fonts) | ^6.2.1 | 字体加载 |

## 项目结构

```
lingxi-academy/
├── lib/
│   ├── main.dart                     # 应用入口
│   ├── app.dart                      # MaterialApp 根 Widget
│   ├── core/                         # 核心层：主题、路由、常量、动画
│   ├── data/                         # 数据层：Drift 数据库、模型、仓库
│   ├── features/                     # 功能层：按业务模块组织
│   │   ├── ai/                       #   AI Provider 抽象与实现
│   │   ├── chat/                     #   对话
│   │   ├── home/                     #   首页
│   │   ├── learning/                 #   学习路径与课时
│   │   ├── mascot/                   #   吉祥物小犀
│   │   ├── notes/                    #   笔记
│   │   ├── onboarding/               #   引导与 API 配置
│   │   ├── progress/                 #   进度统计与成就
│   │   └── settings/                 #   设置
│   └── shared/                       # 共享层：跨 feature 复用组件
├── assets/                           # 静态资源
├── docs/                             # 项目文档
├── test/                             # 测试
└── pubspec.yaml
```

## 贡献

欢迎参与项目贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解提交流程。AI 协作者请额外阅读 [AGENTS.md](AGENTS.md) 了解项目约定与安全红线。

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

## 致谢

- [LearnLM](https://blog.google/technology/learnlm/) —— Google 的学习模型，引导式学习五原则方法论参考
- [Material 3 Expressive](https://m3.material.io/) —— Google 设计系统，动态配色与组件规范
- [Flutter](https://flutter.dev) —— 跨平台应用开发框架
- [Khanmigo](https://www.khanmigo.ai/) —— Khan Academy 的 AI 导师，启发式教学灵感来源
- [mlabonne/llm-course](https://github.com/mlabonne/llm-course) —— LLM 系统化课程结构参考

## 相关文档

- [AGENTS.md](AGENTS.md) —— AI 协作者规范
- [docs/架构设计.md](docs/架构设计.md) —— 架构设计
- [docs/吉祥物设计.md](docs/吉祥物设计.md) —— 吉祥物设计
- [docs/前端重设计指南.md](docs/前端重设计指南.md) —— 前端重设计指南
- [docs/代码百科.md](docs/代码百科.md) —— 代码百科
- [CONTRIBUTING.md](CONTRIBUTING.md) —— 贡献指南

# 灵犀学院 (Lingxi Academy) Spec

> 一款引导式学习 + 自学双模式的开源 AI 学习应用，安卓 + PC 双端，用户自备 API，非商业化。

---

## Why

当前 AI 学习生态存在三大痛点：

1. **"收藏即学会"陷阱**：GitHub 上虽有大把 AI 学习路线图（mlabonne/llm-course 32k★、Ai-learn 等），但纯路线图缺乏引导式交互，学习者易半途而废。
2. **"答案引擎"伤害学习**：通用 ChatBot 直接给答案，违背学习科学。Khanmigo 的"苏格拉底式提问"、Google LearnLM 的五原则证明 AI 应作为"思维伙伴"而非"答案引擎"。
3. **平台割裂与商业门槛**：DeepLearning.AI、Coursera 等需付费/注册，国内豆包爱学绑定字节账号。学习者急需一个**开源、跨端、自备 API、零商业门槛**的引导式 AI 学习应用。

本项目旨在用 Flutter + Rive + Drift 技术栈，结合 LearnLM 五原则与 Khanmigo 苏格拉底式教学法，打造一个"AI 与学习者心有灵犀"的引导式学习应用。

---

## 调研方案对比（供参考）

### A. 技术栈方案对比

| 方案 | 双端一致 | 动画能力 | 吉祥物渲染 | 体积 | 生态 | 风险 | 评分 |
|---|---|---|---|---|---|---|---|
| **Flutter + Rive + Drift** ⭐主选 | Skia自绘像素级一致 | 内置最强+Rive状态机 | Rive矢量骨骼，三端一致 | ~15MB | pub.dev 30万+ | BSD零风险 | 9.5 |
| Tauri 2 + React + Rive | 依赖系统WebView | Framer Motion | Rive React runtime | ~3MB | npm成熟 | Android WebView不一致 | 8.5 |
| KMP + Compose MP | Compose自绘 | Compose动画 | Rive多平台 | 中 | klibs 3900+ | 库少需自拼 | 8.0 |

**决策：采用 Flutter + Rive + Drift**。理由：(1) 三端像素级一致保证吉祥物在 Android 老机型上不糊；(2) Flutter 动画系统是六大框架中最强，匹配"赏心悦目"需求；(3) Rive 状态机让吉祥物可响应用户操作（答对/思考中/通关），这是 Lottie 做不到的；(4) Drift 类型安全+响应式+跨端 SQLite+可加密，完美匹配学习进度+对话历史+加密 API Key 三大存储需求。

### B. 学习模式方案对比

| 模式 | 参考标杆 | 核心机制 | 优点 | 缺点 |
|---|---|---|---|---|
| **引导式为主+自学为辅** ⭐主选 | Khanmigo + LearnLM | 苏格拉底提问+五原则+结构化路径+自由对话 | 差异化强，护城河深 | 内容工程量大 |
| 自学为主+引导为辅 | NotebookLM | 封闭沙盒RAG+多形态输出 | 自由度高 | 引导性弱，同质化 |
| 双模式并重 | 两者结合 | 学院模式+探索模式并行 | 功能完整 | 工程量爆炸 |

**决策：引导式为主+自学为辅**。第一阶段先建"学院模式"骨架（结构化路径+苏格拉底AI），预留"探索模式"接口。

### C. 项目命名候选

| 候选 | 寓意 | 吉祥物 | 评估 |
|---|---|---|---|
| **灵犀学院 Lingxi Academy** ⭐主选 | 心有灵犀一点通 | 小犀(星空小犀牛) | 中英双名，吉祥物易设计，典故雅致 |
| 格物学院 Géwù | 格物致知 | 格物兽(麒麟) | 文化厚重但吉祥物难设计 |
| 启明书院 Qǐmíng | 启明星 | 启明鸟 | 诗意但偏静态 |
| Aurora Lab | 极光 | 极光狐 | 国际化强但中文意蕴弱 |

**决策：灵犀学院 Lingxi Academy**。吉祥物"小犀"——星空小犀牛，戴学士帽，背有星光翅膀，憨态可掬。Rive 状态机：idle/happy/thinking/sad/celebrate/curious 六态。

### D. 吉祥物风格候选

| 风格 | 参考 | 评估 |
|---|---|---|
| **萌系圆润** ⭐主选 | 多邻国猫头鹰、LINE Friends | 亲和力强，降低学习焦虑，契合 M3 Expressive 圆润造型 |
| 灵气精致 | Figma/Notion 插画 | 高级感强但亲和力稍弱 |
| 复古像素升华 | Stardew Valley | 辨识度高但与"不能像素拼接"要求需谨慎平衡 |

**决策：萌系圆润**。Rive 矢量+骨骼动画，60/120fps，三端像素级一致。

---

## What Changes

### 一、项目基础架构（骨架）

- **新建仓库**：`lingxi-academy`，MIT 协议，GitHub 托管
- **技术栈**：Flutter 3.41+ (Dart 3.7+) + Rive + Drift + Riverpod + GoRouter
- **目标平台**：Android（API 24+）+ Windows 10+ + macOS 12+（**不含 iOS/Linux**）
- **CI/CD**：GitHub Actions 三端矩阵构建（ubuntu→APK，windows→MSIX，macos→DMG）
- **目录结构**：monorepo 风格，`lib/` 下按 feature 分层（learning/chat/mascot/storage/ai/settings）

### 二、核心功能模块

#### 模块1：吉祥物系统（Mascot）
- Rive `.riv` 文件管理 6 状态机：`idle`/`happy`/`thinking`/`sad`/`celebrate`/`curious`
- 输入变量：`isCorrect:bool`、`mood:number`、`onTap:trigger`、`aiThinking:bool`
- 吉祥物"小犀"全场景陪伴：首页、学习页、对话页、空状态、成就页
- 可点击交互：点击触发`onTap`，吉祥物做出反应（眨眼/挥手/蹦跳）
- AI 流式响应期间触发`thinking`；答对触发`happy`/`celebrate`；答错触发`sad`+鼓励

#### 模块2：AI 多 Provider 集成（AI Engine）
- 抽象 `AiProvider` 接口：`Stream<String> chat(List<Message>, Options)`
- 支持四家：OpenAI（兼容 DeepSeek/通义/Moonshot 等）、Anthropic Claude、Google Gemini、本地 Ollama
- SSE 流式响应解析，支持取消
- **苏格拉底式系统提示词**：内置 LearnLM 五原则（激发主动学习/管理认知负荷/适应学习者/激发好奇心/加深元认知）
- **不给答案给引导**模式开关：开启后 AI 通过提问引导思考
- 多模态：图片输入（Vision）、Markdown 渲染、代码高亮、LaTeX 公式

#### 模块3：引导式学习路径（Learning Path）
- **学院模式**：结构化课程路径，参考 mlabonne/llm-course 分层设计
  - L0 AI 基础（Python/数学/神经网络）
  - L1 LLM 基础（Transformer/Tokenization/Embedding）
  - L2 Prompt Engineering（基础/进阶/工程化）
  - L3 LLM 应用开发（RAG/Agent/Function Calling）
  - L4 微调与部署（LoRA/量化/部署）
- 每个知识点结构：**学习卡片→嵌入式测验→苏格拉底AI对话→进度记录**
- 学习卡片借鉴 Google Learn About：主图+核心解释+"为什么重要"+词汇建立
- 分级探索按钮：**简化/深入/图像**三按钮，难度调节权交给学习者
- "继续学习"侧边栏：可探索的相关主题卡片，构成知识网络
- "常见误解"贴纸：显式标注认知偏差

#### 模块4：自由对话与笔记（Chat & Notes）
- 自由对话模式：用户自由提问，AI 以苏格拉底式引导
- 对话历史本地化存储（Drift）
- 笔记功能：可保存对话片段为笔记，支持标签
- 笔记关联：笔记可绑定学习路径节点

#### 模块5：进度与激励（Progress & Gamification）
- 学习进度追踪：每个课程/知识点的完成状态、得分、最后学习时间
- **Streak 连续打卡**（借鉴 Duolingo）：每日学习 streak，吉祥物庆祝
- 成就徽章：完成章节/连续打卡/苏格拉底对话次数等
- 学习统计：本周学习时长、完成知识点数、Streak 天数
- **不做联赛排名**（非商业化，无社交竞争压力）

#### 模块6：设置与 API 管理（Settings）
- API Key 管理：`flutter_secure_storage` 硬件级加密（Android Keystore/Windows DPAPI/macOS Keychain）
- 多 Provider 配置：base_url、model、temperature 等
- **API Key 绝不上传/不入日志/不入仓库**（.gitignore + config.example.json）
- 主题切换：浅色/深色/跟随系统
- 语言：简中/English（i18n）
- 数据导出/导入：JSON 格式，用户可备份

### 三、UI/UX 设计系统

- **Material 3 Expressive**：动态配色（学习内容图片可驱动界面配色）、圆润造型、Google Sans Flex Rounded
- **弹簧物理动效**：三速度（默认/快速/慢速）按元素大小分配，对标 Framer Motion
- **35 种形状变体**：形状响应交互（点击/滑动/滚动/释放/长按）
- **英雄时刻**：通关、答对、Streak 达成时的惊喜微交互（数量控制）
- **趣味彩蛋**：连续点击吉祥物 5 次触发隐藏动画
- **空状态插画**：SVG 矢量，吉祥物陪伴

### 四、引导与教程（Onboarding）

- **首次启动引导**：5 步动画教程（欢迎→设置 API→认识小犀→学院模式→自由对话）
- **空状态引导**：每个空页面有吉祥物+引导文案
- **内置帮助中心**：常见问题、快捷键、功能说明
- **API 设置向导**：分 Provider 详细图文教程（如何获取 OpenAI/Claude/Gemini/Ollama Key）
- **学习路径引导**：首次进入学院模式，小犀引导选择起点

### 五、开源与发布

- **LICENSE**：MIT
- **README.md**：项目介绍、截图、下载链接、构建指南、贡献指南
- **CONTRIBUTING.md**：贡献流程、代码规范、提交规范
- **config.example.json**：API 配置示例
- **GitHub Releases**：三端二进制托管
- **README 徽章**：CI 状态、版本号、License、Stars

---

## Impact

- **Affected specs**: 无（新建项目）
- **Affected code**: 全新代码库，从零搭建
- **Affected platforms**: Android 8.0+(API 24+)、Windows 10+、macOS 12+
- **Affected users**: AI 学习者、Prompt 工程师、LLM 应用开发者
- **License**: MIT（与 Flutter BSD、Rive Runtime MIT、Drift 兼容）

---

## ADDED Requirements

### Requirement: 吉祥物系统
系统 SHALL 提供 Rive 矢量动画吉祥物"小犀"，支持 idle/happy/thinking/sad/celebrate/curious 六状态机，可响应点击/AI状态/答题结果切换状态，三端（Android/Windows/macOS）像素级一致渲染。

#### Scenario: AI 思考中
- **WHEN** 用户发送消息，AI 开始流式响应
- **THEN** 吉祥物切换至 `thinking` 状态（小犀托腮思考动画）
- **AND** 流式响应结束后，根据语义切 `happy`（满意）或 `curious`（追问）

#### Scenario: 用户点击吉祥物
- **WHEN** 用户点击吉祥物
- **THEN** 触发 `onTap` 输入，吉祥物随机播放挥手/眨眼/蹦跳动画
- **AND** 连续点击 5 次触发隐藏彩蛋动画

### Requirement: 苏格拉底式 AI 引导
系统 SHALL 提供苏格拉底式 AI 模式，开启后 AI 不直接给答案，通过提问引导学习者思考，遵循 LearnLM 五原则。

#### Scenario: 引导模式开启
- **WHEN** 学习者开启"苏格拉底引导"开关并提问"什么是梯度下降？"
- **THEN** AI 不直接给定义，而是反问"你了解什么是梯度吗？我们先从导数说起..."
- **AND** 每轮对话后可插入测验验证理解

#### Scenario: 引导模式关闭
- **WHEN** 学习者关闭该模式
- **THEN** AI 直接给出详细解答（参考 Google Learn About 教学卡片格式）

### Requirement: 多 Provider AI 集成
系统 SHALL 支持 OpenAI 兼容/Anthropic Claude/Google Gemini/Ollama 四类 Provider，用户自备 API Key，密钥通过 `flutter_secure_storage` 硬件级加密存储，绝不上传/不进日志/不入仓库。

#### Scenario: 配置 OpenAI 兼容 Provider
- **WHEN** 用户在设置页选择 OpenAI 兼容，填写 base_url（如 `https://api.deepseek.com/v1`）、API Key、model
- **THEN** 密钥通过 Android Keystore/Windows DPAPI/macOS Keychain 加密存储
- **AND** 应用重启后密钥仍可读取，但仓库中无任何密钥痕迹

#### Scenario: 流式响应取消
- **WHEN** 用户在 AI 流式响应期间点击"停止"
- **THEN** 立即中断 HTTP 连接，已接收内容保留显示

### Requirement: 引导式学习路径
系统 SHALL 提供"学院模式"结构化学习路径，按 L0-L4 五层组织 AI 知识体系，每个知识点包含学习卡片→嵌入式测验→苏格拉底对话→进度记录四要素。

#### Scenario: 完成一个知识点
- **WHEN** 学习者完成学习卡片阅读 → 通过嵌入式测验（正确率≥80%）→ 与 AI 完成 1 轮苏格拉底对话
- **THEN** 该知识点标记为"已完成"
- **AND** 吉祥物播放 `celebrate` 动画
- **AND** Streak +1，进度条更新

### Requirement: 分级探索与认知负荷管理
系统 SHALL 在每个 AI 回复下方提供"简化/深入/图像"三按钮，借鉴 Google Learn About，让学习者主动控制难度梯度。

#### Scenario: 学习者选择"简化"
- **WHEN** 学习者点击"简化"按钮
- **THEN** AI 重新生成更通俗的解释（如用类比、生活案例）
- **AND** 吉祥物切换至 `curious` 状态鼓励

### Requirement: 进度与激励系统
系统 SHALL 提供学习进度追踪、Streak 连续打卡、成就徽章、学习统计四大激励功能，不包含联赛排名（非商业化）。

#### Scenario: 连续打卡
- **WHEN** 学习者连续第 7 天完成至少 1 个知识点
- **THEN** Streak 显示为 7，解锁"一周坚持"徽章
- **AND** 吉祥物播放 `celebrate` 动画，主页显示火焰图标

### Requirement: 完善的引导与教程
系统 SHALL 提供首次启动 5 步动画引导、空状态插画引导、内置帮助中心、API 设置图文向导、学习路径入口引导，确保新用户零门槛上手。

#### Scenario: 首次启动
- **WHEN** 用户首次打开应用
- **THEN** 播放 5 步引导动画（欢迎→设置API→认识小犀→学院模式→自由对话）
- **AND** 每步吉祥物"小犀"演示对应功能
- **AND** 用户可跳过，但跳过后设置页提供"重看引导"入口

### Requirement: 双端一致体验
系统 SHALL 在 Android、Windows、macOS 三端提供像素级一致的 UI 与动画体验，响应式适配不同屏幕尺寸（手机/平板/桌面），不构建 iOS 与 Linux 版本。

#### Scenario: 桌面端响应式
- **WHEN** 应用运行在 Windows 桌面（1920×1080）
- **THEN** 采用三栏布局（左侧导航/中间内容/右侧"继续学习"侧边栏）
- **AND** 吉祥物尺寸放大，动画保持流畅

#### Scenario: 移动端响应式
- **WHEN** 应用运行在 Android 手机（6.1寸）
- **THEN** 采用单栏布局，"继续学习"侧边栏折叠为底部抽屉
- **AND** 吉祥物尺寸适配，动画保持流畅

### Requirement: 开源与发布
系统 SHALL 以 MIT 协议开源，托管于 GitHub，提供 GitHub Actions 三端自动构建（APK/MSIX/DMG），通过 GitHub Releases 分发，README 包含 CI 徽章、截图、下载链接、构建指南。

#### Scenario: 发布新版本
- **WHEN** 推送 `v0.1.0` tag
- **THEN** GitHub Actions 触发三端矩阵构建
- **AND** 产物上传至 GitHub Release v0.1.0
- **AND** 用户从 Release 页直接下载三端安装包

---

## MODIFIED Requirements

无（新建项目）

---

## REMOVED Requirements

无（新建项目）

---

## 非目标（Out of Scope）

- **iOS 与 Linux 版本**：明确不构建
- **商业化**：无付费订阅、无广告、无内购
- **联赛排名/社交竞争**：非商业化定位，不引入
- **云端账号同步**：用户自备 API，数据全部本地化
- **iOS App Store / Google Play 上架**：通过 GitHub Releases 分发
- **AI 训练/微调执行**：仅作为学习内容，不在应用内执行训练
- **完整课程内容**：本 spec 仅搭建骨架与示例课程（L0 第一章），完整内容由社区后续共建

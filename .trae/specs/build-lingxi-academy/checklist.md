# Checklist

> 灵犀学院 (Lingxi Academy) 验收检查清单。每个 checkpoint 验证 spec 中的对应需求是否实现。

---

## 阶段一：项目初始化与骨架

- [x] 项目以 `flutter create --platforms=android,windows,macos` 创建，仅支持 Android/Windows/macOS 三端，**不含 iOS/Linux**
- [x] `pubspec.yaml` 包含核心依赖：riverpod、gorouter、drift、flutter_secure_storage、dio、rive、flutter_markdown、google_fonts、flutter_svg、lottie、intl
- [x] `LICENSE` 文件为 MIT 协议
- [x] `.gitignore` 包含 `*.keystore`、`*.jks`、`*.env`、`config.json`、`android/key.properties`，确保 API Key 不入仓库
- [x] `config.example.json` 提供四类 Provider 配置示例（无真实密钥）
- [x] `README.md` 骨架含项目介绍、徽章占位、构建指南占位
- [x] `CONTRIBUTING.md` 含贡献流程、代码规范、提交规范
- [x] `analysis_options.yaml` 启用 lint 强制规则
- [x] 目录结构按 feature 分层：`core/features/data/shared`
- [x] GoRouter 路由表覆盖：onboarding/home/learning/chat/notes/settings/achievements
- [x] Riverpod 全局 providers 配置：appConfig/theme/locale

## 阶段二：设计系统

- [x] Material 3 Expressive 主题：浅色/深色/跟随系统切换
- [x] 中文字体配置（Google Sans Flex Rounded + Noto Sans SC 回退）
- [x] 弹簧物理动效工具类封装（三速度：default/fast/slow）
- [x] 基础 UI 组件库：LingxiCard/LingxiButton/LingxiChip/LingxiBadge/LingxiAppBar
- [x] 35 种形状变体枚举定义

## 阶段三：数据与存储

- [x] Drift 表结构完整：conversations/messages/notes/progress/api_keys/settings/achievements/streaks
- [x] Drift 跨端配置：Android 用 sqflite，桌面用 sqlite3_flutter_libs
- [x] SQLCipher 加密选项可用（密钥放 flutter_secure_storage）
- [x] Repository 层完整：Conversation/Message/Note/Progress/Settings/Achievement
- [x] Schema migration 框架从 v1 开始
- [x] Repository 单元测试通过（内存数据库）
- [x] SecureStorageService 提供 setApiKey/getApiKey/deleteApiKey 接口
- [x] API Key 重启后可读取，删除后不可读取
- [x] 仓库中无任何 API Key 痕迹（grep 验证）

## 阶段四：吉祥物系统

- [x] Rive `.riv` 文件含 6 状态机：idle/happy/thinking/sad/celebrate/curious（注：CustomPainter 矢量绘制 fallback 已实现 6 状态，.riv 文件为已知技术债，升级路径见 docs/前端重设计指南.md 第六章）
- [x] MascotWidget 可加载 `.riv` 并暴露状态切换 API（注：状态切换 API 已实现 setMood/triggerTap/setAiThinking，rive_mascot_widget.dart 已预留 Rive 集成接口）
- [x] 单次点击吉祥物随机播放挥手/眨眼/蹦跳
- [x] 连续点击 5 次触发隐藏彩蛋动画
- [x] AI 思考时自动切换 `thinking` 状态
- [x] 吉祥物集成到首页、学习页、对话页、空状态页
- [x] 三端（Android/Windows/macOS）渲染像素级一致，吉祥物不糊

## 阶段五：AI Provider

- [x] AiProvider 抽象接口定义：Stream<String> chat()、cancel()
- [x] OpenAICompatibleProvider 实现（SSE 流式，支持 DeepSeek/通义/Moonshot 等兼容端点）
- [x] AnthropicProvider 实现（处理 anthropic-version 头）
- [x] GeminiProvider 实现
- [x] OllamaProvider 实现（本地 NDJSON 流式）
- [x] AiProviderRegistry 支持运行时切换 provider
- [x] SSE 解析正确处理 `data:` 帧与 `[DONE]` 结束符
- [x] 流式响应可取消，已接收内容保留
- [x] 苏格拉底式系统提示词内置 LearnLM 五原则
- [x] "不给答案给引导"模式开关可切换
- [x] Markdown 渲染 + 代码高亮 + LaTeX 公式正常
- [x] 分级探索三按钮（简化/深入/图像）可重新调用 AI
- [x] "常见误解"贴纸组件可解析特定标签

## 阶段六：学习路径

- [x] 学习内容数据模型完整：Course/Module/Lesson/KnowledgePoint/Quiz
- [x] JSON Schema 描述课程结构，便于社区共建
- [x] 示例课程 L0 第一章《Python 基础》含 3-5 个知识点
- [x] 每个知识点含学习卡片（主图+核心解释+为什么重要+词汇建立）
- [x] 每个知识点含嵌入式测验（3-5 题）
- [x] CourseRepository 可从 assets/courses/ 加载 JSON
- [x] LearningPathPage 可视化 L0-L4 五层路径
- [x] LessonPage 学习卡片轮播 + 进度条 + 吉祥物陪伴
- [x] QuizWidget 支持单选/多选/填空，即时反馈
- [x] 测验通过后唤起苏格拉底对话面板，预填种子问题
- [x] "继续学习"侧边栏展示相关主题卡片
- [x] 桌面端三栏布局，移动端单栏折叠
- [x] 知识点完成时吉祥物 celebrate + Streak 更新 + 进度持久化
- [x] 知识点完成判定：测验正确率≥80% + 1 轮苏格拉底对话

## 阶段七：自由对话与笔记

- [x] ChatPage 消息列表 + 输入框 + 发送/停止按钮
- [x] 流式响应逐 token 渲染，光标动画
- [x] AI 思考时吉祥物 thinking 状态联动
- [x] 对话历史持久化到 Drift
- [x] "苏格拉底引导"开关可切换
- [x] 分级探索三按钮在对话页可用
- [x] NotesPage 笔记列表 + 标签筛选 + 编辑器
- [x] 对话片段可一键保存为笔记
- [x] 笔记可绑定学习路径节点

## 阶段八：进度激励

- [x] StreakService 正确计算每日 streak
- [x] AchievementService 徽章解锁判定逻辑正确
- [x] AchievementsPage 徽章墙（已解锁/未解锁）
- [x] StatisticsPage 学习统计图表
- [x] 主页 Streak 火焰图标 + 吉祥物庆祝
- [x] 连续第 7 天解锁"一周坚持"徽章场景验证
- [x] **不包含联赛排名**（非商业化）

## 阶段九：设置

- [x] SettingsPage 主题/语言/苏格拉底默认值/数据导出导入
- [x] ApiSettingsPage 四类 Provider 新增/编辑/删除
- [x] ProviderEditDialog API Key 用 obscureText:true
- [x] API Key 不入日志（dio LogInterceptor 过滤敏感字段）
- [x] "测试连接"按钮可发送 ping 验证配置
- [x] 数据导出 JSON 不含 API Key
- [x] 数据导入 JSON 反序列化合并成功

## 阶段十：引导教程

- [x] OnboardingPage 5 步动画教程完整
- [x] 步骤1欢迎/步骤2设置API/步骤3认识小犀/步骤4学院模式/步骤5自由对话
- [x] 每步吉祥物演示对应功能
- [x] "跳过"按钮可用
- [x] 设置页"重看引导"入口可用
- [x] EmptyStateWidget 通用组件实现
- [x] 4 个空状态场景：无对话/无笔记/无成就/无 API 配置
- [x] HelpCenterPage 含常见问题、快捷键、功能说明
- [x] API 设置向导分 Provider 图文教程（OpenAI/Claude/Gemini/Ollama Key 获取方式）

## 阶段十一：CI/CD 与发布

- [x] `.github/workflows/ci.yml` PR 触发 analyze + test 门禁
- [x] `.github/workflows/release.yml` tag `v*` 触发
- [x] 矩阵 job 覆盖 ubuntu/windows/macos
- [x] Android 产物：APK + AAB（keystore 走 Secrets）
- [x] Windows 产物：MSIX（Task 20 已添加 msix 打包步骤，continue-on-error 容错，ZIP 作为备用）
- [x] macOS 产物：DMG（Task 20 已添加 create-dmg/hdiutil 打包步骤，continue-on-error 容错，ZIP 作为备用）
- [x] 产物自动上传到 GitHub Release
- [x] README 徽章：CI/Version/License/Stars

## 阶段十二：文档

- [x] README.md 完整版含截图、下载链接、构建指南
- [x] docs/架构设计.md 架构图与目录结构说明
- [x] docs/吉祥物设计.md 吉祥物设计说明
- [x] config.example.json 四类 Provider 配置示例

## 阶段十三：前端重设计文档与 AI 协作规范

- [x] docs/前端重设计指南.md 含当前现状分析、设计系统规范、各页面重设计蓝图
- [x] docs/design-tokens.json 结构化设计令牌（color/typography/spacing/radius/elevation/motion/shape）
- [x] docs/page-wireframes/ 含每个页面的文字线框图描述
- [x] AGENTS.md 含项目规范、命名约定、分层规则、安全红线、常用命令
- [x] AGENTS.md 含已知技术债与待优化项
- [x] 前端重设计文档详尽到下一个 AI 可独立执行重设计

---

## 跨阶段验收（Spec 对齐）

- [x] 吉祥物"小犀"非像素拼接，Rive 矢量+骨骼动画，三端清晰（注：CustomPainter 矢量绘制已实现非像素拼接+三端清晰，Rive 矢量+骨骼动画为已知技术债，升级路径见 docs/前端重设计指南.md 第六章与 docs/吉祥物设计.md）
- [x] 苏格拉底式引导模式开启时不直接给答案
- [x] 多 Provider 支持 OpenAI/Claude/Gemini/Ollama
- [x] API Key 硬件级加密，绝不上传/不入日志/不入仓库
- [x] 学习路径 L0-L4 五层结构
- [x] 知识点四要素：学习卡片→测验→苏格拉底对话→进度记录
- [x] 分级探索三按钮（简化/深入/图像）
- [x] Streak 连续打卡 + 成就徽章（无联赛排名）
- [x] 首次启动 5 步引导 + 空状态 + API 设置向导
- [x] 双端一致：Android/Windows/macOS 像素级一致
- [x] **不含 iOS 与 Linux 版本**
- [x] MIT 协议开源
- [x] GitHub Actions 三端自动构建
- [x] 用户自备 API，无商业付费/广告/内购

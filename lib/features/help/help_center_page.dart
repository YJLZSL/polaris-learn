import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';
import 'package:lingxi_academy/shared/widgets/markdown_renderer.dart';

/// 帮助分类数据。
class _HelpCategory {
  const _HelpCategory({
    required this.icon,
    required this.title,
    required this.content,
  });

  final IconData icon;
  final String title;

  /// Markdown 格式的帮助内容
  final String content;
}

/// 帮助中心页。
///
/// 以可展开的分类列表展示常见帮助内容，每个分类用 [MarkdownRenderer]
/// 渲染说明文本。右下角提供"反馈"按钮链接到 GitHub Issues。
/// FAQ 卡片交错入场，展开/收起使用 AnimatedSize 平滑过渡。
class HelpCenterPage extends StatelessWidget {
  const HelpCenterPage({super.key});

  /// 帮助分类数据
  static const List<_HelpCategory> _categories = [
    _HelpCategory(
      icon: Icons.rocket_launch,
      title: '快速开始',
      content: '''## 快速开始

欢迎使用灵犀学院！只需三步即可开始学习：

1. **配置 API**：在 [API 设置向导](/onboarding/api-setup) 中选择你的 AI 服务商并配置密钥。
2. **选择学习路径**：前往"学习"页面，从 L0 启蒙开始循序渐进。
3. **开始对话**：在"对话"页面与 小犀 自由交流。

> 💡 提示：灵犀学院是非商业平台，你需要自备 API Key 才能使用 AI 对话功能。
''',
    ),
    _HelpCategory(
      icon: Icons.school,
      title: '学习路径',
      content: '''## 学习路径

灵犀学院的学习内容分为五个层级：

| 级别 | 名称 | 适合人群 |
|------|------|----------|
| **L0** | 启蒙 | 零基础新手 |
| **L1** | 基础 | 有初步概念者 |
| **L2** | 进阶 | 掌握基础后提升 |
| **L3** | 实战 | 能独立完成项目 |
| **L4** | 专家 | 深入理解原理 |

### 如何完成知识点

每节课程包含三种学习方式：
- **学习卡片**：阅读核心概念
- **测验**：检验理解程度
- **苏格拉底对话**：通过提问加深思考

完成一个知识点后，进度会自动保存，连续打卡可解锁成就徽章。
''',
    ),
    _HelpCategory(
      icon: Icons.psychology,
      title: '苏格拉底引导',
      content: '''## 苏格拉底式引导

### 为什么 AI 不直接给答案？

灵犀学院采用**苏格拉底式教学法**，通过提问引导你主动思考，而非被动接收答案。这种方式的优点：

- ✅ 加深对概念的**真正理解**
- ✅ 培养**独立思考**能力
- ✅ 记忆更持久，不易遗忘

### 如何切换模式

- **引导模式**（默认）：小犀会通过提问引导你思考
- **直接解答**：在设置中关闭"苏格拉底引导"即可获得直接答案

> 你可以根据学习场景随时在两种模式间切换。
''',
    ),
    _HelpCategory(
      icon: Icons.emoji_events,
      title: '小犀互动',
      content: '''## 小犀互动

### 点击彩蛋

在任意页面点击小犀，它会做出不同反应：
- **单击**：眨眼、挥手或蹦跳
- **连续点击 5 次**：触发庆祝彩蛋 ✨

### 情绪表情含义

| 表情 | 含义 |
|------|------|
| 😊 开心 | 答对题目、完成任务 |
| 🤔 思考 | AI 正在生成回复 |
| 😢 难过 | 内容为空、需要操作 |
| 🦏 好奇 | 引导你探索新功能 |
| 🎉 庆祝 | 达成成就、彩蛋触发 |
''',
    ),
    _HelpCategory(
      icon: Icons.lock,
      title: '数据安全',
      content: '''## 数据安全

### API Key 如何存储？

你的 API Key 使用 **AES 加密**存储在本地，永不上传到任何服务器。

- **存储方式**：通过平台原生安全存储（Android Keystore / Windows DPAPI）
- **访问范围**：仅灵犀学院应用本身可读取
- **网络传输**：Key 仅在调用 AI API 时直接发送给对应服务商

### 数据导出导入

- **学习进度**：存储在本地 SQLite 数据库
- **笔记**：可单独导出为 Markdown 文件
- **配置**：API 配置不含密钥部分可导出，密钥需重新配置

> ⚠️ 重要：卸载应用会清除所有本地数据，请提前导出重要笔记。
''',
    ),
    _HelpCategory(
      icon: Icons.keyboard,
      title: '快捷键',
      content: '''## 快捷键

| 快捷键 | 功能 |
|--------|------|
| **Ctrl + Enter** | 发送消息 |
| **ESC** | 停止流式响应 |
| **Ctrl + N** | 新建对话 |
| **Ctrl + S** | 保存笔记 |

> 快捷键在桌面端（Windows）有效。
''',
    ),
    _HelpCategory(
      icon: Icons.help_outline,
      title: '常见问题',
      content: '''## 常见问题

### 流式响应卡顿？

- 检查网络连接是否稳定
- 尝试切换到响应更快的模型（如 gpt-4o-mini）
- 本地 Ollama 用户确认模型已完全加载

### API 报错怎么办？

常见错误码：
- **401 Unauthorized**：API Key 无效或已过期，请重新配置
- **429 Rate Limit**：请求频率过高，稍后再试
- **500 Server Error**：服务商内部错误，可重试

### 如何切换 Provider？

前往 **设置 → API 配置**，启用或禁用不同的服务商。系统会自动选择第一个已配置且启用的 Provider。

> 如遇问题，可在右下角点击"反馈"提交 Issue。
''',
    ),
    _HelpCategory(
      icon: Icons.code,
      title: '开源贡献',
      content: '''## 开源贡献

灵犀学院是一个开源项目，欢迎你的参与！

### 贡献方式

- 🐛 **报告问题**：在 GitHub Issues 提交 Bug 报告
- 💡 **功能建议**：提出你希望增加的功能
- 🔧 **提交 PR**：修复 Bug 或实现新功能
- 📖 **完善文档**：帮助改进说明文档
- 🌍 **翻译**：帮助翻译为更多语言

### 反馈渠道

点击右下角"反馈"按钮，或直接访问 GitHub 仓库提交 Issue。

> 感谢每一位贡献者的支持！❤️
''',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    return Scaffold(
      appBar: const LingxiAppBar(title: Text('帮助中心')),
      body: Stack(
        children: [
          // 分类列表
          ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _categories.length,
            itemBuilder: (context, index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _HelpCategoryCard(
                  category: _categories[index],
                  index: index,
                  reduceMotion: reduceMotion,
                ),
              );
            },
          ),
          // 右下角反馈按钮
          Positioned(
            right: 16,
            bottom: 16,
            child: SpringMotion.hoverLift(
              child: SpringMotion.springTransition(
                beginScale: 0.0,
                duration: SpringMotion.bouncyDuration,
                curve: SpringMotion.bouncyCurve,
                beginOffset: const Offset(0, 0.2),
                forceReduceMotion: reduceMotion,
                child: FloatingActionButton.extended(
                  onPressed: () => _showFeedbackDialog(context),
                  icon: const Icon(Icons.feedback),
                  label: const Text('反馈'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 显示反馈对话框
  void _showFeedbackDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('反馈'),
          content: const Text(
            '感谢你的反馈！\n\n你可以通过以下方式联系我们：\n\n'
            '• GitHub Issues：提交 Bug 或功能建议\n'
            '• 邮箱：lingxi-academy@example.com\n\n'
            '我们会认真阅读每一条反馈。',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('关闭'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.of(context).pop();
                // 暂时跳转到 API 设置向导作为示例链接
                context.go(RouteNames.apiSetupPath);
              },
              child: const Text('前往 GitHub'),
            ),
          ],
        );
      },
    );
  }
}

/// 单个帮助分类卡片（可展开/收起）。
///
/// 使用 LingxiCard 包裹，展开/收起通过 AnimatedSize 平滑过渡，
/// 展开箭头通过 AnimatedRotation 旋转。
class _HelpCategoryCard extends StatefulWidget {
  const _HelpCategoryCard({
    required this.category,
    required this.index,
    required this.reduceMotion,
  });

  final _HelpCategory category;
  final int index;
  final bool reduceMotion;

  @override
  State<_HelpCategoryCard> createState() => _HelpCategoryCardState();
}

class _HelpCategoryCardState extends State<_HelpCategoryCard> {
  bool _expanded = false;

  void _toggle() {
    setState(() => _expanded = !_expanded);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // 头部：图标 + 标题 + 展开箭头
    final header = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              widget.category.icon,
              color: theme.colorScheme.onPrimaryContainer,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              widget.category.title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          AnimatedRotation(
            duration: SpringMotion.fastDuration,
            curve: SpringMotion.fastCurve,
            turns: _expanded ? 0.5 : 0.0,
            child: Icon(
              Icons.keyboard_arrow_down,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );

    // 展开内容：Markdown 渲染
    final content = ClipRect(
      child: AnimatedSize(
        duration: SpringMotion.defaultDuration,
        curve: SpringMotion.defaultCurve,
        alignment: Alignment.topCenter,
        child: _expanded
            ? Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: MarkdownRenderer(data: widget.category.content),
              )
            : const SizedBox.shrink(),
      ),
    );

    return LingxiCard(
      padding: EdgeInsets.zero,
      animateEntrance: !widget.reduceMotion,
      entranceDelay: Duration(milliseconds: 40 * widget.index),
      onTap: _toggle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          header,
          content,
        ],
      ),
    );
  }
}

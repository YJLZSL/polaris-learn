import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/data/models/provider_config.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_card.dart';

/// 单个配置步骤。
class _SetupStep {
  const _SetupStep({
    required this.title,
    required this.description,
    this.url,
  });

  final String title;
  final String description;

  /// 可选的网址（显示为提示）
  final String? url;
}

/// 单个 Provider 的配置教程。
class _ProviderTutorial {
  const _ProviderTutorial({
    required this.type,
    required this.icon,
    required this.color,
    required this.steps,
  });

  final ProviderType type;
  final IconData icon;
  final Color color;
  final List<_SetupStep> steps;
}

/// API 设置向导页。
///
/// 分 Provider（OpenAI / Claude / Gemini / Ollama）提供图文教程，
/// 每个 Provider 下方有"立即配置"按钮跳转到 /settings/api 并预填 Provider 类型。
/// 卡片交错入场，步骤项在卡片内依次滑入。
class ApiSetupWizardPage extends StatelessWidget {
  const ApiSetupWizardPage({super.key});

  /// 4 个 Provider 教程数据
  static const List<_ProviderTutorial> _tutorials = [
    _ProviderTutorial(
      type: ProviderType.openaiCompatible,
      icon: Icons.smart_toy,
      color: Color(0xFF10A37F),
      steps: [
        _SetupStep(
          title: '步骤 1：访问 OpenAI 平台',
          description: '在浏览器中打开 OpenAI 开发者平台。',
          url: 'platform.openai.com',
        ),
        _SetupStep(
          title: '步骤 2：注册并登录',
          description: '使用邮箱注册 OpenAI 账号并完成邮箱验证，已有账号可直接登录。新账号有免费额度可供体验。',
        ),
        _SetupStep(
          title: '步骤 3：进入 API Keys 页面',
          description: '登录后点击右上角头像 → "View API keys"，或直接访问 API Keys 管理页面。',
          url: 'platform.openai.com/api-keys',
        ),
        _SetupStep(
          title: '步骤 4：创建新 Key',
          description: '点击 "Create new secret key" 按钮，可为 Key 命名（如 "lingxi-academy"），方便后续管理。',
        ),
        _SetupStep(
          title: '步骤 5：复制 API Key',
          description: '创建成功后会出现以 "sk-" 开头的密钥字符串，点击复制按钮保存。注意：密钥只显示一次，请妥善保管。',
        ),
        _SetupStep(
          title: '步骤 6：粘贴到灵犀学院',
          description: '回到灵犀学院，在 API 设置页的 OpenAI 卡片中粘贴 API Key，保存即可开始与小犀对话。',
        ),
      ],
    ),
    _ProviderTutorial(
      type: ProviderType.anthropic,
      icon: Icons.psychology,
      color: Color(0xFFD97757),
      steps: [
        _SetupStep(
          title: '步骤 1：访问 Anthropic 控制台',
          description: '在浏览器中打开 Anthropic 官方控制台。',
          url: 'console.anthropic.com',
        ),
        _SetupStep(
          title: '步骤 2：注册账号',
          description: '使用邮箱注册 Anthropic 账号并验证，新账号有免费额度可用于体验 Claude 模型。',
        ),
        _SetupStep(
          title: '步骤 3：创建 API Key',
          description: '登录后进入 "API Keys" 页面，点击 "Create Key" 按钮，为 Key 命名并生成。',
        ),
        _SetupStep(
          title: '步骤 4：粘贴到灵犀学院',
          description: '复制生成的密钥（以 "sk-ant-" 开头），回到灵犀学院 API 设置页，在 Anthropic 卡片中粘贴保存。',
        ),
      ],
    ),
    _ProviderTutorial(
      type: ProviderType.gemini,
      icon: Icons.auto_awesome,
      color: Color(0xFF4285F4),
      steps: [
        _SetupStep(
          title: '步骤 1：访问 Google AI Studio',
          description: '在浏览器中打开 Google AI Studio 开发者平台。',
          url: 'ai.google.dev',
        ),
        _SetupStep(
          title: '步骤 2：用 Google 账号登录',
          description: '使用 Google 账号登录，若无 Google 账号需先注册。登录后同意服务条款。',
        ),
        _SetupStep(
          title: '步骤 3：获取 API Key',
          description: '点击左侧 "Get API key" → "Create API key"，选择一个 Google Cloud 项目（或创建新项目）。',
        ),
        _SetupStep(
          title: '步骤 4：粘贴到灵犀学院',
          description: '复制生成的 API Key 字符串，回到灵犀学院 API 设置页，在 Gemini 卡片中粘贴保存。',
        ),
      ],
    ),
    _ProviderTutorial(
      type: ProviderType.ollama,
      icon: Icons.dns,
      color: Color(0xFF6B7280),
      steps: [
        _SetupStep(
          title: '步骤 1：下载 Ollama',
          description: '访问 Ollama 官网，根据你的操作系统（Windows / macOS / Linux）下载对应安装包。',
          url: 'ollama.com',
        ),
        _SetupStep(
          title: '步骤 2：安装',
          description: '运行下载的安装包，按提示完成安装。安装后 Ollama 会作为后台服务自动启动。',
        ),
        _SetupStep(
          title: '步骤 3：拉取模型',
          description: '打开终端（命令行），执行以下命令拉取模型：\nollama pull llama3.2\n等待下载完成后即可使用。',
        ),
        _SetupStep(
          title: '步骤 4：确认服务运行',
          description: 'Ollama 默认在 localhost:11434 启动服务。可在终端执行 ollama list 查看已安装的模型。',
        ),
        _SetupStep(
          title: '步骤 5：在灵犀学院添加 Provider',
          description: '无需 API Key。回到灵犀学院 API 设置页，选择 Ollama 卡片，确认地址为 http://localhost:11434，选择已拉取的模型保存即可。',
        ),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const LingxiAppBar(title: Text('API 配置向导')),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _tutorials.length,
        itemBuilder: (context, index) {
          final tutorial = _tutorials[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _ProviderTutorialCard(
              tutorial: tutorial,
              index: index,
            ),
          );
        },
      ),
    );
  }
}

/// 单个 Provider 教程卡片。
///
/// 卡片入场后，步骤项依次交错滑入（每步 50ms 间隔）。
class _ProviderTutorialCard extends StatefulWidget {
  const _ProviderTutorialCard({
    required this.tutorial,
    required this.index,
  });

  final _ProviderTutorial tutorial;
  final int index;

  @override
  State<_ProviderTutorialCard> createState() => _ProviderTutorialCardState();
}

class _ProviderTutorialCardState extends State<_ProviderTutorialCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _stepsController;

  @override
  void initState() {
    super.initState();
    _stepsController = AnimationController(
      vsync: this,
      duration: Duration(
        milliseconds: 300 + widget.tutorial.steps.length * 50,
      ),
    );
    if (AnimationUtils.platformReduceMotion) {
      _stepsController.value = 1.0;
    } else {
      // 卡片入场延迟后再启动步骤动画
      final startDelay = 60 * widget.index + 200;
      Future.delayed(Duration(milliseconds: startDelay), () {
        if (mounted) _stepsController.forward();
      });
    }
  }

  @override
  void dispose() {
    _stepsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reduceMotion = AnimationUtils.reduceMotionOf(context);

    return LingxiCard(
      padding: const EdgeInsets.all(20),
      animateEntrance: !reduceMotion,
      entranceDelay: Duration(milliseconds: 60 * widget.index),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Provider 标题
          Row(
            children: [
              // 图标容器：弹性弹出
              SpringMotion.springTransition(
                beginScale: 0.5,
                duration: SpringMotion.bouncyDuration,
                curve: SpringMotion.bouncyCurve,
                forceReduceMotion: reduceMotion,
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: widget.tutorial.color.withAlpha(26),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(widget.tutorial.icon,
                      color: widget.tutorial.color, size: 28),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.tutorial.type.displayName,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '${widget.tutorial.steps.length} 步配置',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // 步骤列表：交错入场
          ...List.generate(widget.tutorial.steps.length, (i) {
            final step = widget.tutorial.steps[i];
            final interval = AnimationUtils.staggerInterval(
              i,
              widget.tutorial.steps.length,
              overlap: 0.2,
              startDelay: 0.1,
            );
            return AnimatedBuilder(
              animation: _stepsController,
              child: _StepItem(
                index: i + 1,
                step: step,
                isLast: i == widget.tutorial.steps.length - 1,
              ),
              builder: (context, child) {
                if (reduceMotion) return child!;
                final animation = CurvedAnimation(
                  parent: _stepsController,
                  curve: interval,
                );
                return FadeTransition(
                  opacity: animation,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0.05, 0),
                      end: Offset.zero,
                    ).animate(CurvedAnimation(
                      parent: animation,
                      curve: SpringMotion.entranceCurve,
                    )),
                    child: child,
                  ),
                );
              },
            );
          }),
          const SizedBox(height: 20),
          // 立即配置按钮
          SizedBox(
            width: double.infinity,
            child: SpringMotion.hoverLift(
              child: LingxiButton(
                label: const Text('立即配置'),
                icon: const Icon(Icons.settings),
                size: LingxiButtonSize.large,
                onPressed: () => context.go(
                  '${RouteNames.settingsApiPath}?provider=${widget.tutorial.type.value}',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 单个步骤项：圆圈序号 + 标题 + 描述 + 可选网址。
class _StepItem extends StatelessWidget {
  const _StepItem({
    required this.index,
    required this.step,
    required this.isLast,
  });

  final int index;
  final _SetupStep step;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 左侧：圆圈序号 + 连接线
        SizedBox(
          width: 32,
          child: Column(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: theme.colorScheme.primaryContainer,
                ),
                alignment: Alignment.center,
                child: Text(
                  '$index',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              if (!isLast)
                Container(
                  width: 2,
                  height: 40,
                  color: theme.colorScheme.outlineVariant,
                ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        // 右侧：标题 + 描述 + 网址
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.title,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  step.description,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    height: 1.5,
                  ),
                ),
                if (step.url != null) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.link,
                          size: 14,
                          color: theme.colorScheme.primary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          step.url!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.primary,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

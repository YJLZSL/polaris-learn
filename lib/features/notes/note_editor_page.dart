import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/animation_utils.dart';
import 'package:lingxi_academy/core/motion/spring_motion.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/providers/db_providers.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_app_bar.dart';
import 'package:lingxi_academy/shared/widgets/lingxi_button.dart';

/// 笔记编辑器。
///
/// 支持新建与编辑两种模式：[noteId] 为 'new' 时新建，否则按 id 加载已有
/// 笔记。提供标题、内容（多行）、标签（逗号分隔）输入，保存（创建或更新）
/// 与删除操作。保存/删除后返回笔记列表。
class NoteEditorPage extends ConsumerStatefulWidget {
  const NoteEditorPage({super.key, required this.noteId});

  /// 笔记 id，'new' 表示新建。
  final String noteId;

  @override
  ConsumerState<NoteEditorPage> createState() => _NoteEditorPageState();
}

class _NoteEditorPageState extends ConsumerState<NoteEditorPage> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _contentController = TextEditingController();
  final TextEditingController _tagsController = TextEditingController();
  final FocusNode _titleFocus = FocusNode();
  final FocusNode _contentFocus = FocusNode();
  final FocusNode _tagsFocus = FocusNode();

  /// 是否已完成初次加载。
  bool _loaded = false;
  bool _formVisible = false;
  bool _titleFocused = false;

  /// 是否为新建模式。
  bool get _isNew => widget.noteId == 'new';

  @override
  void initState() {
    super.initState();
    _titleFocus.addListener(_onTitleFocusChange);
    if (_isNew) {
      _loaded = true;
      _scheduleFormEntrance();
    } else {
      _loadNote();
    }
  }

  void _onTitleFocusChange() {
    if (_titleFocused != _titleFocus.hasFocus) {
      setState(() => _titleFocused = _titleFocus.hasFocus);
    }
  }

  void _scheduleFormEntrance() {
    if (AnimationUtils.platformReduceMotion) {
      _formVisible = true;
      return;
    }
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) setState(() => _formVisible = true);
    });
  }

  @override
  void dispose() {
    _titleFocus.removeListener(_onTitleFocusChange);
    _titleFocus.dispose();
    _contentFocus.dispose();
    _tagsFocus.dispose();
    _titleController.dispose();
    _contentController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  /// 加载已有笔记填充表单。
  Future<void> _loadNote() async {
    final repo = ref.read(noteRepositoryProvider);
    final all = await repo.getAllNotes();
    Note? note;
    for (final n in all) {
      if (n.id == widget.noteId) {
        note = n;
        break;
      }
    }
    if (note != null && mounted) {
      _titleController.text = note.title;
      _contentController.text = note.content;
      _tagsController.text = note.tags;
      setState(() => _loaded = true);
      _scheduleFormEntrance();
    } else if (mounted) {
      setState(() => _loaded = true);
      _back();
    }
  }

  /// 保存（新建或更新）。
  Future<void> _save() async {
    final title = _titleController.text.trim();
    final content = _contentController.text.trim();
    if (title.isEmpty && content.isEmpty) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('标题或内容不能为空')),
      );
      return;
    }
    final repo = ref.read(noteRepositoryProvider);
    final tags = _normalizeTags(_tagsController.text);
    if (_isNew) {
      await repo.createNote(title: title, content: content, tags: tags);
    } else {
      await repo.updateNote(
        widget.noteId,
        title: title,
        content: content,
        tags: tags,
      );
    }
    if (!mounted) return;
    AnimationUtils.hapticSuccess();
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      const SnackBar(content: Text('已保存')),
    );
    _back();
  }

  /// 删除当前笔记（仅编辑模式可用）。
  Future<void> _delete() async {
    if (_isNew) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除笔记'),
        content: const Text('确定删除这条笔记吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    AnimationUtils.hapticMedium();
    await ref.read(noteRepositoryProvider).deleteNote(widget.noteId);
    if (!mounted) return;
    _back();
  }

  /// 规范化标签输入：逗号分隔、去空、去重。
  String _normalizeTags(String raw) {
    final parts = raw
        .split(',')
        .map((t) => t.trim())
        .where((t) => t.isNotEmpty)
        .toSet()
        .toList();
    return parts.join(',');
  }

  void _back() {
    context.go(RouteNames.notesPath);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: LingxiAppBar(
        title: Text(_isNew ? '新建笔记' : '编辑笔记'),
        actions: [
          if (!_isNew)
            SpringMotion.scalePressFeedback(
              onTap: _delete,
              child: IconButton(
                tooltip: '删除',
                icon: const Icon(Icons.delete_outline),
                onPressed: _delete,
              ),
            ),
          SpringMotion.scalePressFeedback(
            onTap: _save,
            child: IconButton(
              tooltip: '保存',
              icon: const Icon(Icons.check),
              onPressed: _save,
            ),
          ),
        ],
      ),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator())
          : _buildForm(context),
    );
  }

  /// 表单主体。
  Widget _buildForm(BuildContext context) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final theme = Theme.of(context);

    final form = SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 标题输入框：聚焦时有微妙的缩放和阴影变化
          _buildAnimatedTextField(
            controller: _titleController,
            focusNode: _titleFocus,
            labelText: '标题',
            textInputAction: TextInputAction.next,
            maxLines: 1,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          _buildAnimatedTextField(
            controller: _contentController,
            focusNode: _contentFocus,
            labelText: '内容',
            alignLabelWithHint: true,
            maxLines: 12,
            minLines: 6,
          ),
          const SizedBox(height: 16),
          _buildAnimatedTextField(
            controller: _tagsController,
            focusNode: _tagsFocus,
            labelText: '标签（逗号分隔）',
            hintText: '例如：dart,flutter,笔记',
          ),
          const SizedBox(height: 24),
          LingxiButton(
            label: const Text('保存笔记'),
            icon: const Icon(Icons.save_outlined),
            size: LingxiButtonSize.large,
            onPressed: _save,
          ),
        ],
      ),
    );

    if (reduceMotion) return form;

    return AnimatedOpacity(
      opacity: _formVisible ? 1.0 : 0.0,
      duration: SpringMotion.gentleDuration,
      curve: SpringMotion.entranceCurve,
      child: AnimatedSlide(
        offset: _formVisible ? Offset.zero : const Offset(0, 0.04),
        duration: SpringMotion.gentleDuration,
        curve: SpringMotion.entranceCurve,
        child: form,
      ),
    );
  }

  /// 带聚焦动画的输入框：聚焦时容器有轻微的缩放和强调色边框。
  Widget _buildAnimatedTextField({
    required TextEditingController controller,
    required FocusNode focusNode,
    required String labelText,
    String? hintText,
    TextInputAction? textInputAction,
    int? maxLines = 1,
    int? minLines,
    bool alignLabelWithHint = false,
    TextStyle? style,
  }) {
    final reduceMotion = AnimationUtils.reduceMotionOf(context);
    final field = TextField(
      controller: controller,
      focusNode: focusNode,
      decoration: InputDecoration(
        labelText: labelText,
        hintText: hintText,
        alignLabelWithHint: alignLabelWithHint,
        border: const OutlineInputBorder(),
      ),
      textInputAction: textInputAction,
      maxLines: maxLines,
      minLines: minLines,
      style: style,
    );

    if (reduceMotion) return field;

    // 仅标题字段使用更明显的聚焦缩放效果
    final isTitle = labelText == '标题';
    return AnimatedBuilder(
      animation: focusNode,
      builder: (context, child) {
        final focused = focusNode.hasFocus;
        return AnimatedContainer(
          duration: SpringMotion.fastDuration,
          curve: SpringMotion.fastCurve,
          transform: Matrix4.translationValues(
              0.0, focused && isTitle ? -1.0 : 0.0, 0.0),
          child: AnimatedScale(
            scale: focused && isTitle ? 1.005 : 1.0,
            duration: SpringMotion.fastDuration,
            curve: SpringMotion.fastCurve,
            child: child,
          ),
        );
      },
      child: field,
    );
  }
}

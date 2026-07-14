/// 灵犀学院学习内容数据模型。
///
/// 层级结构：[Course] → [Module] → [Lesson] → [KnowledgePoint]。
/// 每个知识点内嵌词汇表 [VocabularyTerm] 与测验 [QuizQuestion]。
///
/// 所有模型支持 JSON 序列化（手动实现 fromJson/toJson），
/// 用于加载 `assets/courses/` 下的课程 JSON 文件，并支持社区共建校验。
library;

/// 课程级别。
///
/// - [l0]：入门（零基础）
/// - [l1]：初级
/// - [l2]：中级
/// - [l3]：高级
/// - [l4]：专家
enum CourseLevel {
  l0('l0'),
  l1('l1'),
  l2('l2'),
  l3('l3'),
  l4('l4');

  const CourseLevel(this.value);

  /// JSON 序列化用的字符串标识。
  final String value;

  /// 根据字符串值反查枚举，未匹配时回退到 [l0]。
  static CourseLevel fromValue(String value) {
    return CourseLevel.values.firstWhere(
      (e) => e.value == value,
      orElse: () => CourseLevel.l0,
    );
  }
}

/// 测验题目类型。
///
/// - [singleChoice]：单选题
/// - [multipleChoice]：多选题
/// - [fillInBlank]：填空题
enum QuizType {
  singleChoice('singleChoice'),
  multipleChoice('multipleChoice'),
  fillInBlank('fillInBlank');

  const QuizType(this.value);

  /// JSON 序列化用的字符串标识。
  final String value;

  /// 根据字符串值反查枚举，未匹配时回退到 [singleChoice]。
  static QuizType fromValue(String value) {
    return QuizType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => QuizType.singleChoice,
    );
  }
}

/// 词汇术语。
class VocabularyTerm {
  const VocabularyTerm({
    required this.term,
    required this.definition,
  });

  /// 术语名称。
  final String term;

  /// 术语释义。
  final String definition;

  /// 从 JSON 反序列化。
  factory VocabularyTerm.fromJson(Map<String, dynamic> json) {
    return VocabularyTerm(
      term: json['term'] as String? ?? '',
      definition: json['definition'] as String? ?? '',
    );
  }

  /// 序列化为 JSON。
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'term': term,
      'definition': definition,
    };
  }
}

/// 测验题目。
class QuizQuestion {
  const QuizQuestion({
    required this.question,
    required this.type,
    required this.options,
    required this.correctAnswerIndices,
    this.correctAnswerText,
    this.explanation,
  });

  /// 题干。
  final String question;

  /// 题目类型。
  final QuizType type;

  /// 选项（填空题为空列表）。
  final List<String> options;

  /// 正确答案索引（填空题为空列表）。
  final List<int> correctAnswerIndices;

  /// 填空题的正确答案（选择题为 null）。
  final String? correctAnswerText;

  /// 解析（可选）。
  final String? explanation;

  /// 从 JSON 反序列化。
  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      question: json['question'] as String? ?? '',
      type: QuizType.fromValue(json['type'] as String? ?? ''),
      options: (json['options'] as List<dynamic>? ?? <dynamic>[])
          .map((e) => e as String)
          .toList(),
      correctAnswerIndices:
          (json['correctAnswerIndices'] as List<dynamic>? ?? <dynamic>[])
              .map((e) => (e as num).toInt())
              .toList(),
      correctAnswerText: json['correctAnswerText'] as String?,
      explanation: json['explanation'] as String?,
    );
  }

  /// 序列化为 JSON。
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'question': question,
      'type': type.value,
      'options': options,
      'correctAnswerIndices': correctAnswerIndices,
      if (correctAnswerText != null) 'correctAnswerText': correctAnswerText,
      if (explanation != null) 'explanation': explanation,
    };
  }
}

/// 知识点。
class KnowledgePoint {
  const KnowledgePoint({
    required this.id,
    required this.lessonId,
    required this.title,
    required this.coreExplanation,
    required this.whyItMatters,
    required this.vocabulary,
    this.imageUrl,
    required this.quiz,
    required this.socraticSeedQuestion,
    required this.relatedTopics,
    required this.commonMisconceptions,
    this.difficulty = 1,
    this.estimatedMinutes = 10,
    this.prerequisites = const [],
  });

  /// 知识点 ID。
  final String id;

  /// 所属课程（单节课）ID。
  final String lessonId;

  /// 知识点标题。
  final String title;

  /// 核心解释。
  final String coreExplanation;

  /// 为什么重要。
  final String whyItMatters;

  /// 词汇建立。
  final List<VocabularyTerm> vocabulary;

  /// 主图（可选，URL 或 asset 路径）。
  final String? imageUrl;

  /// 嵌入式测验。
  final List<QuizQuestion> quiz;

  /// 苏格拉底对话种子问题。
  final String socraticSeedQuestion;

  /// 相关主题（"继续学习"侧边栏）。
  final List<String> relatedTopics;

  /// 常见误解。
  final List<String> commonMisconceptions;

  /// 难度等级（1-5，1 最简单）。
  final int difficulty;

  /// 预估学习时长（分钟）。
  final int estimatedMinutes;

  /// 前置知识点 ID 列表。
  final List<String> prerequisites;

  /// 从 JSON 反序列化。
  factory KnowledgePoint.fromJson(Map<String, dynamic> json) {
    return KnowledgePoint(
      id: json['id'] as String? ?? '',
      lessonId: json['lessonId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      coreExplanation: json['coreExplanation'] as String? ?? '',
      whyItMatters: json['whyItMatters'] as String? ?? '',
      vocabulary: (json['vocabulary'] as List<dynamic>? ?? <dynamic>[])
          .map((e) => VocabularyTerm.fromJson(e as Map<String, dynamic>))
          .toList(),
      imageUrl: json['imageUrl'] as String?,
      quiz: (json['quiz'] as List<dynamic>? ?? <dynamic>[])
          .map((e) => QuizQuestion.fromJson(e as Map<String, dynamic>))
          .toList(),
      socraticSeedQuestion:
          json['socraticSeedQuestion'] as String? ?? '',
      relatedTopics: (json['relatedTopics'] as List<dynamic>? ?? <dynamic>[])
          .map((e) => e as String)
          .toList(),
      commonMisconceptions:
          (json['commonMisconceptions'] as List<dynamic>? ?? <dynamic>[])
              .map((e) => e as String)
              .toList(),
      difficulty: (json['difficulty'] as num?)?.toInt() ?? 1,
      estimatedMinutes: (json['estimatedMinutes'] as num?)?.toInt() ?? 10,
      prerequisites: (json['prerequisites'] as List<dynamic>? ?? <dynamic>[])
          .map((e) => e as String)
          .toList(),
    );
  }

  /// 序列化为 JSON。
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'lessonId': lessonId,
      'title': title,
      'coreExplanation': coreExplanation,
      'whyItMatters': whyItMatters,
      'vocabulary': vocabulary
          .map((e) => e.toJson())
          .toList(),
      if (imageUrl != null) 'imageUrl': imageUrl,
      'quiz': quiz.map((e) => e.toJson()).toList(),
      'socraticSeedQuestion': socraticSeedQuestion,
      'relatedTopics': relatedTopics,
      'commonMisconceptions': commonMisconceptions,
      'difficulty': difficulty,
      'estimatedMinutes': estimatedMinutes,
      if (prerequisites.isNotEmpty) 'prerequisites': prerequisites,
    };
  }
}

/// 课程（单节课）。
class Lesson {
  const Lesson({
    required this.id,
    required this.moduleId,
    required this.title,
    required this.description,
    required this.knowledgePoints,
    required this.order,
  });

  /// 课程（单节课）ID。
  final String id;

  /// 所属模块 ID。
  final String moduleId;

  /// 标题。
  final String title;

  /// 描述。
  final String description;

  /// 知识点列表。
  final List<KnowledgePoint> knowledgePoints;

  /// 排序。
  final int order;

  /// 从 JSON 反序列化。
  factory Lesson.fromJson(Map<String, dynamic> json) {
    return Lesson(
      id: json['id'] as String? ?? '',
      moduleId: json['moduleId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      knowledgePoints:
          (json['knowledgePoints'] as List<dynamic>? ?? <dynamic>[])
              .map((e) => KnowledgePoint.fromJson(e as Map<String, dynamic>))
              .toList(),
      order: (json['order'] as num?)?.toInt() ?? 0,
    );
  }

  /// 序列化为 JSON。
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'moduleId': moduleId,
      'title': title,
      'description': description,
      'knowledgePoints': knowledgePoints.map((e) => e.toJson()).toList(),
      'order': order,
    };
  }
}

/// 模块（章节）。
class Module {
  const Module({
    required this.id,
    required this.courseId,
    required this.title,
    required this.description,
    required this.lessons,
    required this.order,
  });

  /// 模块 ID。
  final String id;

  /// 所属课程 ID。
  final String courseId;

  /// 标题。
  final String title;

  /// 描述。
  final String description;

  /// 课程（单节课）列表。
  final List<Lesson> lessons;

  /// 排序。
  final int order;

  /// 从 JSON 反序列化。
  factory Module.fromJson(Map<String, dynamic> json) {
    return Module(
      id: json['id'] as String? ?? '',
      courseId: json['courseId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      lessons: (json['lessons'] as List<dynamic>? ?? <dynamic>[])
          .map((e) => Lesson.fromJson(e as Map<String, dynamic>))
          .toList(),
      order: (json['order'] as num?)?.toInt() ?? 0,
    );
  }

  /// 序列化为 JSON。
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'courseId': courseId,
      'title': title,
      'description': description,
      'lessons': lessons.map((e) => e.toJson()).toList(),
      'order': order,
    };
  }
}

/// 课程。
class Course {
  const Course({
    required this.id,
    required this.title,
    required this.description,
    required this.level,
    required this.icon,
    required this.modules,
    required this.order,
  });

  /// 课程 ID。
  final String id;

  /// 标题。
  final String title;

  /// 描述。
  final String description;

  /// 级别。
  final CourseLevel level;

  /// 图标标识符或 emoji。
  final String icon;

  /// 模块（章节）列表。
  final List<Module> modules;

  /// 排序。
  final int order;

  /// 从 JSON 反序列化。
  factory Course.fromJson(Map<String, dynamic> json) {
    return Course(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      level: CourseLevel.fromValue(json['level'] as String? ?? ''),
      icon: json['icon'] as String? ?? '',
      modules: (json['modules'] as List<dynamic>? ?? <dynamic>[])
          .map((e) => Module.fromJson(e as Map<String, dynamic>))
          .toList(),
      order: (json['order'] as num?)?.toInt() ?? 0,
    );
  }

  /// 序列化为 JSON。
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'description': description,
      'level': level.value,
      'icon': icon,
      'modules': modules.map((e) => e.toJson()).toList(),
      'order': order,
    };
  }
}

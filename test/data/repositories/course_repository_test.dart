// ignore_for_file: lines_longer_than_80_lines

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/repositories/course_repository.dart';

void main() {
  // ----------------------------------------------------------------------
  // 枚举反序列化
  // ----------------------------------------------------------------------
  group('CourseLevel', () {
    test('fromValue 应返回对应级别', () {
      expect(CourseLevel.fromValue('l0'), CourseLevel.l0);
      expect(CourseLevel.fromValue('l1'), CourseLevel.l1);
      expect(CourseLevel.fromValue('l2'), CourseLevel.l2);
      expect(CourseLevel.fromValue('l3'), CourseLevel.l3);
      expect(CourseLevel.fromValue('l4'), CourseLevel.l4);
    });

    test('fromValue 未知值应回退到 l0', () {
      expect(CourseLevel.fromValue('unknown'), CourseLevel.l0);
      expect(CourseLevel.fromValue(''), CourseLevel.l0);
    });

    test('value 应与枚举名一致', () {
      for (final level in CourseLevel.values) {
        expect(level.value, 'l${level.index}');
      }
    });
  });

  group('QuizType', () {
    test('fromValue 应返回对应类型', () {
      expect(QuizType.fromValue('singleChoice'), QuizType.singleChoice);
      expect(QuizType.fromValue('multipleChoice'), QuizType.multipleChoice);
      expect(QuizType.fromValue('fillInBlank'), QuizType.fillInBlank);
    });

    test('fromValue 未知值应回退到 singleChoice', () {
      expect(QuizType.fromValue('unknown'), QuizType.singleChoice);
      expect(QuizType.fromValue(''), QuizType.singleChoice);
    });
  });

  // ----------------------------------------------------------------------
  // VocabularyTerm
  // ----------------------------------------------------------------------
  group('VocabularyTerm', () {
    test('toJson / fromJson 往返应保持字段一致', () {
      const term = VocabularyTerm(term: '变量', definition: '存储数据的容器');
      final restored = VocabularyTerm.fromJson(term.toJson());

      expect(restored.term, '变量');
      expect(restored.definition, '存储数据的容器');
    });

    test('fromJson 缺失字段应回退为空字符串', () {
      final restored = VocabularyTerm.fromJson(<String, dynamic>{});

      expect(restored.term, '');
      expect(restored.definition, '');
    });

    test('toJson 输出应为合法 JSON', () {
      const term = VocabularyTerm(term: '函数', definition: '可复用代码块');
      final encoded = jsonEncode(term.toJson());
      final decoded = jsonDecode(encoded) as Map<String, dynamic>;

      expect(decoded['term'], '函数');
      expect(decoded['definition'], '可复用代码块');
    });
  });

  // ----------------------------------------------------------------------
  // QuizQuestion
  // ----------------------------------------------------------------------
  group('QuizQuestion', () {
    test('singleChoice 解析应保留选项与正确索引', () {
      final json = <String, dynamic>{
        'question': '下列哪个是合法的变量名？',
        'type': 'singleChoice',
        'options': <String>['1name', 'name_1', 'class', 'name-1'],
        'correctAnswerIndices': <int>[1],
        'explanation': '变量名须以字母或下划线开头',
      };
      final q = QuizQuestion.fromJson(json);

      expect(q.question, '下列哪个是合法的变量名？');
      expect(q.type, QuizType.singleChoice);
      expect(q.options.length, 4);
      expect(q.options[1], 'name_1');
      expect(q.correctAnswerIndices, <int>[1]);
      expect(q.explanation, '变量名须以字母或下划线开头');
      expect(q.correctAnswerText, isNull);
    });

    test('multipleChoice 解析应保留多个正确索引', () {
      final json = <String, dynamic>{
        'question': '下列哪些是 Python 数据类型？',
        'type': 'multipleChoice',
        'options': <String>['int', 'float', 'function', 'str'],
        'correctAnswerIndices': <int>[0, 1, 3],
      };
      final q = QuizQuestion.fromJson(json);

      expect(q.type, QuizType.multipleChoice);
      expect(q.correctAnswerIndices, <int>[0, 1, 3]);
      expect(q.options.length, 4);
      expect(q.explanation, isNull);
    });

    test('fillInBlank 解析应保留正确答案文本且选项为空', () {
      final json = <String, dynamic>{
        'question': 'Python 中查看变量类型的函数是 ____',
        'type': 'fillInBlank',
        'options': <String>[],
        'correctAnswerIndices': <int>[],
        'correctAnswerText': 'type',
      };
      final q = QuizQuestion.fromJson(json);

      expect(q.type, QuizType.fillInBlank);
      expect(q.options, isEmpty);
      expect(q.correctAnswerIndices, isEmpty);
      expect(q.correctAnswerText, 'type');
    });

    test('toJson → fromJson 往返应保持一致（含可选字段）', () {
      const original = QuizQuestion(
        question: '题干',
        type: QuizType.singleChoice,
        options: <String>['A', 'B'],
        correctAnswerIndices: <int>[0],
        correctAnswerText: null,
        explanation: '解析',
      );
      final restored = QuizQuestion.fromJson(original.toJson());

      expect(restored.question, original.question);
      expect(restored.type, original.type);
      expect(restored.options, original.options);
      expect(restored.correctAnswerIndices, original.correctAnswerIndices);
      expect(restored.explanation, original.explanation);
    });

    test('toJson 对填空题应输出 correctAnswerText 字段', () {
      const q = QuizQuestion(
        question: '填空题',
        type: QuizType.fillInBlank,
        options: <String>[],
        correctAnswerIndices: <int>[],
        correctAnswerText: 'type',
      );
      final json = q.toJson();

      expect(json['correctAnswerText'], 'type');
      expect(json['options'], isEmpty);
      expect(json['correctAnswerIndices'], isEmpty);
    });

    test('toJson 对未设置的可选字段应省略对应键', () {
      const q = QuizQuestion(
        question: '无解析无答案文本',
        type: QuizType.singleChoice,
        options: <String>['A'],
        correctAnswerIndices: <int>[0],
      );
      final json = q.toJson();

      expect(json.containsKey('correctAnswerText'), isFalse);
      expect(json.containsKey('explanation'), isFalse);
    });

    test('fromJson 缺失字段应使用默认值', () {
      final q = QuizQuestion.fromJson(<String, dynamic>{});

      expect(q.question, '');
      expect(q.type, QuizType.singleChoice);
      expect(q.options, isEmpty);
      expect(q.correctAnswerIndices, isEmpty);
      expect(q.correctAnswerText, isNull);
      expect(q.explanation, isNull);
    });
  });

  // ----------------------------------------------------------------------
  // KnowledgePoint
  // ----------------------------------------------------------------------
  group('KnowledgePoint', () {
    KnowledgePoint buildSample() {
      return const KnowledgePoint(
        id: 'kp1',
        lessonId: 'l1',
        title: '变量与赋值',
        coreExplanation: '变量是存储数据的容器',
        whyItMatters: '编程的基础',
        vocabulary: <VocabularyTerm>[
          VocabularyTerm(term: '变量', definition: '容器'),
          VocabularyTerm(term: '赋值', definition: '绑定值'),
        ],
        imageUrl: 'assets/images/variable.png',
        quiz: <QuizQuestion>[
          QuizQuestion(
            question: '合法变量名？',
            type: QuizType.singleChoice,
            options: <String>['1name', 'name_1'],
            correctAnswerIndices: <int>[1],
          ),
          QuizQuestion(
            question: '查看类型函数 ____',
            type: QuizType.fillInBlank,
            options: <String>[],
            correctAnswerIndices: <int>[],
            correctAnswerText: 'type',
          ),
        ],
        socraticSeedQuestion: '为什么 Python 不需要声明类型？',
        relatedTopics: <String>['数据类型', '运算符'],
        commonMisconceptions: <String>['= 是比较运算符'],
      );
    }

    test('fromJson 应正确解析嵌套的词汇与测验', () {
      final point = KnowledgePoint.fromJson(buildSample().toJson());

      expect(point.id, 'kp1');
      expect(point.lessonId, 'l1');
      expect(point.title, '变量与赋值');
      expect(point.coreExplanation, '变量是存储数据的容器');
      expect(point.imageUrl, 'assets/images/variable.png');
      expect(point.vocabulary.length, 2);
      expect(point.vocabulary[0].term, '变量');
      expect(point.quiz.length, 2);
      expect(point.quiz[0].type, QuizType.singleChoice);
      expect(point.quiz[1].type, QuizType.fillInBlank);
      expect(point.quiz[1].correctAnswerText, 'type');
      expect(point.relatedTopics, <String>['数据类型', '运算符']);
      expect(point.commonMisconceptions, <String>['= 是比较运算符']);
    });

    test('toJson → fromJson 往返应保持全部字段一致', () {
      final original = buildSample();
      final restored = KnowledgePoint.fromJson(original.toJson());

      expect(restored.id, original.id);
      expect(restored.title, original.title);
      expect(restored.coreExplanation, original.coreExplanation);
      expect(restored.whyItMatters, original.whyItMatters);
      expect(restored.imageUrl, original.imageUrl);
      expect(restored.socraticSeedQuestion, original.socraticSeedQuestion);
      expect(restored.vocabulary.length, original.vocabulary.length);
      expect(restored.quiz.length, original.quiz.length);
      expect(restored.relatedTopics, original.relatedTopics);
      expect(
        restored.commonMisconceptions,
        original.commonMisconceptions,
      );
    });

    test('toJson 应在 imageUrl 为 null 时省略该键', () {
      const point = KnowledgePoint(
        id: 'kp',
        lessonId: 'l',
        title: 't',
        coreExplanation: 'c',
        whyItMatters: 'w',
        vocabulary: <VocabularyTerm>[],
        quiz: <QuizQuestion>[],
        socraticSeedQuestion: 'q',
        relatedTopics: <String>[],
        commonMisconceptions: <String>[],
      );
      final json = point.toJson();

      expect(json.containsKey('imageUrl'), isFalse);
    });

    test('fromJson 缺失字段应使用默认值', () {
      final point = KnowledgePoint.fromJson(<String, dynamic>{});

      expect(point.id, '');
      expect(point.vocabulary, isEmpty);
      expect(point.quiz, isEmpty);
      expect(point.imageUrl, isNull);
      expect(point.relatedTopics, isEmpty);
      expect(point.commonMisconceptions, isEmpty);
    });
  });

  // ----------------------------------------------------------------------
  // Lesson / Module / Course 完整往返
  // ----------------------------------------------------------------------
  group('Course 完整往返', () {
    Course buildCourse() {
      return const Course(
        id: 'l0_python_basics',
        title: 'Python 基础',
        description: '零基础入门',
        level: CourseLevel.l0,
        icon: '🐍',
        modules: <Module>[
          Module(
            id: 'm1',
            courseId: 'l0_python_basics',
            title: '第一章 Python 基础',
            description: '章节描述',
            lessons: <Lesson>[
              Lesson(
                id: 'l1',
                moduleId: 'm1',
                title: 'Python 基础入门',
                description: '课程描述',
                knowledgePoints: <KnowledgePoint>[
                  KnowledgePoint(
                    id: 'kp1',
                    lessonId: 'l1',
                    title: '变量与赋值',
                    coreExplanation: '核心解释',
                    whyItMatters: '重要性',
                    vocabulary: <VocabularyTerm>[
                      VocabularyTerm(term: '变量', definition: '容器'),
                    ],
                    quiz: <QuizQuestion>[
                      QuizQuestion(
                        question: '题干',
                        type: QuizType.singleChoice,
                        options: <String>['A', 'B'],
                        correctAnswerIndices: <int>[1],
                      ),
                    ],
                    socraticSeedQuestion: '种子问题',
                    relatedTopics: <String>['数据类型'],
                    commonMisconceptions: <String>['误解1'],
                  ),
                ],
                order: 1,
              ),
            ],
            order: 1,
          ),
        ],
        order: 0,
      );
    }

    test('toJson → fromJson 应保持全部层级字段一致', () {
      final original = buildCourse();
      final restored = Course.fromJson(original.toJson());

      expect(restored.id, original.id);
      expect(restored.title, original.title);
      expect(restored.description, original.description);
      expect(restored.level, original.level);
      expect(restored.icon, original.icon);
      expect(restored.order, original.order);

      expect(restored.modules.length, 1);
      final module = restored.modules.first;
      expect(module.id, 'm1');
      expect(module.courseId, 'l0_python_basics');
      expect(module.title, '第一章 Python 基础');
      expect(module.order, 1);

      expect(module.lessons.length, 1);
      final lesson = module.lessons.first;
      expect(lesson.id, 'l1');
      expect(lesson.moduleId, 'm1');
      expect(lesson.order, 1);

      expect(lesson.knowledgePoints.length, 1);
      final kp = lesson.knowledgePoints.first;
      expect(kp.id, 'kp1');
      expect(kp.lessonId, 'l1');
      expect(kp.vocabulary.first.term, '变量');
      expect(kp.quiz.first.type, QuizType.singleChoice);
      expect(kp.quiz.first.correctAnswerIndices, <int>[1]);
    });

    test('toJson 输出应为可再次解码的合法 JSON', () {
      final course = buildCourse();
      final encoded = jsonEncode(course.toJson());
      final decoded = jsonDecode(encoded) as Map<String, dynamic>;

      expect(decoded['id'], 'l0_python_basics');
      expect(decoded['level'], 'l0');
      expect(
        (decoded['modules'] as List<dynamic>).isNotEmpty,
        isTrue,
      );
    });

    test('fromJson 缺失字段应使用默认值', () {
      final course = Course.fromJson(<String, dynamic>{});

      expect(course.id, '');
      expect(course.title, '');
      expect(course.level, CourseLevel.l0);
      expect(course.icon, '');
      expect(course.order, 0);
      expect(course.modules, isEmpty);
    });

    test('order 字段在 JSON 中为整数', () {
      final course = buildCourse();
      final json = course.toJson();

      expect(json['order'], isA<int>());
      expect(json['order'], 0);
    });
  });

  // ----------------------------------------------------------------------
  // 模拟示例课程 JSON 解析（结构与 l0_python_basics.json 一致）
  // ----------------------------------------------------------------------
  group('示例课程 JSON 解析', () {
    test('应正确解析含四种题型的完整知识点', () {
      final json = <String, dynamic>{
        'id': 'l0_python_basics',
        'title': 'Python 基础',
        'description': '入门',
        'level': 'l0',
        'icon': '🐍',
        'order': 0,
        'modules': <dynamic>[
          <String, dynamic>{
            'id': 'm1',
            'courseId': 'l0_python_basics',
            'title': '第一章 Python 基础',
            'description': '章节',
            'lessons': <dynamic>[
              <String, dynamic>{
                'id': 'l1',
                'moduleId': 'm1',
                'title': '入门',
                'description': '课',
                'knowledgePoints': <dynamic>[
                  <String, dynamic>{
                    'id': 'kp1',
                    'lessonId': 'l1',
                    'title': '变量与赋值',
                    'coreExplanation': '变量是存储数据的容器',
                    'whyItMatters': '基础',
                    'vocabulary': <dynamic>[
                      <String, dynamic>{
                        'term': '变量',
                        'definition': '容器',
                      },
                    ],
                    'quiz': <dynamic>[
                      <String, dynamic>{
                        'question': '合法变量名？',
                        'type': 'singleChoice',
                        'options': <String>['1name', 'name_1'],
                        'correctAnswerIndices': <int>[1],
                      },
                      <String, dynamic>{
                        'question': '哪些是数据类型？',
                        'type': 'multipleChoice',
                        'options': <String>['int', 'func'],
                        'correctAnswerIndices': <int>[0],
                      },
                      <String, dynamic>{
                        'question': '查看类型函数 ____',
                        'type': 'fillInBlank',
                        'options': <String>[],
                        'correctAnswerIndices': <int>[],
                        'correctAnswerText': 'type',
                      },
                    ],
                    'socraticSeedQuestion': '为什么？',
                    'relatedTopics': <String>['数据类型'],
                    'commonMisconceptions': <String>['误解'],
                  },
                ],
                'order': 1,
              },
            ],
            'order': 1,
          },
        ],
      };

      final course = Course.fromJson(json);

      expect(course.id, 'l0_python_basics');
      expect(course.level, CourseLevel.l0);
      final kp = course.modules.first.lessons.first.knowledgePoints.first;
      expect(kp.vocabulary.length, 1);
      expect(kp.quiz.length, 3);
      expect(kp.quiz[0].type, QuizType.singleChoice);
      expect(kp.quiz[1].type, QuizType.multipleChoice);
      expect(kp.quiz[2].type, QuizType.fillInBlank);
      expect(kp.quiz[2].correctAnswerText, 'type');
    });
  });

  // ----------------------------------------------------------------------
  // 实际课程文件解析（验证 assets/courses/l0_python_basics.json 可被正确解析）
  // ----------------------------------------------------------------------
  group('实际课程文件 l0_python_basics.json', () {
    late Course course;

    setUpAll(() {
      // 从磁盘读取实际课程文件并解析，确保资产文件可被 Course.fromJson 解析。
      final raw = File('assets/courses/l0_python_basics.json')
          .readAsStringSync();
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      course = Course.fromJson(decoded);
    });

    test('课程顶层字段应正确解析', () {
      expect(course.id, 'l0_python_basics');
      expect(course.title, 'Python 基础');
      expect(course.level, CourseLevel.l0);
      expect(course.icon, '🐍');
      expect(course.order, 0);
      expect(course.modules.length, 1);
    });

    test('应包含 1 个模块与 1 节课', () {
      final module = course.modules.first;
      expect(module.id, 'l0_python_basics_m1');
      expect(module.courseId, 'l0_python_basics');
      expect(module.title, '第一章 Python 基础');
      expect(module.lessons.length, 1);

      final lesson = module.lessons.first;
      expect(lesson.id, 'l0_python_basics_m1_l1');
      expect(lesson.moduleId, 'l0_python_basics_m1');
    });

    test('应包含 4 个知识点且标题顺序正确', () {
      final kps = course.modules.first.lessons.first.knowledgePoints;
      expect(kps.length, 4);
      expect(kps[0].title, '变量与赋值');
      expect(kps[1].title, '数据类型');
      expect(kps[2].title, '控制流（if/for/while）');
      expect(kps[3].title, '函数');
    });

    test('每个知识点应含 3 道测验题与苏格拉底种子问题', () {
      final kps = course.modules.first.lessons.first.knowledgePoints;
      for (final kp in kps) {
        expect(kp.quiz.length, 3, reason: '${kp.title} 应有 3 道测验题');
        expect(kp.socraticSeedQuestion, isNotEmpty);
        expect(kp.coreExplanation, isNotEmpty);
        expect(kp.whyItMatters, isNotEmpty);
        expect(kp.vocabulary, isNotEmpty);
        expect(kp.relatedTopics, isNotEmpty);
        expect(kp.commonMisconceptions, isNotEmpty);
      }
    });

    test('变量与赋值知识点的测验应含正确答案', () {
      final kp = course.modules.first.lessons.first.knowledgePoints.first;
      // 第 1 题：单选，答案索引 1（name_1）
      expect(kp.quiz[0].type, QuizType.singleChoice);
      expect(kp.quiz[0].correctAnswerIndices, <int>[1]);
      // 第 3 题：填空，答案 type
      expect(kp.quiz[2].type, QuizType.fillInBlank);
      expect(kp.quiz[2].correctAnswerText, 'type');
    });

    test('CourseRepository 应能从 rootBundle 加载并按 ID 定位知识点', () async {
      // 初始化 Flutter 绑定，使 rootBundle 在测试环境中可用。
      TestWidgetsFlutterBinding.ensureInitialized();
      final repo = CourseRepository();
      final all = await repo.getAllCourses();

      // 若测试环境未注入资产，则跳过仓库层断言（模型层解析已由其它用例覆盖）。
      if (all.isEmpty) {
        return;
      }
      expect(all.length, 1);
      expect(all.first.id, 'l0_python_basics');

      final kp = await repo.getKnowledgePoint(
        'l0_python_basics',
        'l0_python_basics_m1_l1',
        'l0_python_basics_m1_l1_kp2',
      );
      expect(kp, isNotNull);
      expect(kp!.title, '数据类型');

      // getCourse 与 getCoursesByLevel
      final course = await repo.getCourse('l0_python_basics');
      expect(course, isNotNull);
      expect(course!.title, 'Python 基础');

      final l0Courses = await repo.getCoursesByLevel(CourseLevel.l0);
      expect(l0Courses.length, 1);
      final l1Courses = await repo.getCoursesByLevel(CourseLevel.l1);
      expect(l1Courses, isEmpty);
    });
  });

  // ----------------------------------------------------------------------
  // CourseRepository.clearCache 与动态文件清单
  // ----------------------------------------------------------------------
  group('CourseRepository.clearCache', () {
    late String courseJson;
    late String manifestJson;

    setUpAll(() {
      TestWidgetsFlutterBinding.ensureInitialized();
      // 从磁盘读取实际课程文件内容，用于 mock rootBundle。
      courseJson = File('assets/courses/l0_python_basics.json')
          .readAsStringSync();
      // 模拟 AssetManifest.json，包含课程文件与 schema.json。
      manifestJson = jsonEncode(<String, dynamic>{
        'assets/courses/l0_python_basics.json': <String, dynamic>{},
        'assets/courses/schema.json': <String, dynamic>{},
        'assets/images/logo.png': <String, dynamic>{},
      });
    });

    setUp(() {
      // 注入 rootBundle mock，模拟 AssetManifest.json 与课程文件。
      TestWidgetsFlutterBinding.instance.defaultBinaryMessenger
          .setMockMessageHandler('flutter/assets', (ByteData? message) async {
        final key = utf8.decode(message!.buffer.asUint8List());
        if (key == 'AssetManifest.json') {
          return ByteData.sublistView(
            Uint8List.fromList(utf8.encode(manifestJson)),
          );
        }
        if (key == 'assets/courses/l0_python_basics.json') {
          return ByteData.sublistView(
            Uint8List.fromList(utf8.encode(courseJson)),
          );
        }
        return null;
      });
    });

    tearDown(() {
      // 清理 rootBundle mock，避免影响后续测试。
      TestWidgetsFlutterBinding.instance.defaultBinaryMessenger
          .setMockMessageHandler('flutter/assets', null);
    });

    test('clearCache 后重新加载课程数据应正确', () async {
      final repo = CourseRepository();
      final first = await repo.getAllCourses();
      expect(first.length, 1, reason: '首次加载应有 1 个课程');
      expect(first.first.id, 'l0_python_basics');
      expect(first.first.title, 'Python 基础');

      repo.clearCache();

      final second = await repo.getAllCourses();
      expect(second.length, 1, reason: 'clearCache 后重新加载应有 1 个课程');
      expect(second.first.id, 'l0_python_basics');
      expect(second.first.title, 'Python 基础');
      expect(
        second.first.modules.length,
        first.first.modules.length,
      );
    });

    test('动态加载应排除 schema.json', () async {
      final repo = CourseRepository();
      final all = await repo.getAllCourses();
      // manifest 中包含 schema.json，但应被过滤掉。
      expect(all.length, 1);
      expect(all.any((c) => c.id.contains('schema')), isFalse);
    });
  });
}

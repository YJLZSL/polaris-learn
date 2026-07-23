// ignore_for_file: lines_longer_than_80_lines

import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/repositories/learning_event_repository.dart';
import 'package:lingxi_academy/data/repositories/progress_repository.dart';
import 'package:lingxi_academy/features/progress/spaced_repetition_service.dart';

/// 创建内存数据库与 SpacedRepetitionService 实例。
(LingxiDatabase, ProgressRepository, LearningEventRepository,
    SpacedRepetitionService) _setup() {
  final db = LingxiDatabase.forTesting(NativeDatabase.memory());
  final progressRepo = ProgressRepository(db);
  final eventRepo = LearningEventRepository(db);
  final service = SpacedRepetitionService(progressRepo, eventRepo);
  return (db, progressRepo, eventRepo, service);
}

/// 获取 N 天前今日零点的 DateTime（确保 daysSince 确定为 N）。
DateTime _daysAgo(int n) {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day)
      .subtract(Duration(days: n));
}

/// 构造一个知识点。
KnowledgePoint _kp(String id) {
  return KnowledgePoint(
    id: id,
    lessonId: 'l1',
    title: '知识点 $id',
    coreExplanation: '解释',
    whyItMatters: '重要',
    vocabulary: const [],
    quiz: const [],
    socraticSeedQuestion: '种子问题?',
    relatedTopics: const [],
    commonMisconceptions: const [],
  );
}

/// 构造一个含单个课时、给定知识点列表的课程。
Course _buildCourse(String id, String title, List<KnowledgePoint> kps) {
  return Course(
    id: id,
    title: title,
    description: '描述',
    level: CourseLevel.l0,
    icon: '📘',
    modules: [
      Module(
        id: 'm1',
        courseId: id,
        title: '模块一',
        description: 'd',
        order: 1,
        lessons: [
          Lesson(
            id: 'l1',
            moduleId: 'm1',
            title: '课时一',
            description: 'd',
            order: 1,
            knowledgePoints: kps,
          ),
        ],
      ),
    ],
    order: 1,
  );
}

/// 直接向 Progress 表插入一条已完成记录，completedAt 由参数指定。
Future<void> _seedCompleted({
  required LingxiDatabase db,
  required String courseId,
  required String kpId,
  required DateTime completedAt,
}) async {
  await db.into(db.progress).insert(ProgressCompanion(
        courseId: Value(courseId),
        lessonId: const Value('l1'),
        knowledgePointId: Value(kpId),
        status: const Value('completed'),
        completedAt: Value(completedAt),
        lastStudiedAt: Value(completedAt),
      ));
}

/// 直接向 Progress 表插入一条进行中记录。
Future<void> _seedInProgress({
  required LingxiDatabase db,
  required String courseId,
  required String kpId,
  required DateTime studiedAt,
}) async {
  await db.into(db.progress).insert(ProgressCompanion(
        courseId: Value(courseId),
        lessonId: const Value('l1'),
        knowledgePointId: Value(kpId),
        status: const Value('in_progress'),
        lastStudiedAt: Value(studiedAt),
      ));
}

/// 直接向 LearningEvents 表插入一条复习完成事件。
Future<void> _seedReviewEvent({
  required LingxiDatabase db,
  required String kpId,
  required DateTime createdAt,
}) async {
  await db.into(db.learningEvents).insert(LearningEventsCompanion(
        eventType: const Value(LearningEventType.reviewComplete),
        knowledgePointId: Value(kpId),
        createdAt: Value(createdAt),
      ));
}

void main() {
  group('SpacedRepetitionService 复习队列触发', () {
    test('完成 1 天前的知识点进入复习队列（间隔 1）', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        completedAt: _daysAgo(1),
      );
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list.length, 1);
      expect(list.first.knowledgePointId, 'kp1');
      expect(list.first.courseId, 'c1');
      expect(list.first.daysSinceLastStudy, 1);
    });

    test('完成 3 天前的知识点进入复习队列（间隔 3）', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        completedAt: _daysAgo(3),
      );
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list.length, 1);
      expect(list.first.daysSinceLastStudy, 3);
    });

    test('完成 7 天前的知识点进入复习队列（间隔 7）', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        completedAt: _daysAgo(7),
      );
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list.length, 1);
      expect(list.first.daysSinceLastStudy, 7);
    });

    test('完成 14 天前的知识点进入复习队列（间隔 14）', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        completedAt: _daysAgo(14),
      );
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list.length, 1);
    });

    test('完成 30 天前的知识点进入复习队列（间隔 30）', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        completedAt: _daysAgo(30),
      );
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list.length, 1);
      expect(list.first.daysSinceLastStudy, 30);
    });

    test('完成 31 天前的知识点进入复习队列且紧迫度最高', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        completedAt: _daysAgo(31),
      );
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list.length, 1);
      expect(list.first.urgency, 1.0, reason: '超过 30 天紧迫度最高');
    });

    test('完成 5 天前的知识点不进入复习队列（不在任何间隔窗口）', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        completedAt: _daysAgo(5),
      );
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list, isEmpty, reason: '5 天不在 [1,3,7,14,30] ±1 窗口内');
    });

    test('进行中的知识点不进入复习队列', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedInProgress(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        studiedAt: _daysAgo(7),
      );
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list, isEmpty, reason: '仅 completed 状态才生成复习建议');
    });

    test('无进度记录的知识点不进入复习队列', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];
      final list = await service.getTodayReviewList(courses);
      expect(list, isEmpty);
    });

    test('completedAt 为 null 的完成记录不进入复习队列', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      // 直接插入 completed 但 completedAt 为 null
      await db.into(db.progress).insert(ProgressCompanion(
            courseId: const Value('c1'),
            lessonId: const Value('l1'),
            knowledgePointId: const Value('kp1'),
            status: const Value('completed'),
          ));
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list, isEmpty, reason: 'completedAt 为 null 应跳过');
    });
  });

  group('SpacedRepetitionService 间隔重复算法', () {
    test('间隔递增：1/3/7/14/30 天窗口均触发复习', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      final kps = [
        _kp('kp1'),
        _kp('kp3'),
        _kp('kp7'),
        _kp('kp14'),
        _kp('kp30'),
      ];
      final courses = [_buildCourse('c1', '课程一', kps)];

      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'kp1', completedAt: _daysAgo(1));
      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'kp3', completedAt: _daysAgo(3));
      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'kp7', completedAt: _daysAgo(7));
      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'kp14', completedAt: _daysAgo(14));
      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'kp30', completedAt: _daysAgo(30));

      final list = await service.getTodayReviewList(courses);
      expect(list.length, 5, reason: '5 个间隔窗口的知识点都应进入复习');
    });

    test('紧迫度随时间衰减：1 天 > 7 天 > 14 天 > 30 天', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'd1', completedAt: _daysAgo(1));
      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'd7', completedAt: _daysAgo(7));
      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'd14', completedAt: _daysAgo(14));
      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'd30', completedAt: _daysAgo(30));

      final courses = [_buildCourse('c1', '课程一', [
        _kp('d1'),
        _kp('d7'),
        _kp('d14'),
        _kp('d30'),
      ])];
      final list = await service.getTodayReviewList(courses);

      final byId = {for (final r in list) r.knowledgePointId: r.urgency};
      expect(byId['d1']!, 0.9);
      expect(byId['d7']!, 0.7);
      expect(byId['d14']!, 0.5);
      expect(byId['d30']!, 0.4);
    });

    test('复习列表按紧迫度降序排序', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      // 1 天（0.9）与 31 天（1.0）都进入复习
      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'recent', completedAt: _daysAgo(1));
      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'old', completedAt: _daysAgo(31));

      final courses = [_buildCourse('c1', '课程一', [_kp('recent'), _kp('old')])];
      final list = await service.getTodayReviewList(courses);

      expect(list.length, 2);
      expect(list.first.knowledgePointId, 'old', reason: '31 天紧迫度 1.0 排前');
      expect(list.last.knowledgePointId, 'recent');
      expect(list.first.urgency, greaterThan(list.last.urgency));
    });
  });

  group('SpacedRepetitionService 学习事件优先', () {
    test('学习事件的 createdAt 优先于 completedAt 作为最近学习日期', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      // completedAt 为 1 天前（单独看会进入复习），但有一条 5 天前的复习事件
      // 服务应取事件 createdAt（5 天前）→ daysSince=5 → 不在窗口 → 不复习
      await _seedCompleted(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        completedAt: _daysAgo(1),
      );
      await _seedReviewEvent(
        db: db,
        kpId: 'kp1',
        createdAt: _daysAgo(5),
      );
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list, isEmpty,
          reason: '复习事件 createdAt(5 天前) 优先于 completedAt(1 天前)');
    });

    test('最近的复习事件决定 daysSince', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        completedAt: _daysAgo(30),
      );
      // 7 天前复习过 → daysSince=7 → 进入复习
      await _seedReviewEvent(
        db: db,
        kpId: 'kp1',
        createdAt: _daysAgo(7),
      );
      final courses = [_buildCourse('c1', '课程一', [_kp('kp1')])];

      final list = await service.getTodayReviewList(courses);
      expect(list.length, 1);
      expect(list.first.daysSinceLastStudy, 7);
    });
  });

  group('SpacedRepetitionService 多课程与多知识点', () {
    test('多个课程的知识点分别进入复习队列', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
          db: db, courseId: 'c1', kpId: 'a', completedAt: _daysAgo(1));
      await _seedCompleted(
          db: db, courseId: 'c2', kpId: 'b', completedAt: _daysAgo(7));

      final courses = [
        _buildCourse('c1', '课程一', [_kp('a')]),
        _buildCourse('c2', '课程二', [_kp('b')]),
      ];
      final list = await service.getTodayReviewList(courses);
      expect(list.length, 2);
      final courseIds = list.map((e) => e.courseId).toSet();
      expect(courseIds, {'c1', 'c2'});
    });

    test('ReviewReminder 字段完整', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      await _seedCompleted(
        db: db,
        courseId: 'c1',
        kpId: 'kp1',
        completedAt: _daysAgo(3),
      );
      final courses = [_buildCourse('c1', '我的课程', [_kp('kp1')])];
      final list = await service.getTodayReviewList(courses);

      expect(list.length, 1);
      final r = list.first;
      expect(r.knowledgePointId, 'kp1');
      expect(r.knowledgePointTitle, '知识点 kp1');
      expect(r.courseId, 'c1');
      expect(r.courseTitle, '我的课程');
      expect(r.lessonId, 'l1');
      expect(r.daysSinceLastStudy, 3);
      expect(r.urgency, inInclusiveRange(0.0, 1.0));
    });

    test('空课程列表返回空复习队列', () async {
      final (db, _, _, service) = _setup();
      addTearDown(db.close);

      final list = await service.getTodayReviewList(const []);
      expect(list, isEmpty);
    });
  });
}

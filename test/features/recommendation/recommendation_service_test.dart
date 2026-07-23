// ignore_for_file: lines_longer_than_80_lines

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lingxi_academy/data/db/database.dart';
import 'package:lingxi_academy/data/models/course_content.dart';
import 'package:lingxi_academy/data/repositories/progress_repository.dart';
import 'package:lingxi_academy/features/recommendation/recommendation_service.dart';

/// 创建内存数据库与 RecommendationService 实例。
(LingxiDatabase, ProgressRepository, RecommendationService) _setup() {
  final db = LingxiDatabase.forTesting(NativeDatabase.memory());
  final progressRepo = ProgressRepository(db);
  final service = RecommendationService(progressRepo);
  return (db, progressRepo, service);
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

/// 构造一个含单个课时、给定知识点列表与级别的课程。
Course _buildCourse(
  String id,
  String title, {
  CourseLevel level = CourseLevel.l0,
  List<KnowledgePoint> kps = const [],
}) {
  return Course(
    id: id,
    title: title,
    description: '描述',
    level: level,
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

void main() {
  group('RecommendationService 无学习历史', () {
    test('无进度记录的课程推荐为 newCourse', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      final courses = [_buildCourse('c1', '入门课', kps: [_kp('kp1')])];
      final recs = await service.getRecommendations(courses);

      expect(recs.length, 1);
      expect(recs.first.type, RecommendationType.newCourse);
      expect(recs.first.courseId, 'c1');
      expect(recs.first.title, contains('入门课'));
    });

    test('无学习历史时 L0 课程优先（默认起始）', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      final courses = [
        _buildCourse('c4', '高阶课', level: CourseLevel.l4, kps: [_kp('kp1')]),
        _buildCourse('c0', '入门课', level: CourseLevel.l0, kps: [_kp('kp1')]),
      ];
      final recs = await service.getRecommendations(courses);

      expect(recs.length, 2);
      // L0 优先级 80 > L4 优先级 10
      expect(recs.first.courseId, 'c0');
      expect(recs.last.courseId, 'c4');
    });

    test('空课程列表返回空推荐', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      final recs = await service.getRecommendations(const []);
      expect(recs, isEmpty);
    });

    test('newCourse 副标题包含级别标签', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      final courses = [_buildCourse('c0', '入门课', kps: [_kp('kp1')])];
      final recs = await service.getRecommendations(courses);

      expect(recs.first.subtitle, contains('L0'));
    });
  });

  group('RecommendationService 进行中课程', () {
    test('部分完成推荐继续学习下一个未完成知识点', () async {
      final (db, progressRepo, service) = _setup();
      addTearDown(db.close);

      final kps = [_kp('kp1'), _kp('kp2')];
      final courses = [_buildCourse('c1', '进行中课', kps: kps)];

      // kp1 完成、kp2 进行中 → 完成率 0.5
      await progressRepo.markCompleted('c1', 'l1', 'kp1');
      await progressRepo.markInProgress('c1', 'l1', 'kp2');

      final recs = await service.getRecommendations(courses);
      expect(recs.length, 1);
      expect(recs.first.type, RecommendationType.continuelearning);
      expect(recs.first.knowledgePointId, 'kp2', reason: '下一个未完成知识点');
      expect(recs.first.lessonId, 'l1');
      expect(recs.first.subtitle, contains('50'));
    });

    test('进行中课程优先级最高（priority 100）', () async {
      final (db, progressRepo, service) = _setup();
      addTearDown(db.close);

      final kps = [_kp('kp1'), _kp('kp2')];
      final courses = [
        _buildCourse('c1', '进行中课', kps: kps),
        _buildCourse('c2', '新课', level: CourseLevel.l0, kps: [_kp('x1')]),
      ];

      await progressRepo.markCompleted('c1', 'l1', 'kp1');
      await progressRepo.markInProgress('c1', 'l1', 'kp2');

      final recs = await service.getRecommendations(courses);
      expect(recs.first.type, RecommendationType.continuelearning);
      expect(recs.first.courseId, 'c1', reason: '进行中优先级 100 高于新课 80');
    });

    test('继续学习副标题包含完成百分比', () async {
      final (db, progressRepo, service) = _setup();
      addTearDown(db.close);

      final kps = [_kp('kp1'), _kp('kp2')];
      final courses = [_buildCourse('c1', '课', kps: kps)];
      await progressRepo.markCompleted('c1', 'l1', 'kp1');
      await progressRepo.markInProgress('c1', 'l1', 'kp2');

      final recs = await service.getRecommendations(courses);
      expect(recs.first.subtitle, contains('%'));
      expect(recs.first.subtitle, contains('课'));
    });
  });

  group('RecommendationService 已完成课程', () {
    test('全部完成推荐复习', () async {
      final (db, progressRepo, service) = _setup();
      addTearDown(db.close);

      final kps = [_kp('kp1'), _kp('kp2')];
      final courses = [_buildCourse('c1', '已学完', kps: kps)];
      await progressRepo.markCompleted('c1', 'l1', 'kp1');
      await progressRepo.markCompleted('c1', 'l1', 'kp2');

      final recs = await service.getRecommendations(courses);
      expect(recs.length, 1);
      expect(recs.first.type, RecommendationType.review);
      expect(recs.first.courseId, 'c1');
      expect(recs.first.title, contains('复习'));
    });

    test('已完成某级别后下一级别新课优先级低于进行中课程', () async {
      final (db, progressRepo, service) = _setup();
      addTearDown(db.close);

      final kps = [_kp('kp1'), _kp('kp2')];
      final courses = [
        _buildCourse('c1', 'L0 课', level: CourseLevel.l0, kps: kps),
        _buildCourse('c2', 'L1 课', level: CourseLevel.l1, kps: [_kp('x1')]),
      ];
      // L0 全部完成 → 推荐 L1 新课
      await progressRepo.markCompleted('c1', 'l1', 'kp1');
      await progressRepo.markCompleted('c1', 'l1', 'kp2');

      final recs = await service.getRecommendations(courses);
      // c1 review (priority 10) 与 c2 newCourse L1 (priority 60)
      expect(recs.first.courseId, 'c2', reason: 'L1 新课(60) 优于 已完成复习(10)');
      expect(recs.first.type, RecommendationType.newCourse);
    });
  });

  group('RecommendationService 推荐数量与排序', () {
    test('最多返回 5 条推荐', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      final courses = [
        for (var i = 0; i < 6; i++)
          _buildCourse('c$i', '课$i', kps: [_kp('kp$i')]),
      ];
      final recs = await service.getRecommendations(courses);
      expect(recs.length, 5, reason: '推荐列表上限 5');
    });

    test('推荐按优先级降序排序', () async {
      final (db, progressRepo, service) = _setup();
      addTearDown(db.close);

      final kps = [_kp('kp1'), _kp('kp2')];
      final courses = [
        _buildCourse('c1', '进行中', kps: kps),
        _buildCourse('c2', 'L0 新', level: CourseLevel.l0, kps: [_kp('x')]),
        _buildCourse('c3', 'L3 新', level: CourseLevel.l3, kps: [_kp('y')]),
      ];
      await progressRepo.markCompleted('c1', 'l1', 'kp1');
      await progressRepo.markInProgress('c1', 'l1', 'kp2');

      final recs = await service.getRecommendations(courses);
      // 优先级：进行中(100) > L0 新课(80) > L3 新课(20)
      expect(recs[0].courseId, 'c1');
      expect(recs[1].courseId, 'c2');
      expect(recs[2].courseId, 'c3');
      expect(
        recs[0].priority >= recs[1].priority,
        isTrue,
      );
      expect(
        recs[1].priority >= recs[2].priority,
        isTrue,
      );
    });
  });

  group('RecommendationService getContinueLearningRecommendation', () {
    test('存在进行中课程时返回继续学习推荐', () async {
      final (db, progressRepo, service) = _setup();
      addTearDown(db.close);

      final kps = [_kp('kp1'), _kp('kp2')];
      final courses = [_buildCourse('c1', '课', kps: kps)];
      await progressRepo.markCompleted('c1', 'l1', 'kp1');
      await progressRepo.markInProgress('c1', 'l1', 'kp2');

      final rec = await service.getContinueLearningRecommendation(courses);
      expect(rec, isNotNull);
      expect(rec!.type, RecommendationType.continuelearning);
      expect(rec.knowledgePointId, 'kp2');
    });

    test('无进行中课程时返回 null', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      final courses = [_buildCourse('c1', '新课', kps: [_kp('kp1')])];
      final rec = await service.getContinueLearningRecommendation(courses);
      expect(rec, isNull);
    });

    test('全部完成的课程不返回继续学习推荐', () async {
      final (db, progressRepo, service) = _setup();
      addTearDown(db.close);

      final kps = [_kp('kp1')];
      final courses = [_buildCourse('c1', '课', kps: kps)];
      await progressRepo.markCompleted('c1', 'l1', 'kp1');

      final rec = await service.getContinueLearningRecommendation(courses);
      expect(rec, isNull);
    });

    test('空课程列表返回 null', () async {
      final (db, _, service) = _setup();
      addTearDown(db.close);

      final rec = await service.getContinueLearningRecommendation(const []);
      expect(rec, isNull);
    });

    test('多个课程时返回首个进行中课程的推荐', () async {
      final (db, progressRepo, service) = _setup();
      addTearDown(db.close);

      final courses = [
        _buildCourse('c1', '新课', kps: [_kp('a')]),
        _buildCourse('c2', '进行中', kps: [_kp('b1'), _kp('b2')]),
      ];
      await progressRepo.markCompleted('c2', 'l1', 'b1');
      await progressRepo.markInProgress('c2', 'l1', 'b2');

      final rec = await service.getContinueLearningRecommendation(courses);
      expect(rec, isNotNull);
      expect(rec!.courseId, 'c2');
      expect(rec.knowledgePointId, 'b2');
    });
  });
}

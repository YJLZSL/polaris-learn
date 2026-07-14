import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../models/course_content.dart';

/// 课程内容仓库：从 `assets/courses/` 加载课程 JSON 并解析为 [Course] 对象。
///
/// 课程文件清单通过读取 `AssetManifest.json` 动态发现，无需硬编码维护。
/// 新增课程文件时只需放入 `assets/courses/` 目录并在 `pubspec.yaml` 的
/// assets 声明中包含该目录即可。
///
/// 已加载的课程会缓存在内存中（[_cache]），避免重复 IO；首次加载后
/// 后续调用直接返回缓存结果。可通过 [clearCache] 清除缓存以触发重新加载。
class CourseRepository {
  CourseRepository();

  /// 已加载课程的内存缓存，避免重复读取 assets。
  List<Course>? _cache;

  /// 加载所有课程，按 [Course.order] 升序排列。
  ///
  /// 单个课程文件缺失或 JSON 损坏时跳过该课程，不影响其他课程加载。
  /// 结果会缓存，后续调用直接返回缓存副本。
  Future<List<Course>> getAllCourses() async {
    final cached = _cache;
    if (cached != null) {
      return cached;
    }
    final courses = <Course>[];
    final courseFiles = await _loadCourseFiles();
    for (final path in courseFiles) {
      final course = await _loadCourseFile(path);
      if (course != null) {
        courses.add(course);
      }
    }
    courses.sort((a, b) => a.order.compareTo(b.order));
    _cache = List<Course>.unmodifiable(courses);
    return _cache!;
  }

  /// 获取单个课程，未找到返回 null。
  Future<Course?> getCourse(String courseId) async {
    final all = await getAllCourses();
    for (final course in all) {
      if (course.id == courseId) {
        return course;
      }
    }
    return null;
  }

  /// 获取指定级别的课程列表。
  Future<List<Course>> getCoursesByLevel(CourseLevel level) async {
    final all = await getAllCourses();
    return all.where((course) => course.level == level).toList();
  }

  /// 按 ID 查找知识点。
  ///
  /// 传入 [courseId]、[lessonId]、[knowledgePointId] 三级定位，
  /// 未找到返回 null。
  Future<KnowledgePoint?> getKnowledgePoint(
    String courseId,
    String lessonId,
    String knowledgePointId,
  ) async {
    final course = await getCourse(courseId);
    if (course == null) {
      return null;
    }
    for (final module in course.modules) {
      for (final lesson in module.lessons) {
        if (lesson.id != lessonId) {
          continue;
        }
        for (final point in lesson.knowledgePoints) {
          if (point.id == knowledgePointId) {
            return point;
          }
        }
      }
    }
    return null;
  }

  /// 读取并解析单个课程 JSON 文件。
  ///
  /// 资产缺失、JSON 格式错误或顶层结构非对象时返回 null，
  /// 由调用方决定是否跳过。
  Future<Course?> _loadCourseFile(String path) async {
    try {
      final raw = await rootBundle.loadString(path);
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        return null;
      }
      return Course.fromJson(decoded);
    } catch (_) {
      // 资产缺失或 JSON 损坏时返回 null，调用方将跳过该课程。
      return null;
    }
  }

  /// 从 `AssetManifest.json` 动态发现课程文件清单。
  ///
  /// 过滤 `assets/courses/` 目录下以 `.json` 结尾的资产，排除
  /// `schema.json`（JSON Schema 定义文件，非课程数据）。
  /// AssetManifest 不可用或解析失败时返回空列表。
  Future<List<String>> _loadCourseFiles() async {
    try {
      final manifest = await rootBundle.loadString('AssetManifest.json');
      final manifestMap = jsonDecode(manifest) as Map<String, dynamic>;
      return manifestMap.keys
          .where(
            (key) =>
                key.startsWith('assets/courses/') &&
                key.endsWith('.json') &&
                !key.contains('schema.json'),
          )
          .toList();
    } catch (_) {
      // AssetManifest 不可用或解析失败时返回空列表。
      return <String>[];
    }
  }

  /// 清除课程缓存（用于热重载或手动刷新）。
  ///
  /// 清除后再次调用 [getAllCourses] 会重新从 assets 加载课程数据。
  void clearCache() {
    _cache = null;
  }
}

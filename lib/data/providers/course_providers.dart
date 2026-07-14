import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/course_content.dart';
import '../repositories/course_repository.dart';

/// [CourseRepository] 提供者。
///
/// 课程内容为静态资产，仓库无外部依赖，全局共享单例即可。
/// 测试时可通过 `overrideWithValue` 注入自定义实例。
final courseRepositoryProvider = Provider<CourseRepository>((ref) {
  return CourseRepository();
});

/// 所有课程 Provider。
///
/// 首次读取时从 assets 加载全部课程并缓存，后续直接返回缓存结果。
final allCoursesProvider = FutureProvider<List<Course>>((ref) async {
  return ref.watch(courseRepositoryProvider).getAllCourses();
});

/// 按级别过滤课程 Provider。
///
/// 传入 [CourseLevel] 作为 family 参数，返回该级别下的全部课程。
final coursesByLevelProvider =
    FutureProvider.family<List<Course>, CourseLevel>((ref, level) async {
  return ref.watch(courseRepositoryProvider).getCoursesByLevel(level);
});

/// 按 ID 获取课程 Provider。
///
/// 传入课程 ID 作为 family 参数，未找到时返回 null。
final courseProvider =
    FutureProvider.family<Course?, String>((ref, courseId) async {
  return ref.watch(courseRepositoryProvider).getCourse(courseId);
});

/// 路由名称与路径常量
///
/// 统一管理路由的 name 和 path，便于在代码中以常量引用，避免硬编码字符串。
class RouteNames {
  RouteNames._();

  // 路由名称
  static const String onboarding = 'onboarding';
  static const String apiSetup = 'apiSetup';
  static const String home = 'home';
  static const String learning = 'learning';
  static const String lesson = 'lesson';
  static const String chatList = 'chatList';
  static const String chat = 'chat';
  static const String notes = 'notes';
  static const String noteEditor = 'noteEditor';
  static const String settings = 'settings';
  static const String settingsApi = 'settingsApi';
  static const String achievements = 'achievements';
  static const String statistics = 'statistics';
  static const String help = 'help';

  // 路由路径
  static const String onboardingPath = '/onboarding';
  static const String apiSetupPath = '/onboarding/api-setup';
  static const String homePath = '/home';
  static const String learningPath = '/learning';
  static const String lessonPath = '/learning/:courseId/:lessonId';
  static const String chatListPath = '/chat';
  static const String chatPath = '/chat/:conversationId';
  static const String notesPath = '/notes';
  static const String noteEditorPath = '/notes/:noteId';
  static const String settingsPath = '/settings';
  static const String settingsApiPath = '/settings/api';
  static const String achievementsPath = '/achievements';
  static const String statisticsPath = '/statistics';
  static const String helpPath = '/help';
}

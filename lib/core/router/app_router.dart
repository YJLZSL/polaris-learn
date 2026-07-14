import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lingxi_academy/core/motion/page_transitions.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:lingxi_academy/core/router/route_names.dart';
import 'package:lingxi_academy/features/progress/achievements_page.dart';
import 'package:lingxi_academy/features/progress/statistics_page.dart';
import 'package:lingxi_academy/features/chat/chat_list_page.dart';
import 'package:lingxi_academy/features/chat/chat_page.dart';
import 'package:lingxi_academy/features/help/help_center_page.dart';
import 'package:lingxi_academy/features/home/home_page.dart';
import 'package:lingxi_academy/features/learning/learning_path_page.dart';
import 'package:lingxi_academy/features/learning/lesson_page.dart';
import 'package:lingxi_academy/features/notes/note_editor_page.dart';
import 'package:lingxi_academy/features/notes/notes_page.dart';
import 'package:lingxi_academy/features/onboarding/api_setup_wizard_page.dart';
import 'package:lingxi_academy/features/onboarding/onboarding_page.dart';
import 'package:lingxi_academy/features/settings/api_settings_page.dart';
import 'package:lingxi_academy/features/settings/settings_page.dart';

/// 全局 GoRouter 提供者。
///
/// 引导判断逻辑：读取 SharedPreferences 的 `onboarding_completed` 标志，
/// 未完成则重定向到 `/onboarding`；已完成却仍在引导页则重定向回 `/home`。
/// 引导未完成时允许访问 `/onboarding/api-setup` 与 `/settings/api`，
/// 以便用户在引导过程中配置 API。
final goRouterProvider = Provider<GoRouter>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return GoRouter(
    initialLocation: RouteNames.homePath,
    redirect: (context, state) {
      final onboardingCompleted =
          prefs.getBool('onboarding_completed') ?? false;
      final location = state.matchedLocation;
      // 引导相关路径：/onboarding、/onboarding/api-setup、/settings/api
      // 这些路径在引导未完成时也允许访问
      final inOnboarding = location == RouteNames.onboardingPath ||
          location == RouteNames.apiSetupPath ||
          location == RouteNames.settingsApiPath;
      if (!onboardingCompleted && !inOnboarding) {
        return RouteNames.onboardingPath;
      }
      if (onboardingCompleted &&
          (location == RouteNames.onboardingPath ||
              location == RouteNames.apiSetupPath)) {
        return RouteNames.homePath;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: RouteNames.onboardingPath,
        name: RouteNames.onboarding,
        pageBuilder: (context, state) => LingxiPageTransitions.buildPage(
          context: context,
          state: state,
          child: const OnboardingPage(),
        ),
      ),
      GoRoute(
        path: RouteNames.apiSetupPath,
        name: RouteNames.apiSetup,
        pageBuilder: (context, state) => LingxiPageTransitions.buildModalPage(
          context: context,
          state: state,
          child: const ApiSetupWizardPage(),
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => _AppShell(child: child),
        routes: [
          GoRoute(
            path: RouteNames.homePath,
            name: RouteNames.home,
            pageBuilder: (context, state) => LingxiPageTransitions.buildPage(
              context: context,
              state: state,
              child: const HomePage(),
            ),
          ),
          GoRoute(
            path: RouteNames.learningPath,
            name: RouteNames.learning,
            pageBuilder: (context, state) => LingxiPageTransitions.buildPage(
              context: context,
              state: state,
              child: const LearningPathPage(),
            ),
            routes: [
              GoRoute(
                path: ':courseId/:lessonId',
                name: RouteNames.lesson,
                pageBuilder: (context, state) =>
                    LingxiPageTransitions.buildSlidePage(
                  context: context,
                  state: state,
                  child: LessonPage(
                    courseId: state.pathParameters['courseId'] ?? '',
                    lessonId: state.pathParameters['lessonId'] ?? '',
                  ),
                ),
              ),
            ],
          ),
          GoRoute(
            path: RouteNames.chatListPath,
            name: RouteNames.chatList,
            pageBuilder: (context, state) => LingxiPageTransitions.buildPage(
              context: context,
              state: state,
              child: const ChatListPage(),
            ),
            routes: [
              GoRoute(
                path: ':conversationId',
                name: RouteNames.chat,
                pageBuilder: (context, state) =>
                    LingxiPageTransitions.buildSlidePage(
                  context: context,
                  state: state,
                  child: ChatPage(
                    conversationId:
                        state.pathParameters['conversationId'] ?? '',
                  ),
                ),
              ),
            ],
          ),
          GoRoute(
            path: RouteNames.notesPath,
            name: RouteNames.notes,
            pageBuilder: (context, state) => LingxiPageTransitions.buildPage(
              context: context,
              state: state,
              child: const NotesPage(),
            ),
            routes: [
              GoRoute(
                path: ':noteId',
                name: RouteNames.noteEditor,
                pageBuilder: (context, state) =>
                    LingxiPageTransitions.buildModalPage(
                  context: context,
                  state: state,
                  child: NoteEditorPage(
                    noteId: state.pathParameters['noteId'] ?? 'new',
                  ),
                ),
              ),
            ],
          ),
          GoRoute(
            path: RouteNames.achievementsPath,
            name: RouteNames.achievements,
            pageBuilder: (context, state) => LingxiPageTransitions.buildPage(
              context: context,
              state: state,
              child: const AchievementsPage(),
            ),
          ),
          GoRoute(
            path: RouteNames.statisticsPath,
            name: RouteNames.statistics,
            pageBuilder: (context, state) => LingxiPageTransitions.buildPage(
              context: context,
              state: state,
              child: const StatisticsPage(),
            ),
          ),
          GoRoute(
            path: RouteNames.settingsPath,
            name: RouteNames.settings,
            pageBuilder: (context, state) => LingxiPageTransitions.buildPage(
              context: context,
              state: state,
              child: const SettingsPage(),
            ),
          ),
          GoRoute(
            path: RouteNames.settingsApiPath,
            name: RouteNames.settingsApi,
            pageBuilder: (context, state) =>
                LingxiPageTransitions.buildModalPage(
              context: context,
              state: state,
              child: const ApiSettingsPage(),
            ),
          ),
          GoRoute(
            path: RouteNames.helpPath,
            name: RouteNames.help,
            pageBuilder: (context, state) => LingxiPageTransitions.buildPage(
              context: context,
              state: state,
              child: const HelpCenterPage(),
            ),
          ),
        ],
      ),
    ],
  );
});

/// 导航目的地描述。
class _NavDestination {
  const _NavDestination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.path,
  });
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final String path;
}

/// 全局导航壳：桌面端用 NavigationRail，移动端用 NavigationBar。
class _AppShell extends StatefulWidget {
  const _AppShell({required this.child});
  final Widget child;

  @override
  State<_AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<_AppShell> {
  static const _destinations = <_NavDestination>[
    _NavDestination(
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
      label: '首页',
      path: RouteNames.homePath,
    ),
    _NavDestination(
      icon: Icons.school_outlined,
      selectedIcon: Icons.school,
      label: '学习',
      path: RouteNames.learningPath,
    ),
    _NavDestination(
      icon: Icons.chat_outlined,
      selectedIcon: Icons.chat,
      label: '对话',
      path: RouteNames.chatListPath,
    ),
    _NavDestination(
      icon: Icons.note_alt_outlined,
      selectedIcon: Icons.note_alt,
      label: '笔记',
      path: RouteNames.notesPath,
    ),
    _NavDestination(
      icon: Icons.emoji_events_outlined,
      selectedIcon: Icons.emoji_events,
      label: '成就',
      path: RouteNames.achievementsPath,
    ),
    _NavDestination(
      icon: Icons.settings_outlined,
      selectedIcon: Icons.settings,
      label: '设置',
      path: RouteNames.settingsPath,
    ),
  ];

  int _selectedIndex(String location) {
    for (var i = 0; i < _destinations.length; i++) {
      if (location.startsWith(_destinations[i].path)) {
        return i;
      }
    }
    return 0;
  }

  Widget _buildIcon(IconData iconData, {bool selected = false}) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 200),
      transitionBuilder: (child, animation) {
        return ScaleTransition(
          scale: Tween<double>(begin: 0.7, end: 1.0).animate(CurvedAnimation(
            parent: animation,
            curve: Curves.easeOutBack,
          )),
          child: FadeTransition(opacity: animation, child: child),
        );
      },
      child: Icon(
        iconData,
        key: ValueKey('${iconData.codePoint}_$selected'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final index = _selectedIndex(location);
    final isDesktop = MediaQuery.of(context).size.width >= 1024;

    if (isDesktop) {
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: index,
              onDestinationSelected: (i) => context.go(_destinations[i].path),
              labelType: NavigationRailLabelType.all,
              useIndicator: true,
              destinations: [
                for (var i = 0; i < _destinations.length; i++)
                  NavigationRailDestination(
                    icon: _buildIcon(_destinations[i].icon),
                    selectedIcon: _buildIcon(_destinations[i].selectedIcon, selected: true),
                    label: Text(_destinations[i].label),
                  ),
              ],
            ),
            const VerticalDivider(thickness: 1, width: 1),
            Expanded(child: widget.child),
          ],
        ),
      );
    }

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => context.go(_destinations[i].path),
        destinations: [
          for (var i = 0; i < _destinations.length; i++)
            NavigationDestination(
              icon: _buildIcon(_destinations[i].icon),
              selectedIcon: _buildIcon(_destinations[i].selectedIcon, selected: true),
              label: _destinations[i].label,
            ),
        ],
      ),
    );
  }
}

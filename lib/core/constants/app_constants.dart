/// 应用级常量定义
const String kAppName = '灵犀学院';
const String kAppVersion = '0.4.0';

/// GitHub 仓库信息（用于自动更新与"关于"页展示）
const String kRepoOwner = 'YJLZSL';
const String kRepoName = 'polaris-learn';
const String kRepoUrl = 'https://github.com/YJLZSL/polaris-learn';
const String kGitHubApiBase = 'https://api.github.com';

/// 自动更新检查间隔（小时），启动后静默检查的节流窗口
const int kUpdateCheckIntervalHours = 24;

/// 列表默认每页数量
const int kDefaultPageSize = 20;

/// 每日最少完成 1 个知识点才算打卡
const int kStreakMinDailyProgress = 1;

/// 测验通过阈值 80%
const double kQuizPassThreshold = 0.8;

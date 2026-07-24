import 'package:flutter/foundation.dart';

/// 自动更新流程的状态枚举。
///
/// 状态流转：
/// - [idle] → [checking] → [upToDate] / [available] / [skipped] / [error]
/// - [available] → [downloading] → [downloaded] → [installing]
/// - 用户可从 [available] 跳过到 [skipped]
enum UpdateStatus {
  /// 初始/无操作
  idle,

  /// 正在检查 GitHub Release
  checking,

  /// 已是最新版本
  upToDate,

  /// 发现新版本，等待用户决策
  available,

  /// 下载中
  downloading,

  /// 下载完成，等待安装
  downloaded,

  /// 安装中
  installing,

  /// 出错
  error,

  /// 用户跳过此版本
  skipped,
}

/// 自动更新状态。
@immutable
class UpdateState {
  const UpdateState({
    required this.status,
    this.releaseInfo,
    this.downloadProgress = 0.0,
    this.errorMessage,
    this.skippedVersion,
    this.fromBackground = false,
  });

  /// 当前状态
  final UpdateStatus status;

  /// 新版本元数据（[status] 为 [UpdateStatus.available] 及之后状态时非空）
  final ReleaseInfo? releaseInfo;

  /// 下载进度（0.0 - 1.0），仅 [UpdateStatus.downloading] 时有意义
  final double downloadProgress;

  /// 错误信息，仅 [UpdateStatus.error] 时有意义
  final String? errorMessage;

  /// 用户跳过的版本号，仅 [UpdateStatus.skipped] 时有意义
  final String? skippedVersion;

  /// 标记此状态是否来自后台静默检查（启动时自动触发）。
  ///
  /// UI 可据此决定是否自动弹出对话框：
  /// - true：启动时自动检查发现新版本，应自动弹窗
  /// - false：用户手动触发检查或主动操作，不自动弹窗
  final bool fromBackground;

  UpdateState copyWith({
    UpdateStatus? status,
    ReleaseInfo? releaseInfo,
    double? downloadProgress,
    String? errorMessage,
    String? skippedVersion,
    bool? fromBackground,
  }) {
    return UpdateState(
      status: status ?? this.status,
      releaseInfo: releaseInfo ?? this.releaseInfo,
      downloadProgress: downloadProgress ?? this.downloadProgress,
      errorMessage: errorMessage ?? this.errorMessage,
      skippedVersion: skippedVersion ?? this.skippedVersion,
      fromBackground: fromBackground ?? this.fromBackground,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UpdateState &&
          status == other.status &&
          releaseInfo == other.releaseInfo &&
          downloadProgress == other.downloadProgress &&
          errorMessage == other.errorMessage &&
          skippedVersion == other.skippedVersion &&
          fromBackground == other.fromBackground;

  @override
  int get hashCode => Object.hash(
        status,
        releaseInfo,
        downloadProgress,
        errorMessage,
        skippedVersion,
        fromBackground,
      );
}

/// GitHub Release 元数据。
@immutable
class ReleaseInfo {
  const ReleaseInfo({
    required this.version,
    required this.tagName,
    required this.name,
    required this.body,
    this.androidApkUrl,
    this.windowsZipUrl,
    this.apkSize,
    this.zipSize,
    required this.publishedAt,
  });

  /// 版本号（已去 v 前缀），如 "0.4.0"
  final String version;

  /// Git 标签名，如 "v0.4.0"
  final String tagName;

  /// Release 标题
  final String name;

  /// Release notes（Markdown）
  final String body;

  /// 匹配当前设备 ABI 的 Android APK 下载 URL
  final String? androidApkUrl;

  /// Windows ZIP 下载 URL
  final String? windowsZipUrl;

  /// APK 文件大小（字节）
  final int? apkSize;

  /// ZIP 文件大小（字节）
  final int? zipSize;

  /// Release 发布时间
  final DateTime publishedAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReleaseInfo &&
          version == other.version &&
          tagName == other.tagName;

  @override
  int get hashCode => Object.hash(version, tagName);
}

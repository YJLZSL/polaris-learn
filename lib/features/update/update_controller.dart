import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lingxi_academy/core/constants/app_constants.dart';
import 'package:lingxi_academy/core/providers/app_providers.dart';
import 'package:lingxi_academy/data/repositories/update_preferences_repository.dart';

import 'update_service.dart';
import 'update_state.dart';

/// 自动更新控制器（StateNotifier）。
///
/// 状态机：
/// ```
/// idle ──checkForUpdates(force)──> checking
/// checking ──newer──> available
/// checking ──same/error──> upToDate / error
/// available ──download──> downloading ──done──> downloaded
/// downloaded ──install──> installing
/// available ──skip──> skipped
/// ```
///
/// 节流规则：
/// - [checkForUpdates] 默认遵守 [kUpdateCheckIntervalHours] 节流
/// - `force: true` 跳过节流（用于用户手动触发）
/// - 跳过的版本不会再次提示，除非出现更高版本
class UpdateController extends StateNotifier<UpdateState> {
  UpdateController(this._service, this._prefs)
      : super(const UpdateState(status: UpdateStatus.idle));

  final UpdateService _service;
  final UpdatePreferencesRepository _prefs;

  CancelToken? _downloadCancelToken;
  String? _downloadedFilePath;

  /// 检查更新。
  ///
  /// [force] 为 true 时跳过 24 小时节流，用于用户手动点击"检查更新"。
  /// [silent] 为 true 时表示静默检查（启动时），无新版本或出错时保持 idle。
  Future<void> checkForUpdates({
    bool force = false,
    bool silent = false,
  }) async {
    // 防止与正在进行的检查/下载冲突
    final s = state.status;
    if (s == UpdateStatus.checking ||
        s == UpdateStatus.downloading ||
        s == UpdateStatus.installing) {
      return;
    }

    // 节流：非强制时检查上次检查时间
    if (!force) {
      final lastCheck = _prefs.getLastCheckTime();
      if (lastCheck != null) {
        final elapsed = DateTime.now().difference(lastCheck);
        if (elapsed < Duration(hours: kUpdateCheckIntervalHours)) {
          return;
        }
      }
    }

    state = const UpdateState(status: UpdateStatus.checking);

    try {
      // 平台不支持时静默回到 idle
      if (!_service.isPlatformSupported) {
        state = const UpdateState(status: UpdateStatus.idle);
        return;
      }

      final release = await _service.fetchLatestRelease();
      final currentVersion = await _service.getCurrentVersion();
      await _prefs.setLastCheckTime(DateTime.now());

      final skipped = _prefs.getSkippedVersion();
      final isSkipped = skipped != null && skipped == release.version;

      if (!_service.isNewer(
        current: currentVersion,
        latest: release.version,
      )) {
        // 已是最新版本
        state = UpdateState(
          status: silent ? UpdateStatus.idle : UpdateStatus.upToDate,
          releaseInfo: release,
        );
        return;
      }

      // 有新版本，但用户已跳过此版本（静默模式下不提示）
      if (isSkipped && silent) {
        state = UpdateState(
          status: UpdateStatus.idle,
          releaseInfo: release,
          skippedVersion: skipped,
        );
        return;
      }

      // 有新版本，提示用户
      state = UpdateState(
        status: UpdateStatus.available,
        releaseInfo: release,
        fromBackground: silent,
      );
    } on DioException catch (e) {
      state = UpdateState(
        status: silent ? UpdateStatus.idle : UpdateStatus.error,
        errorMessage: _describeDioError(e),
      );
    } on UpdateServiceException catch (e) {
      state = UpdateState(
        status: silent ? UpdateStatus.idle : UpdateStatus.error,
        errorMessage: e.message,
      );
    } on Object catch (e) {
      state = UpdateState(
        status: silent ? UpdateStatus.idle : UpdateStatus.error,
        errorMessage: '检查更新失败：$e',
      );
    }
  }

  /// 跳过当前可用版本。
  Future<void> skipCurrentVersion() async {
    final info = state.releaseInfo;
    if (info == null) return;
    await _prefs.setSkippedVersion(info.version);
    state = UpdateState(
      status: UpdateStatus.skipped,
      releaseInfo: info,
      skippedVersion: info.version,
    );
  }

  /// 开始下载更新（平台资产由 Service 内部选择）。
  ///
  /// 下载进度通过 [UpdateState.downloadProgress] 推送。
  Future<void> downloadUpdate() async {
    final info = state.releaseInfo;
    if (info == null) return;

    _downloadCancelToken?.cancel();
    _downloadCancelToken = CancelToken();

    state = UpdateState(
      status: UpdateStatus.downloading,
      releaseInfo: info,
      downloadProgress: 0.0,
    );

    try {
      final filePath = await _service.downloadAsset(
        info: info,
        cancelToken: _downloadCancelToken!,
        onProgress: _onDownloadProgress,
      );
      _downloadedFilePath = filePath;
      state = UpdateState(
        status: UpdateStatus.downloaded,
        releaseInfo: info,
        downloadProgress: 1.0,
      );
    } on DioException catch (e) {
      if (e.type == DioExceptionType.cancel) {
        // 用户取消，回到 available 状态
        state = UpdateState(
          status: UpdateStatus.available,
          releaseInfo: info,
        );
      } else {
        state = UpdateState(
          status: UpdateStatus.error,
          releaseInfo: info,
          errorMessage: _describeDioError(e),
        );
      }
    } on UpdateServiceException catch (e) {
      state = UpdateState(
        status: UpdateStatus.error,
        releaseInfo: info,
        errorMessage: e.message,
      );
    } on Object catch (e) {
      state = UpdateState(
        status: UpdateStatus.error,
        releaseInfo: info,
        errorMessage: '下载失败：$e',
      );
    }
  }

  /// 安装已下载的更新。
  ///
  /// Android：调用系统安装器；Windows：解压并打开目录。
  Future<void> installUpdate() async {
    final info = state.releaseInfo;
    final filePath = _downloadedFilePath;
    if (info == null || filePath == null) return;

    state = UpdateState(
      status: UpdateStatus.installing,
      releaseInfo: info,
      downloadProgress: 1.0,
    );

    try {
      final ok = await _service.installAsset(filePath);
      if (!ok) {
        state = UpdateState(
          status: UpdateStatus.error,
          releaseInfo: info,
          errorMessage: '无法唤起系统安装器，请检查是否授予"安装未知应用"权限',
        );
        return;
      }
      // 安装流程已交给系统，重置内部状态
      _downloadedFilePath = null;
      _downloadCancelToken = null;
      state = UpdateState(
        status: UpdateStatus.idle,
        releaseInfo: info,
      );
    } on Object catch (e) {
      state = UpdateState(
        status: UpdateStatus.error,
        releaseInfo: info,
        errorMessage: '安装失败：$e',
      );
    }
  }

  /// 取消正在进行的下载。
  void cancelDownload() {
    _downloadCancelToken?.cancel();
    _downloadCancelToken = null;
    if (state.status == UpdateStatus.downloading) {
      state = UpdateState(
        status: UpdateStatus.available,
        releaseInfo: state.releaseInfo,
      );
    }
  }

  /// 重置状态到 idle（用于关闭对话框）。
  void reset() {
    _downloadCancelToken?.cancel();
    _downloadCancelToken = null;
    _downloadedFilePath = null;
    state = const UpdateState(status: UpdateStatus.idle);
  }

  void _onDownloadProgress(int received, int total) {
    if (total <= 0) return;
    final progress = (received / total).clamp(0.0, 1.0);
    state = UpdateState(
      status: UpdateStatus.downloading,
      releaseInfo: state.releaseInfo,
      downloadProgress: progress,
    );
  }

  String _describeDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        return '连接超时，请检查网络后重试';
      case DioExceptionType.receiveTimeout:
        return '接收数据超时，请检查网络后重试';
      case DioExceptionType.sendTimeout:
        return '发送数据超时，请检查网络后重试';
      case DioExceptionType.connectionError:
        return '网络连接失败，请检查网络后重试';
      case DioExceptionType.badResponse:
        final code = e.response?.statusCode;
        if (code == 404) {
          return '未找到 GitHub Release（仓库可能尚未发布任何版本）';
        }
        if (code == 403) {
          return 'GitHub API 速率限制，请稍后再试';
        }
        return '服务器返回错误（$code）';
      case DioExceptionType.cancel:
        return '请求已取消';
      case DioExceptionType.badCertificate:
        return '证书验证失败';
      case DioExceptionType.unknown:
        return e.message ?? '未知网络错误';
    }
  }
}

/// [UpdateService] Provider。
///
/// 全局单例，所有调用共享同一 Dio 实例（避免重复创建）。
final updateServiceProvider = Provider<UpdateService>((ref) {
  return UpdateService();
});

/// [UpdatePreferencesRepository] Provider。
final updatePreferencesRepositoryProvider =
    Provider<UpdatePreferencesRepository>((ref) {
  return UpdatePreferencesRepository(ref.watch(sharedPreferencesProvider));
});

/// [UpdateController] Provider。
///
/// 使用 [StateNotifierProvider] 以便 UI 通过 ref.watch 订阅状态。
final updateControllerProvider =
    StateNotifierProvider<UpdateController, UpdateState>((ref) {
  return UpdateController(
    ref.watch(updateServiceProvider),
    ref.watch(updatePreferencesRepositoryProvider),
  );
});

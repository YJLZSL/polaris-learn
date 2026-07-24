import 'dart:io';

import 'package:archive/archive.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:lingxi_academy/core/constants/app_constants.dart';
import 'package:open_filex/open_filex.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path/path.dart' as path;
import 'package:path_provider/path_provider.dart';

import 'update_state.dart';

/// 自动更新服务。
///
/// 职责：
/// - 通过 GitHub Releases API 查询最新版本
/// - 解析 Release 资产，匹配当前平台（Android APK / Windows ZIP）
/// - 下载资产到临时目录，并通过系统安装器打开（Android）/ 解压并打开（Windows）
///
/// 安全：
/// - 仅访问公开仓库的 Release 资产（GitHub API 不需要鉴权）
/// - 不读取/写入 API Key，不经过 [SecureLogInterceptor]（无敏感信息）
/// - 下载使用 [Dio] 默认配置 + 30s 接收超时
///
/// 风格参考 `DataExportService`（纯服务类，状态由 Controller 持有）。
class UpdateService {
  UpdateService({Dio? dio, Future<PackageInfo> Function()? packageInfoLoader})
      : _dio = dio ?? Dio(_defaultOptions),
        _packageInfoLoader = packageInfoLoader ?? PackageInfo.fromPlatform;

  final Dio _dio;
  final Future<PackageInfo> Function() _packageInfoLoader;

  /// Dio 默认配置：连接 15s / 接收 30s（下载单独覆盖为更长）。
  static final BaseOptions _defaultOptions = BaseOptions(
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
    headers: <String, String>{
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  );

  /// 查询最新 GitHub Release。
  ///
  /// 返回 [ReleaseInfo] 或抛出异常（网络/解析错误）。
  /// 调用方应在 try/catch 中包装并映射为 [UpdateStatus.error]。
  Future<ReleaseInfo> fetchLatestRelease() async {
    final uri = Uri.parse(
      '$kGitHubApiBase/repos/$kRepoOwner/$kRepoName/releases/latest',
    );
    final response = await _dio.getUri<dynamic>(uri);
    final data = response.data;
    if (data is! Map) {
      throw UpdateServiceException(
        'GitHub API 返回数据格式异常：期望 JSON 对象，实际为 ${data.runtimeType}',
      );
    }
    return _parseRelease(data);
  }

  /// 解析 GitHub Release JSON 为 [ReleaseInfo]（暴露给测试）。
  @visibleForTesting
  ReleaseInfo parseRelease(Map<String, dynamic> json) => _parseRelease(json);

  ReleaseInfo _parseRelease(Map<String, dynamic> data) {
    final tagName = (data['tag_name'] as String?) ?? '';
    final version = _stripVersionPrefix(tagName);
    final name = (data['name'] as String?) ?? version;
    final body = (data['body'] as String?) ?? '';
    final publishedAtStr = (data['published_at'] as String?) ?? '';
    final publishedAt = DateTime.tryParse(publishedAtStr) ?? DateTime.now();

    String? apkUrl;
    String? zipUrl;
    int? apkSize;
    int? zipSize;

    final assets = data['assets'];
    if (assets is List) {
      for (final asset in assets) {
        if (asset is! Map) continue;
        final name = (asset['name'] as String?) ?? '';
        final url = (asset['browser_download_url'] as String?) ?? '';
        final size = (asset['size'] as num?)?.toInt();
        if (name.toLowerCase().endsWith('.apk')) {
          // 优先匹配更优 ABI（arm64-v8a > universal > armeabi-v7a > x86_64）
          if (apkUrl == null || _isBetterApk(name, path.basename(apkUrl))) {
            apkUrl = url;
            apkSize = size;
          }
        } else if (name.toLowerCase().endsWith('.zip')) {
          if (_isWindowsZip(name)) {
            zipUrl = url;
            zipSize = size;
          }
        }
      }
    }

    return ReleaseInfo(
      version: version,
      tagName: tagName,
      name: name,
      body: body,
      androidApkUrl: apkUrl,
      windowsZipUrl: zipUrl,
      apkSize: apkSize,
      zipSize: zipSize,
      publishedAt: publishedAt,
    );
  }

  /// 判断候选 APK 名称是否优于当前选中 APK。
  bool _isBetterApk(String candidate, String current) {
    return _apkArchRank(candidate) > _apkArchRank(current);
  }

  int _apkArchRank(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('arm64-v8a') || lower.contains('arm64')) return 4;
    if (lower.contains('universal') || lower.contains('noabi')) return 3;
    if (lower.contains('armeabi-v7a') || lower.contains('armv7')) return 2;
    if (lower.contains('x86_64')) return 1;
    return 0;
  }

  bool _isWindowsZip(String name) {
    final lower = name.toLowerCase();
    return lower.contains('windows') || lower.contains('win');
  }

  String _stripVersionPrefix(String tag) {
    if (tag.startsWith('v') || tag.startsWith('V')) {
      return tag.substring(1);
    }
    return tag;
  }

  /// 获取当前应用版本号（不含构建号）。
  Future<String> getCurrentVersion() async {
    final info = await _packageInfoLoader();
    return info.version;
  }

  /// 比较语义版本号 [current] 与 [latest]。
  ///
  /// 返回 true 表示 [latest] 严格大于 [current]。
  /// 支持任意长度的 x.y.z 段，缺位按 0 处理。
  bool isNewer({required String current, required String latest}) {
    final c = _parseSemver(current);
    final l = _parseSemver(latest);
    final maxLen = c.length > l.length ? c.length : l.length;
    for (var i = 0; i < maxLen; i++) {
      final cv = i < c.length ? c[i] : 0;
      final lv = i < l.length ? l[i] : 0;
      if (lv > cv) return true;
      if (lv < cv) return false;
    }
    return false;
  }

  List<int> _parseSemver(String version) {
    final cleaned = version.split(RegExp(r'[+.\-]')).firstWhere(
          (s) => s.isNotEmpty,
          orElse: () => version,
        );
    final parts = cleaned.split('.');
    final result = <int>[];
    for (final part in parts) {
      final n = int.tryParse(part);
      if (n != null) {
        result.add(n);
      }
    }
    if (result.isEmpty) return [0];
    return result;
  }

  /// 当前平台是否支持自动更新（仅 Android / Windows）。
  ///
  /// Web / iOS / macOS / Linux 不支持，调用方应隐藏更新入口。
  bool get isPlatformSupported {
    if (kIsWeb) return false;
    return Platform.isAndroid || Platform.isWindows;
  }

  /// 当前平台对应的下载资产 URL（来自 [ReleaseInfo]）。
  String? assetUrlForPlatform(ReleaseInfo info) {
    if (kIsWeb) return null;
    if (Platform.isAndroid) return info.androidApkUrl;
    if (Platform.isWindows) return info.windowsZipUrl;
    return null;
  }

  /// 下载当前平台对应的资产到临时目录，返回文件路径。
  ///
  /// [onProgress] 回调 (received, total)，total 为 -1 时表示未知大小。
  /// 调用方应通过 [cancelToken] 取消下载。
  /// 若当前平台无对应资产，抛出 [UpdateServiceException]。
  Future<String> downloadAsset({
    required ReleaseInfo info,
    required CancelToken cancelToken,
    void Function(int received, int total)? onProgress,
  }) async {
    final url = assetUrlForPlatform(info);
    if (url == null) {
      throw const UpdateServiceException(
        '当前平台暂无对应的下载资产，请前往 GitHub Release 手动下载',
      );
    }

    final dir = await getTemporaryDirectory();
    final fileName = _basenameFromUrl(url);
    final savePath = path.join(dir.path, 'updates', fileName);
    await Directory(path.dirname(savePath)).create(recursive: true);

    await _dio.download(
      url,
      savePath,
      onReceiveProgress: onProgress,
      cancelToken: cancelToken,
      options: Options(
        receiveTimeout: const Duration(minutes: 15),
        sendTimeout: const Duration(seconds: 30),
      ),
    );
    return savePath;
  }

  /// 安装已下载的资产。
  ///
  /// Android：调用系统安装器（APK）。
  /// Windows：解压 ZIP 到临时目录并通过资源管理器打开。
  ///
  /// 返回值：
  /// - Android：true 表示已成功唤起安装器
  /// - Windows：true 表示已成功解压并打开目录
  Future<bool> installAsset(String filePath) async {
    if (kIsWeb) return false;
    if (Platform.isAndroid) {
      final result = await OpenFilex.open(
        filePath,
        type: 'application/vnd.android.package-archive',
      );
      return result.type.name == 'done';
    }
    if (Platform.isWindows) {
      final result = await _extractAndOpenWindowsZip(filePath);
      return result;
    }
    return false;
  }

  Future<bool> _extractAndOpenWindowsZip(String zipPath) async {
    final dir = await getTemporaryDirectory();
    final extractDir = path.join(
      dir.path,
      'updates',
      'extracted_${DateTime.now().millisecondsSinceEpoch}',
    );
    await Directory(extractDir).create(recursive: true);

    final bytes = await File(zipPath).readAsBytes();
    final archive = ZipDecoder().decodeBytes(bytes);
    for (final file in archive) {
      final destPath = path.join(extractDir, file.name);
      if (file.isFile) {
        final outFile = File(destPath);
        await outFile.parent.create(recursive: true);
        await outFile.writeAsBytes(file.content as List<int>);
      } else {
        await Directory(destPath).create(recursive: true);
      }
    }
    final openResult = await OpenFilex.open(extractDir);
    return openResult.type.name == 'done';
  }

  String _basenameFromUrl(String url) {
    final uri = Uri.parse(url);
    final seg = uri.pathSegments;
    if (seg.isEmpty) return 'download.bin';
    return seg.last;
  }
}

/// 自动更新服务异常。
class UpdateServiceException implements Exception {
  const UpdateServiceException(this.message);
  final String message;

  @override
  String toString() => 'UpdateServiceException: $message';
}

import { getVersion, getReleaseNotes } from "@/lib/version";

/**
 * Android 更新提示横幅。
 * 静态化后无服务端版本检查端点；版本信息由 @/lib/version 静态提供。
 * 当本地版本与最新版本不一致时显示更新提示（目前无远程源，恒不触发）。
 */
export function AndroidUpdateBanner() {
  const localVersion = getVersion();
  const latestVersion = getVersion();
  const releaseNotes = getReleaseNotes();

  if (latestVersion === localVersion) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#4f46e5",
        color: "white",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "14px",
      }}
    >
      <span>✨ 发现新版本 {latestVersion}，{releaseNotes.join("；")}</span>
    </div>
  );
}

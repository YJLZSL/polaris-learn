"use client";

import { useEffect, useState } from "react";

interface UpdateInfo {
  version: string;
}

interface ElectronAPI {
  isElectron?: boolean;
  onUpdateDownloaded?: (callback: (data: UpdateInfo) => void) => void;
  installUpdate?: () => void;
}

/**
 * Detects whether the app is running inside Electron and sets a
 * `data-electron` attribute on the root element so CSS / JS can
 * adapt the UI accordingly.
 */
export default function ElectronDetector() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as { electronAPI?: { isElectron?: boolean } }).electronAPI?.isElectron) {
      document.documentElement.setAttribute("data-electron", "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const electronAPI = (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
    if (electronAPI?.onUpdateDownloaded) {
      electronAPI.onUpdateDownloaded((data) => {
        setUpdateInfo(data);
      });
    }
  }, []);

  if (!updateInfo) {
    return null;
  }

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
      <span>✨ 新版本 {updateInfo.version} 已就绪，重启以更新</span>
      <button
        onClick={() => {
          const api = (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
          api?.installUpdate?.();
        }}
        style={{
          background: "white",
          color: "#4f46e5",
          border: "none",
          borderRadius: "4px",
          padding: "4px 12px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        重启更新
      </button>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

interface VersionInfo {
  version: string;
  androidUrl: string;
  notes: string;
}

/**
 * 检查应用版本更新 (Android / 通用场景)
 * 仅在 Capacitor 环境下激活,对比本地版本与服务端最新版本
 */
export function useVersionCheck(localVersion: string) {
  const [updateAvailable, setUpdateAvailable] = useState<VersionInfo | null>(null);

  useEffect(() => {
    // 仅在 Capacitor (Android) 环境下检查
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    let cancelled = false;
    fetch("/api/version")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: VersionInfo | null) => {
        if (cancelled || !data) return;
        if (data.version && data.version !== localVersion) {
          setUpdateAvailable(data);
        }
      })
      .catch(() => {
        // 静默失败,不打扰用户
      });

    return () => {
      cancelled = true;
    };
  }, [localVersion]);

  return updateAvailable;
}

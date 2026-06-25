"use client";

import { useVersionCheck } from "@/hooks/useVersionCheck";
import packageJson from "../../../package.json";

export function AndroidUpdateBanner() {
  const update = useVersionCheck(packageJson.version);

  if (!update) return null;

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
      <span>✨ 发现新版本 {update.version},点击下载更新</span>
      {update.androidUrl ? (
        <a
          href={update.androidUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "white",
            color: "#4f46e5",
            padding: "4px 12px",
            borderRadius: "6px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          下载
        </a>
      ) : null}
    </div>
  );
}

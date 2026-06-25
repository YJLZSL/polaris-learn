"use client";

import { useEffect } from "react";

/**
 * Detects whether the app is running inside Electron and sets a
 * `data-electron` attribute on the root element so CSS / JS can
 * adapt the UI accordingly.
 */
export default function ElectronDetector() {
  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as { electronAPI?: { isElectron?: boolean } }).electronAPI?.isElectron) {
      document.documentElement.setAttribute("data-electron", "true");
    }
  }, []);

  return null;
}

"use client";

import { useState } from "react";

export default function OfflinePage() {
  const [checking, setChecking] = useState(false);

  const handleRetry = () => {
    setChecking(true);
    // Try to fetch the home page to check connectivity
    fetch("/home", { method: "HEAD", cache: "no-store" })
      .then((res) => {
        if (res.ok) {
          window.location.href = "/home";
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-sm">
        {/* Offline Icon */}
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l8.735 8.735m0 0a.374.374 0 11.53.53m-.53-.53l8.735 8.735M9.75 15.34A8.97 8.97 0 012.25 12c1.521-2.074 3.844-3.616 6.5-4.084m4.5.084c2.656.468 4.979 2.01 6.5 4.084a8.97 8.97 0 01-7.5 3.34M6.75 12a5.25 5.25 0 0110.5 0"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 12a3.75 3.75 0 017.5 0"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-bold text-slate-800">
          当前处于离线状态
        </h1>

        {/* Description */}
        <p className="mb-2 text-sm leading-relaxed text-slate-500">
          无法连接到网络，部分内容和功能暂不可用。
        </p>

        {/* Cached content hint */}
        <div className="mb-8 rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3">
          <p className="text-xs leading-relaxed text-indigo-600">
            你仍然可以查看之前缓存的页面内容。连接恢复后，数据将自动同步。
          </p>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checking ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              正在检查连接...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                />
              </svg>
              重新连接
            </>
          )}
        </button>
      </div>
    </div>
  );
}

import { Component, type ErrorInfo, type ReactNode } from "react";
import PolarisMascot from "@/components/common/PolarisMascot";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const DB_NAMES = ["polaris_learn", "polaris-platform-keyval"];

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleRestart = () => {
    window.location.reload();
  };

  handleClearCache = async () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn("[ErrorBoundary] Failed to clear localStorage:", e);
    }

    try {
      if (typeof window !== "undefined" && "indexedDB" in window) {
        const databases = await indexedDB.databases?.();
        const names = new Set([
          ...DB_NAMES,
          ...(databases?.map((db) => db.name).filter((n): n is string => !!n) ?? []),
        ]);
        for (const name of names) {
          try {
            indexedDB.deleteDatabase(name);
          } catch (e) {
            console.warn(`[ErrorBoundary] Failed to delete IndexedDB ${name}:`, e);
          }
        }
      }
    } catch (e) {
      console.warn("[ErrorBoundary] Failed to clear IndexedDB:", e);
    }

    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorMessage = this.state.error?.message || "未知错误";

    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-auto bg-[#0B0F19] p-6 text-white">
        <div className="relative flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-white/10 bg-[#11131C] p-8 shadow-2xl">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-500/20 blur-xl" />
            <PolarisMascot mood="sleepy" size={88} />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">哎呀，Polaris 小灵遇到了问题</h1>
            <p className="mt-2 text-sm text-slate-400">
              应用发生了意外错误，但数据通常是安全的。请尝试重启或清除缓存。
            </p>
          </div>

          <div className="w-full rounded-lg bg-slate-900/80 p-3">
            <p className="break-all font-mono text-xs text-slate-500">{errorMessage}</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.handleRestart}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
            >
              重启应用
            </button>
            <button
              type="button"
              onClick={this.handleClearCache}
              className="flex-1 rounded-xl border border-slate-600 bg-transparent px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 active:scale-[0.98]"
            >
              清除缓存
            </button>
          </div>

          <p className="text-center text-xs text-slate-600">
            如果问题持续出现，欢迎向 Polaris 小灵反馈。
          </p>
        </div>
      </div>
    );
  }
}

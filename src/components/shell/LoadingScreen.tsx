import PolarisMascot from "@/components/common/PolarisMascot";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Polaris 正在准备学习之旅..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F19] text-white">
      <div className="relative flex flex-col items-center gap-6 p-8">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-500/20 blur-xl" />
          <PolarisMascot mood="focus" size={96} />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Polaris 北极星</h2>
          <p className="max-w-[260px] text-sm text-slate-400">{message}</p>
        </div>
        <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-1/2 animate-shimmer-fast rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        </div>
      </div>
    </div>
  );
}

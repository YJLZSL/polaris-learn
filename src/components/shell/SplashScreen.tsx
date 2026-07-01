import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import PolarisMascot from "@/components/common/PolarisMascot";
import { APP_VERSION } from "@/lib/version";

export interface SplashScreenProps {
  ready?: boolean;
  onAnimationComplete?: () => void;
}

export function SplashScreen({ ready = false, onAnimationComplete }: SplashScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0B0F19] text-white"
      initial={{ opacity: 1 }}
      animate={{ opacity: ready ? 0 : 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={() => {
        if (ready) onAnimationComplete?.();
      }}
      style={{ pointerEvents: ready ? "none" : "auto" }}
    >
      <div className="starry-bg pointer-events-none absolute inset-0" />
      <div className="aurora-bg pointer-events-none absolute inset-0" />

      <div className="relative z-10 flex flex-col items-center gap-6 p-8">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-500/20 blur-xl" />
          <PolarisMascot mood="default" size={120} />
        </div>

        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Polaris 北极星</h1>
          <p className="mt-2 text-sm text-slate-400">正在为你点亮知识星河…</p>
        </div>

        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-slate-800">
          <div className="animate-shimmer-fast h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        </div>

        <span className="font-mono text-xs text-slate-600">v{APP_VERSION}</span>
      </div>
    </motion.div>
  );
}

export interface UseSplashScreenOptions {
  minDuration?: number;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSplashScreen({ minDuration = 1500 }: UseSplashScreenOptions = {}) {
  const [appReady, setAppReady] = useState(false);
  const [minDurationMet, setMinDurationMet] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinDurationMet(true), minDuration);
    return () => clearTimeout(timer);
  }, [minDuration]);

  const markReady = useCallback(() => setAppReady(true), []);
  const handleAnimationComplete = useCallback(() => setHidden(true), []);

  const ready = appReady && minDurationMet;

  const element = useMemo(() => {
    if (hidden) return null;
    return <SplashScreen ready={ready} onAnimationComplete={handleAnimationComplete} />;
  }, [hidden, ready, handleAnimationComplete]);

  return {
    SplashScreen: element,
    markReady,
    ready,
    hidden,
  };
}

export default SplashScreen;

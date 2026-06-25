"use client";

import { useEffect, useState } from "react";
import { HiOutlineBolt } from "react-icons/hi2";

interface XPToastProps {
  xp: number;
  onComplete?: () => void;
}

export default function XPToast({ xp, onComplete }: XPToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="animate-xpGain flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full shadow-xl shadow-amber-500/30 text-sm font-bold">
        <HiOutlineBolt className="w-4 h-4" />
        <span>+{xp} XP</span>
      </div>
    </div>
  );
}

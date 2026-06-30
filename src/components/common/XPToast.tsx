import { useEffect, useState } from "react";
import PolarisMascot from "@/components/common/PolarisMascot";

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
      <div className="animate-xpGain flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white pl-1 pr-4 py-1 rounded-full shadow-xl shadow-amber-500/30 text-sm font-bold">
        <PolarisMascot mood="cheering" size={28} animated={false} />
        <span>+{xp} XP</span>
      </div>
    </div>
  );
}

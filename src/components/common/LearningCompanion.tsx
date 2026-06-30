import { useEffect, useRef, useState, type JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSafeMotion } from "@/hooks/useSafeMotion";
import { cn } from "@/lib/utils";

/**
 * Task 13: LearningCompanion —— Polaris 小灵学习伙伴组件
 *
 * 形态随累计学习时长进化：蛋(0-10h) → 幼体(10-50h) → 成体(50-200h) → 觉醒(200h+)
 * 情绪由学习行为规则触发（非 AI 生成）：
 *   - recentAchievement → cheering
 *   - streak === 0       → worried
 *   - streak >= 3        → happy
 *   - 默认                → default
 *
 * 用法：
 *   <LearningCompanion totalStudyHours={12} streak={5} />
 *   <LearningCompanion totalStudyHours={0} streak={0} recentAchievement={false} />
 */

// ─────────────────────────────────────────────────────────────
//  类型与常量（Task 13.4 / 13.5）
// ─────────────────────────────────────────────────────────────

export type CompanionForm = "egg" | "juvenile" | "adult" | "awakened";
export type CompanionMood = "default" | "happy" | "worried" | "cheering";

export const FORM_NAMES: Record<CompanionForm, string> = {
  egg: "星蛋",
  juvenile: "星灵",
  adult: "星导",
  awakened: "星神",
};

export const FORM_MILESTONES: { hours: number; from: CompanionForm; to: CompanionForm }[] = [
  { hours: 10, from: "egg", to: "juvenile" },
  { hours: 50, from: "juvenile", to: "adult" },
  { hours: 200, from: "adult", to: "awakened" },
];

export function getCompanionForm(totalStudyHours: number): CompanionForm {
  if (totalStudyHours >= 200) return "awakened";
  if (totalStudyHours >= 50) return "adult";
  if (totalStudyHours >= 10) return "juvenile";
  return "egg";
}

export function getCompanionMood(streak: number, recentAchievement: boolean): CompanionMood {
  if (recentAchievement) return "cheering";
  if (streak === 0) return "worried";
  if (streak >= 3) return "happy";
  return "default";
}

/** 当前形态距下一里程碑的进度（0-100），已满级返回 100 */
export function getFormProgress(totalStudyHours: number): number {
  const form = getCompanionForm(totalStudyHours);
  if (form === "awakened") return 100;
  const next = FORM_MILESTONES.find((m) => m.from === form);
  if (!next) return 0;
  // 当前形态起点
  const startHours =
    form === "egg" ? 0 : FORM_MILESTONES.find((m) => m.to === form)?.hours ?? 0;
  const span = next.hours - startHours;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(100, ((totalStudyHours - startHours) / span) * 100));
}

// ─────────────────────────────────────────────────────────────
//  气泡文案（Task 13.8: 断签温暖不说教）
// ─────────────────────────────────────────────────────────────

export function getBubbleMessage(
  streak: number,
  recentAchievement: boolean | undefined,
  form: CompanionForm
): string {
  if (recentAchievement) return "恭喜你达成新成就！";
  if (streak === 0) return "好几天没见你了，还好吗？";
  if (streak >= 7) return `你已经坚持 ${streak} 天了，真棒！`;
  if (streak >= 3) return "今天也要一起加油呀！";
  // 默认：根据形态给出陪伴文案
  switch (form) {
    case "egg":
      return "我刚刚诞生，请多多关照～";
    case "juvenile":
      return "陪你学习，是我最开心的事。";
    case "adult":
      return "继续探索知识的星海吧。";
    case "awakened":
      return "星辰为你指引方向。";
  }
}

// ─────────────────────────────────────────────────────────────
//  SVG 表情元素（眼睛 + 嘴巴，4 种情绪）
// ─────────────────────────────────────────────────────────────

const EYES: Record<CompanionMood, JSX.Element> = {
  default: (
    <>
      <circle cx="40" cy="48" r="2.6" fill="#1e1b4b" />
      <circle cx="60" cy="48" r="2.6" fill="#1e1b4b" />
    </>
  ),
  happy: (
    <>
      <path d="M35 50 Q40 45, 45 50" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M55 50 Q60 45, 65 50" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  worried: (
    <>
      <circle cx="40" cy="50" r="2.2" fill="#1e1b4b" />
      <circle cx="60" cy="50" r="2.2" fill="#1e1b4b" />
      <path d="M33 44 L46 46" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M67 44 L54 46" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  cheering: (
    <>
      <path d="M35 45 L45 51 M45 45 L35 51" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" />
      <path d="M55 45 L65 51 M65 45 L55 51" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};

const MOUTH: Record<CompanionMood, JSX.Element> = {
  default: <path d="M44 60 Q50 64, 56 60" stroke="#1e1b4b" strokeWidth="2" fill="none" strokeLinecap="round" />,
  happy: <path d="M42 58 Q50 68, 58 58" stroke="#1e1b4b" strokeWidth="2" fill="#1e1b4b" strokeLinecap="round" />,
  worried: <circle cx="50" cy="62" r="2.5" fill="#1e1b4b" />,
  cheering: <ellipse cx="50" cy="62" rx="6" ry="5" fill="#1e1b4b" />,
};

// ─────────────────────────────────────────────────────────────
//  4 形态 SVG（Task 13.1）
// ─────────────────────────────────────────────────────────────

// egg（星蛋）：椭圆蛋形 + 星星纹理
function EggForm({ mood }: { mood: CompanionMood }) {
  return (
    <>
      <defs>
        <radialGradient id="companion-egg-grad" cx="38%" cy="32%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="55%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
      </defs>
      {/* 蛋体 */}
      <ellipse cx="50" cy="55" rx="30" ry="36" fill="url(#companion-egg-grad)" stroke="#92400e" strokeWidth="1.5" />
      {/* 星星纹理 */}
      <g fill="#fef3c7" opacity="0.85">
        <path d="M38 30 L39.5 34 L43.5 34.5 L40.5 37 L41.5 41 L38 38.5 L34.5 41 L35.5 37 L32.5 34.5 L36.5 34 Z" />
        <path d="M60 65 L60.8 67 L63 67.3 L61.4 68.7 L62 70.8 L60 69.5 L58 70.8 L58.6 68.7 L57 67.3 L59.2 67 Z" />
        <circle cx="63" cy="40" r="1.2" />
        <circle cx="36" cy="72" r="1" />
        <circle cx="55" cy="78" r="1.1" />
      </g>
      {/* 高光 */}
      <ellipse cx="40" cy="38" rx="6" ry="9" fill="#ffffff" opacity="0.35" />
      {EYES[mood]}
      {MOUTH[mood]}
    </>
  );
}

// juvenile（星灵）：小星星带小手脚
function JuvenileForm({ mood }: { mood: CompanionMood }) {
  return (
    <>
      <defs>
        <linearGradient id="companion-juv-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="60%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <radialGradient id="companion-juv-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="url(#companion-juv-glow)" />
      {/* 小手脚 */}
      <line x1="22" y1="55" x2="12" y2="62" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="78" y1="55" x2="88" y2="62" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="11" cy="63" r="3" fill="#fbbf24" />
      <circle cx="89" cy="63" r="3" fill="#fbbf24" />
      <line x1="40" y1="80" x2="38" y2="90" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="60" y1="80" x2="62" y2="90" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="37" cy="91" r="3" fill="#fbbf24" />
      <circle cx="63" cy="91" r="3" fill="#fbbf24" />
      {/* 小星星主体 */}
      <path
        d="M50 18 L58 40 L80 40 L62 53 L69 75 L50 62 L31 75 L38 53 L20 40 L42 40 Z"
        fill="url(#companion-juv-grad)"
        stroke="#f59e0b"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {EYES[mood]}
      {MOUTH[mood]}
    </>
  );
}

// adult（星导）：完整北极星 + 披风
function AdultForm({ mood }: { mood: CompanionMood }) {
  return (
    <>
      <defs>
        <linearGradient id="companion-adult-star" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="companion-adult-cape" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <radialGradient id="companion-adult-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill="url(#companion-adult-glow)" />
      {/* 披风 */}
      <path
        d="M18 58 Q50 82 82 58 L78 90 Q50 96 22 90 Z"
        fill="url(#companion-adult-cape)"
        stroke="#4c1d95"
        strokeWidth="1"
        opacity="0.92"
      />
      {/* 披风领扣 */}
      <circle cx="50" cy="60" r="2.5" fill="#fbbf24" stroke="#92400e" strokeWidth="0.5" />
      {/* 北极星主体 */}
      <path
        d="M50 14 L58 36 L84 36 L63 52 L71 78 L50 62 L29 78 L37 52 L16 36 L42 36 Z"
        fill="url(#companion-adult-star)"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {EYES[mood]}
      {MOUTH[mood]}
    </>
  );
}

// awakened（星神）：发光北极星 + 光环
function AwakenedForm({ mood }: { mood: CompanionMood }) {
  return (
    <>
      <defs>
        <linearGradient id="companion-awk-star" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id="companion-awk-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#fde68a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 外光晕 */}
      <circle cx="50" cy="50" r="48" fill="url(#companion-awk-glow)" />
      {/* 光环（双层椭圆） */}
      <ellipse
        cx="50"
        cy="50"
        rx="46"
        ry="13"
        fill="none"
        stroke="#fde68a"
        strokeWidth="2"
        opacity="0.75"
      />
      <ellipse
        cx="50"
        cy="50"
        rx="46"
        ry="13"
        fill="none"
        stroke="#ffffff"
        strokeWidth="0.8"
        opacity="0.6"
      />
      {/* 周围闪烁星点 */}
      <g fill="#ffffff" opacity="0.9">
        <path d="M12 30 L13 33 L16 33.5 L13.5 35.5 L14.3 38.5 L12 36.8 L9.7 38.5 L10.5 35.5 L8 33.5 L11 33 Z" />
        <path d="M88 70 L89 73 L92 73.5 L89.5 75.5 L90.3 78.5 L88 76.8 L85.7 78.5 L86.5 75.5 L84 73.5 L87 73 Z" />
        <circle cx="14" cy="60" r="1.4" />
        <circle cx="86" cy="40" r="1.4" />
      </g>
      {/* 北极星主体（更亮、更大） */}
      <path
        d="M50 10 L58 36 L86 36 L63 52 L72 80 L50 62 L28 80 L37 52 L14 36 L42 36 Z"
        fill="url(#companion-awk-star)"
        stroke="#fde68a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {EYES[mood]}
      {MOUTH[mood]}
    </>
  );
}

const FORM_COMPONENTS: Record<CompanionForm, (props: { mood: CompanionMood }) => JSX.Element> = {
  egg: EggForm,
  juvenile: JuvenileForm,
  adult: AdultForm,
  awakened: AwakenedForm,
};

// ─────────────────────────────────────────────────────────────
//  进化动画辅助：白光闪烁 + 粒子迸发（Task 13.6）
// ─────────────────────────────────────────────────────────────

function WhiteFlash() {
  return (
    <motion.div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(254,243,199,0.4) 40%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 20,
        borderRadius: "50%",
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 1.6] }}
      transition={{ duration: 0.9, times: [0, 0.35, 1], ease: "easeOut" }}
    />
  );
}

function EvolutionParticles() {
  const count = 10;
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const distance = 45 + (i % 3) * 8;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      delay: i * 0.03,
    };
  });
  return (
    <motion.div
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 15 }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.3, ease: "easeOut" }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {particles.map((p, i) => (
          <motion.circle
            key={i}
            cx={50}
            cy={50}
            r={2.2}
            fill={i % 2 === 0 ? "#fef3c7" : "#ffffff"}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
            transition={{ duration: 1, ease: "easeOut", delay: p.delay }}
          />
        ))}
      </svg>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
//  主组件
// ─────────────────────────────────────────────────────────────

export interface LearningCompanionProps {
  totalStudyHours: number;
  streak: number;
  recentAchievement?: boolean;
  size?: number;
  className?: string;
}

export default function LearningCompanion({
  totalStudyHours,
  streak,
  recentAchievement = false,
  size = 80,
  className,
}: LearningCompanionProps) {
  const form = getCompanionForm(totalStudyHours);
  const mood = getCompanionMood(streak, recentAchievement);
  const safeMotion = useSafeMotion();

  // 进化动画：检测形态跨越里程碑
  const prevFormRef = useRef<CompanionForm>(form);
  const [showFlash, setShowFlash] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (prevFormRef.current !== form) {
      // 形态变化：触发白光 + 粒子
      setShowFlash(true);
      setShowParticles(true);
      const t1 = window.setTimeout(() => setShowFlash(false), 900);
      const t2 = window.setTimeout(() => {
        setShowParticles(false);
        prevFormRef.current = form;
      }, 1400);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
  }, [form]);

  const FormSVG = FORM_COMPONENTS[form];

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Polaris 小灵 · ${FORM_NAMES[form]} · ${mood}`}
    >
      {/* 白光闪烁 */}
      <AnimatePresence>{showFlash && <WhiteFlash key="flash" />}</AnimatePresence>

      {/* 粒子迸发 */}
      <AnimatePresence>{showParticles && <EvolutionParticles key="particles" />}</AnimatePresence>

      {/* 形态 SVG（idle 呼吸 + 形态切换 scale/fade） */}
      <motion.div
        className="relative"
        style={{ width: size, height: size }}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <AnimatePresence mode="wait">
          <motion.svg
            key={form}
            viewBox="0 0 100 100"
            width={size}
            height={size}
            {...safeMotion({
              initial: { opacity: 0, scale: 0.5 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 1.4 },
              transition: { duration: 0.5, ease: "easeOut" },
            })}
          >
            <FormSVG mood={mood} />
          </motion.svg>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

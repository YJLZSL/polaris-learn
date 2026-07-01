import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Map as MapIcon, Bot, AlertTriangle, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

import { useUserStore } from "@/stores/useUserStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getKnowledgePoints,
  getUserMastery,
  type KnowledgePoint,
} from "@/lib/repositories/knowledge.repository";
import {
  getErrorNotes,
  type ErrorNote,
} from "@/lib/repositories/error-notes.repository";
import { useSafeMotion } from "@/hooks/useSafeMotion";
import { fadeUp } from "@/lib/motion";

/* ====== 设计常量 ====== */
const NODE_LIMIT = 80;
const NODE_RADIUS = 24;
const INDIGO = "#6366F1"; // 北极星靛蓝
const MUTED = "#94A3B8";
const LABEL_COLOR = "#F8FAFC";
const EDGE_COLOR = "rgba(148,163,184,0.45)";
const VIEW_W = 1000;
const VIEW_H = 720;

type NodeState = "mastered" | "learning" | "weak";

interface LayoutNode {
  id: string;
  label: string;
  fullTitle: string;
  x: number;
  y: number;
  mastery: number; // 0-1
  state: NodeState;
  isRoot: boolean;
  subject: string;
}

/* ====== 工具函数 ====== */
function truncate(text: string, max = 6): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function getState(mastery01: number): NodeState {
  if (mastery01 >= 0.8) return "mastered";
  if (mastery01 >= 0.3) return "learning";
  return "weak";
}

const STATE_LABEL: Record<NodeState, string> = {
  mastered: "已掌握",
  learning: "学习中",
  weak: "薄弱",
};

function nodeVisual(state: NodeState) {
  if (state === "mastered") {
    return { fill: INDIGO, stroke: INDIGO, fillOpacity: 1, dash: undefined };
  }
  if (state === "learning") {
    return { fill: "none", stroke: INDIGO, fillOpacity: 0, dash: undefined };
  }
  return { fill: INDIGO, stroke: MUTED, fillOpacity: 0.2, dash: "4 2" };
}

/* ====== 布局：学科根 → 知识点（2 层） ====== */
function buildLayout(
  points: KnowledgePoint[],
  masteryMap: Map<string, number>,
  activeSubject: string,
): { nodes: LayoutNode[]; edges: { from: string; to: string }[] } {
  const nodes: LayoutNode[] = [];
  const edges: { from: string; to: string }[] = [];

  const subjects =
    activeSubject === "全部学科"
      ? Array.from(new Set(points.map((p) => p.subject)))
      : [activeSubject];

  const rootCount = subjects.length;
  const rootRingR = rootCount > 1 ? Math.min(VIEW_W, VIEW_H) * 0.26 : 0;
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;

  subjects.forEach((subject, sIdx) => {
    const subjectPoints = points.filter((p) => p.subject === subject);
    if (subjectPoints.length === 0) return;

    const rootPoint = subjectPoints.find((p) => !p.parentId) ?? subjectPoints[0];
    const children = subjectPoints.filter((p) => p.id !== rootPoint.id);

    let rootX = cx;
    let rootY = cy;
    if (rootCount > 1) {
      const angle = (Math.PI * 2 * sIdx) / rootCount - Math.PI / 2;
      rootX = cx + Math.cos(angle) * rootRingR;
      rootY = cy + Math.sin(angle) * rootRingR;
    }

    const childMastery = children.map((c) => (masteryMap.get(c.id) ?? 0) / 100);
    const rootMastery01 =
      childMastery.length > 0
        ? childMastery.reduce((a, b) => a + b, 0) / childMastery.length
        : (masteryMap.get(rootPoint.id) ?? 0) / 100;

    nodes.push({
      id: rootPoint.id,
      label: truncate(subject, 6),
      fullTitle: subject,
      x: rootX,
      y: rootY,
      mastery: rootMastery01,
      state: getState(rootMastery01),
      isRoot: true,
      subject,
    });

    const childRingR = rootCount > 1 ? 105 : 230;
    children.forEach((child, idx) => {
      const angle =
        children.length === 1 ? -Math.PI / 2 : (Math.PI * 2 * idx) / children.length - Math.PI / 2;
      const m01 = (masteryMap.get(child.id) ?? 0) / 100;
      nodes.push({
        id: child.id,
        label: truncate(child.title, 6),
        fullTitle: child.title,
        x: rootX + Math.cos(angle) * childRingR,
        y: rootY + Math.sin(angle) * childRingR,
        mastery: m01,
        state: getState(m01),
        isRoot: false,
        subject,
      });
      edges.push({ from: rootPoint.id, to: child.id });
    });
  });

  return { nodes, edges };
}

/* ====== 页面 ====== */
export default function KnowledgeGraphPage() {
  const navigate = useNavigate();
  const userId = useUserStore((s) => s.id);
  const safeMotion = useSafeMotion();

  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<KnowledgePoint[]>([]);
  const [masteryMap, setMasteryMap] = useState<Map<string, number>>(new Map());
  const [errorNotes, setErrorNotes] = useState<ErrorNote[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>("全部学科");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const [pts, masteries, notes] = await Promise.all([
          getKnowledgePoints(),
          getUserMastery(userId),
          getErrorNotes(userId),
        ]);
        if (cancelled) return;
        setPoints(pts);
        const map = new Map<string, number>();
        masteries.forEach((m) => map.set(m.knowledgePointId, m.mastery));
        setMasteryMap(map);
        setErrorNotes(notes);
      } catch {
        /* 静默失败 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const subjectOptions = useMemo(
    () => ["全部学科", ...Array.from(new Set(points.map((p) => p.subject)))],
    [points],
  );

  const layout = useMemo(
    () => buildLayout(points, masteryMap, activeSubject),
    [points, masteryMap, activeSubject],
  );

  const overLimit = layout.nodes.length > NODE_LIMIT;

  const activeNode = useMemo(
    () => layout.nodes.find((n) => n.id === activeNodeId) ?? null,
    [layout.nodes, activeNodeId],
  );

  const activeNodeNotes = useMemo(() => {
    if (!activeNode) return [];
    return errorNotes.filter((n) => n.subject === activeNode.subject).slice(0, 5);
  }, [errorNotes, activeNode]);

  function handleAskAi(topic: string) {
    navigate(`/ai-teacher?topic=${encodeURIComponent(topic)}`);
  }

  return (
    <motion.div
      {...safeMotion({ initial: "hidden", animate: "show", variants: fadeUp })}
      className="mx-auto w-full max-w-6xl px-4 py-6"
    >
      {/* 标题 + 学科选择 */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-indigo-400" />
          <h1 className="text-xl font-semibold text-slate-100">知识地图</h1>
        </div>
        <Select value={activeSubject} onValueChange={setActiveSubject}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="选择学科" />
          </SelectTrigger>
          <SelectContent>
            {subjectOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 图例 */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <LegendDot state="mastered" />
        <LegendDot state="learning" />
        <LegendDot state="weak" />
      </div>

      {loading ? (
        <Skeleton className="h-[480px] w-full rounded-xl" />
      ) : layout.nodes.length === 0 ? (
        <div className="flex h-[480px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-slate-400">
          <BookOpen className="h-8 w-8" />
          <p>暂无知识点数据</p>
        </div>
      ) : overLimit ? (
        <div className="flex h-[480px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 text-center text-slate-400">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
          <p>知识点过多（{layout.nodes.length} 个），请选择具体学科查看</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="h-[480px] w-full"
            role="img"
            aria-label="知识点结构图"
          >
            {/* 连线 */}
            <g stroke={EDGE_COLOR} strokeWidth={1.2}>
              {layout.edges.map((e, i) => {
                const from = layout.nodes.find((n) => n.id === e.from);
                const to = layout.nodes.find((n) => n.id === e.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                  />
                );
              })}
            </g>

            {/* 节点 */}
            {layout.nodes.map((n) => {
              const vis = nodeVisual(n.state);
              return (
                <Popover
                  key={n.id}
                  open={activeNodeId === n.id}
                  onOpenChange={(o) => setActiveNodeId(o ? n.id : null)}
                >
                  <PopoverTrigger asChild>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={NODE_RADIUS + 8}
                      fill="transparent"
                      className="cursor-pointer"
                    />
                  </PopoverTrigger>
                  {/* 可见节点 */}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={NODE_RADIUS}
                    fill={vis.fill}
                    fillOpacity={vis.fillOpacity}
                    stroke={vis.stroke}
                    strokeWidth={n.isRoot ? 3 : 2}
                    strokeDasharray={vis.dash}
                    pointerEvents="none"
                  />
                  <text
                    x={n.x}
                    y={n.y + NODE_RADIUS + 16}
                    textAnchor="middle"
                    fontSize={n.isRoot ? 14 : 12}
                    fontWeight={n.isRoot ? 700 : 500}
                    fill={LABEL_COLOR}
                    pointerEvents="none"
                  >
                    {n.label}
                  </text>
                  <PopoverContent className="w-72">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-100">
                          {n.fullTitle}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px]",
                            n.state === "mastered" && "bg-indigo-500/20 text-indigo-300",
                            n.state === "learning" && "bg-indigo-500/10 text-indigo-200",
                            n.state === "weak" && "bg-slate-500/20 text-slate-300",
                          )}
                        >
                          {STATE_LABEL[n.state]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        掌握度：{Math.round(n.mastery * 100)}%
                      </p>

                      <div>
                        <p className="mb-1 text-xs font-medium text-slate-300">
                          最近错题
                        </p>
                        {activeNodeNotes.length === 0 ? (
                          <p className="text-xs text-slate-500">暂无错题记录</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {activeNodeNotes.map((note) => (
                              <li
                                key={note.id}
                                className="rounded-md border border-white/5 bg-white/5 px-2 py-1.5 text-xs text-slate-300"
                              >
                                <div className="flex items-center justify-between">
                                  <span>{note.subject}</span>
                                  <span className="text-[10px] text-slate-500">
                                    {note.status}
                                  </span>
                                </div>
                                <p className="mt-0.5 truncate text-slate-400">
                                  答：{note.userAnswer || "—"}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleAskAi(n.fullTitle)}
                      >
                        <Bot className="mr-1 h-4 w-4" />
                        问 AI 老师
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </svg>
        </div>
      )}
    </motion.div>
  );
}

/* ====== 图例 ====== */
function LegendDot({ state }: { state: NodeState }) {
  const vis = nodeVisual(state);
  return (
    <span className="flex items-center gap-1.5">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle
          cx="9"
          cy="9"
          r="7"
          fill={vis.fill}
          fillOpacity={vis.fillOpacity}
          stroke={vis.stroke}
          strokeWidth="2"
          strokeDasharray={vis.dash}
        />
      </svg>
      {STATE_LABEL[state]}
    </span>
  );
}

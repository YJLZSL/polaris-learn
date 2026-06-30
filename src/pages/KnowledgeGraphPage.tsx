import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Map as MapIcon,
  Lightbulb,
  Play,
  ChevronRight,
  X,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCw,
  Network,
  Swords,
  Sparkles,
} from "lucide-react";
import { useUserStore } from "@/stores/useUserStore";

import { cn } from "@/lib/utils";
import { SUBJECT_MAP } from "@/lib/constants";
import { getSubjectsForMode, getLearningModeConfig } from "@/lib/learning-modes";
import { getCurrentUser } from "@/lib/services/auth-service";
import {
  getKnowledgePoints,
  getUserMastery,
  getDecayedNodes,
  applyMasteryDecay,
  DECAY_CONFIG,
} from "@/lib/repositories/knowledge.repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorEliminationBattle } from "@/components/common/ErrorEliminationBattle";

/* ====== Types ====== */
interface KnowledgeNode {
  id: string;
  name: string;
  masteryLevel: number; // 0-100
  parentId: string | null;
  subject: string;
  description: string | null;
  gradeLevel: string | null;
  orderIndex: number;
  timesCorrect: number;
  timesWrong: number;
}

interface KnowledgeEdge {
  from: string;
  to: string;
  relation: string;
}

/** 力导向图模拟节点 */
interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed: boolean;
}

/* ====== Force graph constants ====== */
const GRAPH_WIDTH = 800;
const GRAPH_HEIGHT = 500;
const NODE_RADIUS = 22;
const REPULSION_STRENGTH = 1200;
const SPRING_LENGTH = 110;
const SPRING_K = 0.04;
const CENTERING_K = 0.01;
const DAMPING = 0.82;
const ALPHA_DECAY = 0.985;
const MIN_ALPHA = 0.02;

/* ====== Subject configs ====== */
const SUBJECT_DOT_COLOR: Record<string, string> = {
  数学: "bg-blue-500",
  语文: "bg-orange-500",
  英语: "bg-green-500",
  物理: "bg-purple-500",
  化学: "bg-teal-500",
  生物: "bg-pink-500",
};

type MasteryFilter = "全部" | "已掌握" | "学习中" | "未学习";

const masteryFilters: { key: MasteryFilter; label: string }[] = [
  { key: "全部", label: "全部" },
  { key: "已掌握", label: "已掌握" },
  { key: "学习中", label: "学习中" },
  { key: "未学习", label: "未学习" },
];

/* ====== Helpers ====== */
function getMasteryColor(mastery: number): {
  fill: string;
  stroke: string;
  label: string;
} {
  if (mastery >= 70) return { fill: "#22c55e", stroke: "#16a34a", label: "已掌握" };
  if (mastery >= 40) return { fill: "#eab308", stroke: "#ca8a04", label: "学习中" };
  if (mastery > 0) return { fill: "#ef4444", stroke: "#dc2626", label: "薄弱" };
  return { fill: "#9ca3af", stroke: "#6b7280", label: "未探索" };
}

function getMasteryFilterKey(mastery: number): MasteryFilter {
  if (mastery >= 70) return "已掌握";
  if (mastery > 0) return "学习中";
  return "未学习";
}

/**
 * Task 10.3: 节点状态分类
 * - mastered: 已掌握（亮星）—— 白色填充 + 光晕
 * - learning: 学习中 —— 琥珀色
 * - weak: 薄弱 —— 红色 + 脉冲
 * - locked: 未解锁 —— 半透明灰（星云遮蔽）
 */
function getNodeStatus(mastery: number): "mastered" | "learning" | "weak" | "locked" {
  if (mastery >= DECAY_CONFIG.masteryThreshold) return "mastered";
  if (mastery >= 40) return "learning";
  if (mastery > 0) return "weak";
  return "locked";
}

/* ====== Force-directed simulation ====== */
/**
 * Task 10.2: 轻量力导向图模拟（自实现，不引入新依赖）
 *
 * 每帧施加三种力：
 * 1. 节点间排斥力（Coulomb 模型，O(n²)，n<100 可接受）
 * 2. 边吸引力（弹簧模型，目标长度 SPRING_LENGTH）
 * 3. 向心力（拉向画布中心，防止节点飞出）
 *
 * 速度更新后乘以 DAMPING 阻尼，alpha 衰减控制模拟冷却。
 */
function simulate(
  simNodes: SimNode[],
  edges: { source: string; target: string }[],
  alpha: number,
): void {
  const cx = GRAPH_WIDTH / 2;
  const cy = GRAPH_HEIGHT / 2;

  // 1. 排斥力
  for (let i = 0; i < simNodes.length; i++) {
    for (let j = i + 1; j < simNodes.length; j++) {
      const a = simNodes[i];
      const b = simNodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) dist = 1;
      const force = -REPULSION_STRENGTH / (dist * dist);
      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;
      if (!a.fixed) {
        a.vx += fx;
        a.vy += fy;
      }
      if (!b.fixed) {
        b.vx -= fx;
        b.vy -= fy;
      }
    }
  }

  // 2. 边吸引力（弹簧）
  const nodeIndex = new Map<string, SimNode>();
  for (const n of simNodes) nodeIndex.set(n.id, n);
  for (const edge of edges) {
    const a = nodeIndex.get(edge.source);
    const b = nodeIndex.get(edge.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) dist = 1;
    const force = (dist - SPRING_LENGTH) * SPRING_K;
    const fx = (force * dx) / dist;
    const fy = (force * dy) / dist;
    if (!a.fixed) {
      a.vx += fx;
      a.vy += fy;
    }
    if (!b.fixed) {
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  // 3. 向心力 + 应用速度
  for (const n of simNodes) {
    if (n.fixed) continue;
    n.vx += (cx - n.x) * CENTERING_K;
    n.vy += (cy - n.y) * CENTERING_K;
    n.x += n.vx * alpha;
    n.y += n.vy * alpha;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    // 边界约束
    n.x = Math.max(NODE_RADIUS, Math.min(GRAPH_WIDTH - NODE_RADIUS, n.x));
    n.y = Math.max(NODE_RADIUS, Math.min(GRAPH_HEIGHT - NODE_RADIUS, n.y));
  }
}

/* ====== Component ====== */
export default function KnowledgeGraphPage() {
  const navigate = useNavigate();
  const {
    weakPoints: _weakPoints,
    addXP,
    learningMode,
    setUser,
    id: userId,
    initFromAuth,
  } = useUserStore();

  const effectiveMode = learningMode || "ELEMENTARY";

  const subjects = useMemo(() => {
    const ids = getSubjectsForMode(effectiveMode);
    return ids
      .map((id) => SUBJECT_MAP[id])
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [effectiveMode]);

  const gradeLevel = useMemo(
    () => getLearningModeConfig(effectiveMode).defaultGrade,
    [effectiveMode],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initFromAuth();
        const user = await getCurrentUser();
        if (!cancelled && user?.learningMode) {
          setUser({ learningMode: user.learningMode });
        }
      } catch {
        /* 静默失败 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, initFromAuth]);

  const [activeSubject, setActiveSubject] = useState("数学");
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>("全部");
  const [hoveredNode, setHoveredNode] = useState<KnowledgeNode | null>(null);

  // Data fetching
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decayedNodeIds, setDecayedNodeIds] = useState<Set<string>>(new Set());

  // Task 11: 消灭战弹窗
  const [battleOpen, setBattleOpen] = useState(false);
  const [battleSubject, setBattleSubject] = useState<string | undefined>(undefined);

  // 当学习模式变化导致当前 activeSubject 不再可选时，回退到首个合法学科
  useEffect(() => {
    if (subjects.length === 0) return;
    const labels = subjects.map((s) => s.label);
    if (!labels.includes(activeSubject)) {
      setActiveSubject(subjects[0].label);
    }
  }, [subjects, activeSubject]);

  const fetchGraphData = useCallback(
    async (subject: string, grade?: string) => {
      setLoading(true);
      setError(null);
      setSelectedNode(null);
      try {
        // Task 10.6: 先应用衰减（回退超期已掌握节点到 80%）
        if (userId) {
          try {
            await applyMasteryDecay(userId);
          } catch {
            /* 衰减失败不阻塞主流程 */
          }
        }

        const [points, masteryList, decayed] = await Promise.all([
          getKnowledgePoints({ subject, gradeLevel: grade }),
          userId ? getUserMastery(userId) : Promise.resolve([]),
          userId ? getDecayedNodes(userId) : Promise.resolve([]),
        ]);

        const masteryMap: Record<string, number> = {};
        for (const m of masteryList) {
          masteryMap[m.knowledgePointId] = m.mastery;
        }
        const mappedNodes: KnowledgeNode[] = points.map((p) => ({
          id: p.id,
          name: p.title,
          masteryLevel: masteryMap[p.id] ?? 0,
          parentId: p.parentId ?? null,
          subject: p.subject,
          description: p.description ?? null,
          gradeLevel: p.gradeLevel ?? null,
          orderIndex: p.order,
          timesCorrect: 0,
          timesWrong: 0,
        }));
        const mappedEdges: KnowledgeEdge[] = mappedNodes
          .filter((n) => n.parentId)
          .map((n) => ({
            from: n.parentId as string,
            to: n.id,
            relation: "前置",
          }));
        setNodes(mappedNodes);
        setEdges(mappedEdges);
        setDecayedNodeIds(new Set(decayed.map((d) => d.knowledgePointId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载知识图谱数据失败");
        setNodes([]);
        setEdges([]);
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchGraphData(activeSubject, gradeLevel);
  }, [activeSubject, fetchGraphData, gradeLevel]);

  /* ====== Force-directed simulation ====== */
  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const alphaRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const draggingNodeRef = useRef<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [, setTick] = useState(0);

  // 初始化 / 重置节点位置
  useEffect(() => {
    if (nodes.length === 0) {
      simNodesRef.current.clear();
      return;
    }
    const map = new Map<string, SimNode>();
    const cx = GRAPH_WIDTH / 2;
    const cy = GRAPH_HEIGHT / 2;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const angle = (i / nodes.length) * Math.PI * 2;
      const radius = 120 + Math.random() * 60;
      map.set(node.id, {
        id: node.id,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fixed: false,
      });
    }
    simNodesRef.current = map;
    alphaRef.current = 1;
  }, [nodes]);

  // 模拟循环
  useEffect(() => {
    if (nodes.length === 0) return;
    let mounted = true;

    const loop = () => {
      if (!mounted) return;
      const simNodes = Array.from(simNodesRef.current.values());
      const edgePairs = edges.map((e) => ({ source: e.from, target: e.to }));
      simulate(simNodes, edgePairs, alphaRef.current);
      alphaRef.current = Math.max(MIN_ALPHA, alphaRef.current * ALPHA_DECAY);
      setTick((t) => (t + 1) % 1_000_000);
      if (alphaRef.current > MIN_ALPHA || draggingNodeRef.current) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [nodes, edges]);

  // 坐标转换：屏幕坐标 → SVG 用户坐标（考虑缩放/平移）
  const toSvgCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const svgP = pt.matrixTransform(ctm.inverse());
      return { x: svgP.x, y: svgP.y };
    },
    [],
  );

  // Task 10.4: 节点拖拽
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      draggingNodeRef.current = nodeId;
      const simNode = simNodesRef.current.get(nodeId);
      if (simNode) {
        simNode.fixed = true;
        simNode.vx = 0;
        simNode.vy = 0;
      }
      alphaRef.current = Math.max(alphaRef.current, 0.5);
      // 若循环已停止，重启
      if (!rafRef.current) {
        const loop = () => {
          const simNodes = Array.from(simNodesRef.current.values());
          const edgePairs = edges.map((ed) => ({ source: ed.from, target: ed.to }));
          simulate(simNodes, edgePairs, alphaRef.current);
          alphaRef.current = Math.max(MIN_ALPHA, alphaRef.current * ALPHA_DECAY);
          setTick((t) => (t + 1) % 1_000_000);
          if (alphaRef.current > MIN_ALPHA || draggingNodeRef.current) {
            rafRef.current = requestAnimationFrame(loop);
          } else {
            rafRef.current = null;
          }
        };
        rafRef.current = requestAnimationFrame(loop);
      }
    },
    [edges],
  );

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingNodeRef.current) return;
      const coords = toSvgCoords(e.clientX, e.clientY);
      if (!coords) return;
      const simNode = simNodesRef.current.get(draggingNodeRef.current);
      if (simNode) {
        simNode.x = coords.x;
        simNode.y = coords.y;
      }
    },
    [toSvgCoords],
  );

  const handleSvgMouseUp = useCallback(() => {
    if (draggingNodeRef.current) {
      const simNode = simNodesRef.current.get(draggingNodeRef.current);
      if (simNode) simNode.fixed = false;
      draggingNodeRef.current = null;
      alphaRef.current = Math.max(alphaRef.current, 0.3);
    }
  }, []);

  // 背景拖拽（平移）
  const panningRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const handleBackgroundMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // 仅在点击背景（非节点）时启动平移
      if (e.target === e.currentTarget || (e.target as Element).tagName === "rect") {
        panningRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          origX: panOffset.x,
          origY: panOffset.y,
        };
      }
    },
    [panOffset],
  );

  const handleBackgroundMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!panningRef.current) return;
      const dx = e.clientX - panningRef.current.startX;
      const dy = e.clientY - panningRef.current.startY;
      setPanOffset({
        x: panningRef.current.origX + dx / zoomLevel,
        y: panningRef.current.origY + dy / zoomLevel,
      });
    },
    [zoomLevel],
  );

  const handleBackgroundMouseUp = useCallback(() => {
    panningRef.current = null;
  }, []);

  // Task 10.4: 滚轮缩放（非被动监听以支持 preventDefault）
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setZoomLevel((z) => Math.max(0.4, Math.min(2.5, z + delta)));
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [nodes.length]);

  /* ====== Derived state ====== */
  const subjectColor = useMemo(() => {
    const map: Record<string, string> = {
      数学: "from-blue-500 to-blue-700",
      语文: "from-orange-500 to-orange-700",
      英语: "from-green-500 to-green-700",
      物理: "from-purple-500 to-purple-700",
      化学: "from-teal-500 to-teal-700",
    };
    return map[activeSubject] || "from-indigo-500 to-purple-600";
  }, [activeSubject]);

  const overallMastery = useMemo(() => {
    if (nodes.length === 0) return 0;
    const total = nodes.reduce((a, n) => a + n.masteryLevel, 0);
    return Math.round(total / nodes.length);
  }, [nodes]);

  const weakCount = useMemo(
    () => nodes.filter((n) => n.masteryLevel > 0 && n.masteryLevel < 40).length,
    [nodes],
  );
  const masteredCount = useMemo(
    () => nodes.filter((n) => n.masteryLevel >= 70).length,
    [nodes],
  );
  const decayedCount = useMemo(
    () => nodes.filter((n) => decayedNodeIds.has(n.id)).length,
    [nodes, decayedNodeIds],
  );

  const filteredNodes = useMemo(() => {
    if (masteryFilter === "全部") return nodes;
    return nodes.filter((n) => getMasteryFilterKey(n.masteryLevel) === masteryFilter);
  }, [nodes, masteryFilter]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes],
  );

  // Task 10.5: 节点点击行为
  // - 亮星（已掌握）→ 跳转 PracticePage
  // - 红星（薄弱）→ 打开消灭战
  // - 其他 → 显示详情面板
  const handleNodeClick = useCallback(
    (node: KnowledgeNode) => {
      const status = getNodeStatus(node.masteryLevel);
      if (status === "mastered") {
        // 亮星：进入复习
        navigate("/practice");
        addXP(1);
      } else if (status === "weak") {
        // 红星：进入消灭战
        setBattleSubject(node.subject);
        setBattleOpen(true);
        addXP(1);
      } else {
        // 其他：显示详情
        setSelectedNode(node);
        addXP(1);
      }
    },
    [navigate, addXP],
  );

  // 查找前置知识点
  const prerequisiteNodes = useMemo(() => {
    if (!selectedNode) return [];
    const parentIds = edges
      .filter((e) => e.to === selectedNode.id)
      .map((e) => e.from);
    return nodes.filter((n) => parentIds.includes(n.id));
  }, [selectedNode, edges, nodes]);

  /* ====== Loading State ====== */
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <MapIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">知识星图</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              正在加载知识点数据...
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-[140px]" />
              <Skeleton className="h-9 w-[160px]" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Skeleton className="lg:col-span-2 h-[400px] rounded-lg" />
              <Skeleton className="h-[300px] rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ====== Error State ====== */
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <MapIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">知识星图</h1>
            <p className="text-xs text-muted-foreground mt-0.5">数据加载失败</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchGraphData(activeSubject, gradeLevel)}
            className="mt-2 gap-1"
          >
            <RotateCw className="h-4 w-4" />
            重新加载
          </Button>
        </Alert>
      </div>
    );
  }

  /* ====== Empty State ====== */
  if (nodes.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subjectColor} flex items-center justify-center shadow-sm`}
          >
            <MapIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">知识星图</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              可视化查看你的知识点掌握情况
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            <Select value={activeSubject} onValueChange={setActiveSubject}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="选择学科" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((sub) => (
                  <SelectItem key={sub.id} value={sub.label}>
                    {sub.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <EmptyState
          icon={Network}
          title="该学科暂无知识点数据"
          description="系统管理员正在建设中，敬请期待"
          actionLabel="重新加载"
          onAction={() => fetchGraphData(activeSubject, gradeLevel)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* ====== Header ====== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subjectColor} flex items-center justify-center shadow-sm`}
          >
            <MapIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">知识星图</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              可视化查看你的知识点掌握情况
            </p>
          </div>
        </div>
        {/* Stats pills */}
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="secondary" className="gap-1">
            已掌握 {masteredCount}/{nodes.length}
          </Badge>
          <Badge variant="destructive" className="gap-1">
            薄弱 {weakCount}个
          </Badge>
          {decayedCount > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-400 text-amber-600 dark:text-amber-400"
            >
              <Sparkles className="w-3 h-3" />
              衰退 {decayedCount}个
            </Badge>
          )}
        </div>
      </div>

      {/* ====== Top Filter Bar ====== */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Select
              value={activeSubject}
              onValueChange={(val) => {
                setActiveSubject(val);
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="选择学科" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((sub) => (
                  <SelectItem key={sub.id} value={sub.label}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${SUBJECT_DOT_COLOR[sub.label] || "bg-gray-400"}`}
                      />
                      {sub.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="hidden sm:block h-6" />

            <div className="flex flex-wrap gap-2">
              {masteryFilters.map((f) => (
                <Badge
                  key={f.key}
                  variant={masteryFilter === f.key ? "default" : "outline"}
                  className="cursor-pointer select-none transition-colors"
                  onClick={() => setMasteryFilter(f.key)}
                >
                  {f.label}
                </Badge>
              ))}
            </div>

            {/* Task 11: 消灭战入口 */}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              onClick={() => {
                setBattleSubject(activeSubject);
                setBattleOpen(true);
              }}
            >
              <Swords className="w-3.5 h-3.5" />
              错题消灭战
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ====== Overall Mastery Bar ====== */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{activeSubject}掌握度</span>
            <span className="text-sm font-bold text-primary">{overallMastery}%</span>
          </div>
          <Progress value={overallMastery} className="h-2.5" />
        </CardContent>
      </Card>

      {/* ====== Main Graph Area ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left: Force-directed Graph */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-xs text-muted-foreground">
              点击亮星复习 | 红星消灭战 | 拖拽节点 | 滚轮缩放
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.2))}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 ml-1"
                onClick={() => {
                  setZoomLevel(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
              >
                <Maximize className="h-3 w-3" />
                重置
              </Button>
            </div>
          </div>

          <div
            className="relative overflow-hidden bg-gradient-to-br from-slate-900/40 via-indigo-950/30 to-slate-900/40 dark:from-slate-950 dark:via-indigo-950/50 dark:to-slate-950"
            style={{ height: "min(520px, 65vh)" }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
              className="w-full h-full select-none"
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: "center center",
                cursor: draggingNodeRef.current ? "grabbing" : "grab",
              }}
              onMouseDown={handleBackgroundMouseDown}
              onMouseMove={(e) => {
                handleSvgMouseMove(e);
                handleBackgroundMouseMove(e);
              }}
              onMouseUp={() => {
                handleSvgMouseUp();
                handleBackgroundMouseUp();
              }}
              onMouseLeave={() => {
                handleSvgMouseUp();
                handleBackgroundMouseUp();
              }}
            >
              <defs>
                {/* Task 10.8: 裂纹 SVG filter */}
                <filter
                  id="crack-filter"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.04"
                    numOctaves="2"
                    seed="7"
                    result="noise"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale="5"
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
                {/* 已掌握节点光晕 */}
                <filter
                  id="glow-filter"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* 星云背景渐变（未解锁遮蔽效果） */}
                <radialGradient id="nebula-gradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(148, 163, 184, 0.25)" />
                  <stop offset="100%" stopColor="rgba(148, 163, 184, 0.05)" />
                </radialGradient>
                {/* 背景星点纹理 */}
                <pattern
                  id="star-pattern"
                  x="0"
                  y="0"
                  width="80"
                  height="80"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="10" cy="15" r="0.8" fill="rgba(255,255,255,0.4)" />
                  <circle cx="45" cy="30" r="0.5" fill="rgba(255,255,255,0.3)" />
                  <circle cx="65" cy="55" r="0.6" fill="rgba(255,255,255,0.35)" />
                  <circle cx="25" cy="65" r="0.4" fill="rgba(255,255,255,0.25)" />
                </pattern>
              </defs>

              {/* 背景星点 */}
              <rect
                x="0"
                y="0"
                width={GRAPH_WIDTH}
                height={GRAPH_HEIGHT}
                fill="url(#star-pattern)"
                onMouseDown={handleBackgroundMouseDown}
              />

              {/* 连接线 */}
              {edges.map((edge) => {
                const fromPos = simNodesRef.current.get(edge.from);
                const toPos = simNodesRef.current.get(edge.to);
                if (!fromPos || !toPos) return null;
                const isFiltered =
                  !filteredNodeIds.has(edge.from) || !filteredNodeIds.has(edge.to);
                return (
                  <line
                    key={`${edge.from}-${edge.to}`}
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke="rgba(148, 163, 184, 0.4)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={isFiltered ? 0.15 : 0.55}
                  />
                );
              })}

              {/* 节点 */}
              {nodes.map((node) => {
                const pos = simNodesRef.current.get(node.id);
                if (!pos) return null;
                const status = getNodeStatus(node.masteryLevel);
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNode?.id === node.id;
                const isFiltered = !filteredNodeIds.has(node.id);
                const isDecayed = decayedNodeIds.has(node.id);

                // 节点视觉配置
                const visuals = (() => {
                  switch (status) {
                    case "mastered":
                      return {
                        fill: "#ffffff",
                        stroke: "#a5f3fc",
                        opacity: 1,
                        glow: true,
                      };
                    case "learning":
                      return {
                        fill: "#eab308",
                        stroke: "#ca8a04",
                        opacity: 0.85,
                        glow: false,
                      };
                    case "weak":
                      return {
                        fill: "#ef4444",
                        stroke: "#dc2626",
                        opacity: 0.9,
                        glow: false,
                      };
                    case "locked":
                    default:
                      return {
                        fill: "#6b7280",
                        stroke: "#4b5563",
                        opacity: 0.35,
                        glow: false,
                      };
                  }
                })();

                // 卡片样式 tooltip 定位
                const tooltipWidth = 148;
                const tooltipHeight = 64;
                let tooltipX = pos.x + NODE_RADIUS + 10;
                let tooltipY = pos.y - tooltipHeight / 2;
                if (tooltipX + tooltipWidth > GRAPH_WIDTH - 10) {
                  tooltipX = pos.x - NODE_RADIUS - tooltipWidth - 10;
                }
                if (tooltipY < 10) tooltipY = 10;
                if (tooltipY + tooltipHeight > GRAPH_HEIGHT - 10) {
                  tooltipY = GRAPH_HEIGHT - tooltipHeight - 10;
                }

                return (
                  <g
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer"
                  >
                    {/* 未解锁节点的星云遮蔽 */}
                    {status === "locked" && !isFiltered && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={NODE_RADIUS + 12}
                        fill="url(#nebula-gradient)"
                      />
                    )}

                    {/* 选中态光环 */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={NODE_RADIUS + 8}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth={3}
                        opacity={0.5}
                        style={{ filter: "drop-shadow(0 0 6px #6366f1)" }}
                      />
                    )}

                    {/* 薄弱节点脉冲动画（scale 1.0 → 1.1 循环） */}
                    {status === "weak" && !isFiltered && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={NODE_RADIUS + 6}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={2}
                        opacity={0.4}
                      >
                        <animate
                          attributeName="r"
                          values={`${NODE_RADIUS + 6};${NODE_RADIUS + 12};${NODE_RADIUS + 6}`}
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.4;0.1;0.4"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {/* 已掌握节点光晕（boxShadow 等效 SVG filter） */}
                    {status === "mastered" && !isFiltered && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={NODE_RADIUS + 4}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        opacity={0.6}
                        filter="url(#glow-filter)"
                      >
                        <animate
                          attributeName="opacity"
                          values="0.4;0.8;0.4"
                          dur="3s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {/* 节点本体 —— 裂纹节点应用 SVG filter */}
                    <g
                      filter={isDecayed && status === "mastered" ? "url(#crack-filter)" : undefined}
                      style={{
                        transformOrigin: `${pos.x}px ${pos.y}px`,
                        transform: isHovered && !isFiltered ? "scale(1.1)" : "scale(1)",
                        transition: "transform 0.2s ease-out",
                      }}
                    >
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={NODE_RADIUS}
                        fill={visuals.fill}
                        stroke={visuals.stroke}
                        strokeWidth={2}
                        opacity={isFiltered ? 0.2 : visuals.opacity}
                      />
                      <text
                        x={pos.x}
                        y={pos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[10px] font-semibold"
                        fill={status === "mastered" ? "#1e293b" : "#ffffff"}
                        style={{
                          pointerEvents: "none",
                          textShadow:
                            status === "mastered"
                              ? "0 1px 2px rgba(255,255,255,0.5)"
                              : "0 1px 2px rgba(0,0,0,0.55)",
                        }}
                      >
                        {node.name.length > 5 ? node.name.slice(0, 5) + "..." : node.name}
                      </text>
                    </g>

                    {/* 衰退标记小图标 */}
                    {isDecayed && status === "mastered" && !isFiltered && (
                      <text
                        x={pos.x + NODE_RADIUS - 4}
                        y={pos.y - NODE_RADIUS + 6}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="10"
                        fill="#fbbf24"
                        style={{ pointerEvents: "none" }}
                      >
                        ⚠
                      </text>
                    )}

                    {/* Hover tooltip */}
                    {isHovered && !isFiltered && (
                      <foreignObject
                        x={tooltipX}
                        y={tooltipY}
                        width={tooltipWidth}
                        height={tooltipHeight}
                      >
                        <div className="flex flex-col justify-center h-full rounded-xl border border-border bg-popover/95 backdrop-blur-sm p-3 shadow-lg text-popover-foreground">
                          <p className="text-sm font-semibold leading-tight truncate">
                            {node.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            掌握度 {node.masteryLevel}%
                            {isDecayed && (
                              <span className="text-amber-500 ml-1">· 需复习</span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {status === "mastered"
                              ? "点击进入复习"
                              : status === "weak"
                                ? "点击进入消灭战"
                                : "点击查看详情"}
                          </p>
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-t">
            <span className="text-[10px] text-muted-foreground mr-1">图例：</span>
            {[
              { color: "#ffffff", label: "亮星·已掌握", ring: true },
              { color: "#eab308", label: "学习中" },
              { color: "#ef4444", label: "薄弱·消灭战", pulse: true },
              { color: "#6b7280", label: "未解锁", dim: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: item.color,
                    opacity: item.dim ? 0.4 : 1,
                    boxShadow: item.ring
                      ? "0 0 4px rgba(255,255,255,0.6)"
                      : item.pulse
                        ? "0 0 4px rgba(239,68,68,0.5)"
                        : undefined,
                  }}
                />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
            {decayedCount > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-amber-500 text-xs">⚠</span>
                <span className="text-[10px] text-muted-foreground">
                  裂纹 = 超期未复习（已回退到 80%）
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Right: Node Detail Panel */}
        <div className="space-y-4">
          {selectedNode ? (
            <Card className="animate-slideUp">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedNode.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedNode(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">掌握度</span>
                    <span
                      className={cn(
                        "text-sm font-bold",
                        selectedNode.masteryLevel >= 70
                          ? "text-green-500"
                          : selectedNode.masteryLevel >= 40
                            ? "text-amber-500"
                            : selectedNode.masteryLevel > 0
                              ? "text-red-500"
                              : "text-muted-foreground",
                      )}
                    >
                      {selectedNode.masteryLevel}%
                      {decayedNodeIds.has(selectedNode.id) && (
                        <span className="text-amber-500 ml-1">· 衰退</span>
                      )}
                    </span>
                  </div>
                  <Progress
                    value={selectedNode.masteryLevel}
                    className={cn(
                      "h-2",
                      selectedNode.masteryLevel >= 70 && "[&>div]:bg-green-500",
                      selectedNode.masteryLevel >= 40 &&
                        selectedNode.masteryLevel < 70 && "[&>div]:bg-amber-500",
                      selectedNode.masteryLevel > 0 &&
                        selectedNode.masteryLevel < 40 && "[&>div]:bg-red-500",
                      selectedNode.masteryLevel === 0 && "[&>div]:bg-gray-400",
                    )}
                  />
                </div>

                <Badge
                  className={cn(
                    "border-0",
                    selectedNode.masteryLevel >= 70
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : selectedNode.masteryLevel >= 40
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        : selectedNode.masteryLevel > 0
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500",
                  )}
                >
                  {getMasteryColor(selectedNode.masteryLevel).label}
                </Badge>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>正确 {selectedNode.timesCorrect} 次</span>
                  <Separator orientation="vertical" className="h-3" />
                  <span>错误 {selectedNode.timesWrong} 次</span>
                </div>

                {selectedNode.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedNode.description}
                  </p>
                )}

                <Separator />

                <div>
                  <p className="text-xs font-medium mb-2">前置知识点</p>
                  {prerequisiteNodes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {prerequisiteNodes.map((preNode) => {
                        const { fill } = getMasteryColor(preNode.masteryLevel);
                        return (
                          <Badge
                            key={preNode.id}
                            variant="outline"
                            className="cursor-pointer hover:bg-accent gap-1 text-xs"
                            onClick={() => setSelectedNode(preNode)}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: fill }}
                            />
                            {preNode.name}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">无前置知识点</p>
                  )}
                </div>

                {/* 上下文行动按钮 */}
                {(() => {
                  const status = getNodeStatus(selectedNode.masteryLevel);
                  if (status === "mastered") {
                    return (
                      <Button
                        onClick={() => navigate("/practice")}
                        className="w-full gap-1"
                      >
                        <Play className="w-4 h-4" />
                        复习「{selectedNode.name}」
                      </Button>
                    );
                  }
                  if (status === "weak") {
                    return (
                      <Button
                        onClick={() => {
                          setBattleSubject(selectedNode.subject);
                          setBattleOpen(true);
                        }}
                        className="w-full gap-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                      >
                        <Swords className="w-4 h-4" />
                        消灭战·「{selectedNode.name}」
                      </Button>
                    );
                  }
                  return (
                    <Button
                      onClick={() => {
                        addXP(5);
                        navigate("/practice");
                      }}
                      className="w-full gap-1"
                    >
                      <Play className="w-4 h-4" />
                      练习「{selectedNode.name}」
                    </Button>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5 text-center">
                <Lightbulb className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">点击图中节点查看详情</p>
                <p className="text-xs text-muted-foreground mt-1">
                  亮星可复习，红星可进入消灭战
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                {activeSubject}学科概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {masteredCount}
                  </p>
                  <p className="text-[10px] text-green-500/70 dark:text-green-400/70">
                    已掌握
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {nodes.filter((n) => n.masteryLevel >= 40 && n.masteryLevel < 70).length}
                  </p>
                  <p className="text-[10px] text-amber-500/70 dark:text-amber-400/70">
                    学习中
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <p className="text-lg font-bold text-red-500">{weakCount}</p>
                  <p className="text-[10px] text-red-500/70 dark:text-red-400/70">薄弱</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold text-muted-foreground">
                    {nodes.filter((n) => n.masteryLevel === 0).length}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">未探索</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ====== Knowledge Chain ====== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle>知识点关系链</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              层级结构
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const childrenMap: Record<string, string[]> = {};
            for (const edge of edges) {
              const children = childrenMap[edge.from] || [];
              children.push(edge.to);
              childrenMap[edge.from] = children;
            }
            const roots = nodes.filter(
              (n) => !n.parentId || !edges.some((e) => e.to === n.id),
            );
            const findNode = (id: string) => nodes.find((n) => n.id === id);
            const renderTree = (
              nodeId: string,
              _depth: number,
              visited: Set<string>,
            ): React.ReactNode[] => {
              if (visited.has(nodeId)) return [];
              visited.add(nodeId);
              const node = findNode(nodeId);
              if (!node) return [];
              const children = childrenMap[nodeId] || [];
              const result: React.ReactNode[] = [];
              result.push(
                <Badge
                  key={nodeId}
                  variant="outline"
                  className="cursor-pointer hover:scale-105 transition-transform text-xs"
                  onClick={() => setSelectedNode(node)}
                  style={{
                    backgroundColor: getMasteryColor(node.masteryLevel).fill + "20",
                    borderColor: getMasteryColor(node.masteryLevel).fill,
                    color: getMasteryColor(node.masteryLevel).fill,
                  }}
                >
                  {node.name}
                </Badge>,
              );
              if (children.length > 0) {
                result.push(
                  <ChevronRight
                    key={`arr-${nodeId}`}
                    className="w-3 h-3 text-muted-foreground shrink-0"
                  />,
                );
                children.forEach((childId, idx) => {
                  const childResults = renderTree(childId, _depth + 1, visited);
                  result.push(...childResults);
                  if (idx < children.length - 1) {
                    result.push(
                      <span
                        key={`sep-${childId}`}
                        className="text-[10px] text-muted-foreground"
                      >
                        |
                      </span>,
                    );
                  }
                });
              }
              return result;
            };
            const allChains: React.ReactNode[] = [];
            const visited = new Set<string>();
            let chainIdx = 0;
            for (const root of roots) {
              if (visited.has(root.id)) continue;
              const chain = renderTree(root.id, 0, visited);
              if (chain.length > 0) {
                allChains.push(
                  <div key={chainIdx} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground w-12 shrink-0">
                      路径{chainIdx + 1}
                    </span>
                    {chain}
                  </div>,
                );
                chainIdx++;
              }
            }
            return allChains.length > 0 ? (
              <ScrollArea className="w-full">
                <div className="space-y-3">{allChains}</div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground">暂无关系链数据</p>
            );
          })()}
        </CardContent>
      </Card>

      {/* Task 11: 错题消灭战弹窗 */}
      <ErrorEliminationBattle
        open={battleOpen}
        onClose={() => setBattleOpen(false)}
        subject={battleSubject}
        onEliminated={() => {
          // 消灭战结束后刷新图谱数据（掌握度可能变化）
          fetchGraphData(activeSubject, gradeLevel);
        }}
      />
    </div>
  );
}

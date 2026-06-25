"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Map,
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
} from "lucide-react";
import { useUserStore } from "@/stores/useUserStore";

import { cn } from "@/lib/utils";
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

/* ====== Subject configs ====== */
const subjects = [
  { key: "数学", label: "数学", color: "bg-blue-500" },
  { key: "语文", label: "语文", color: "bg-orange-500" },
  { key: "英语", label: "英语", color: "bg-green-500" },
  { key: "物理", label: "物理", color: "bg-purple-500" },
  { key: "化学", label: "化学", color: "bg-teal-500" },
];

type MasteryFilter = "全部" | "已掌握" | "学习中" | "未学习";

const masteryFilters: { key: MasteryFilter; label: string }[] = [
  { key: "全部", label: "全部" },
  { key: "已掌握", label: "已掌握" },
  { key: "学习中", label: "学习中" },
  { key: "未学习", label: "未学习" },
];

/* ====== Helper ====== */
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

function getMasteryNodeClasses(mastery: number): {
  fillClass: string;
  strokeClass: string;
} {
  if (mastery >= 70)
    return {
      fillClass: "fill-emerald-500 dark:fill-emerald-400",
      strokeClass: "stroke-emerald-600 dark:stroke-emerald-300",
    };
  if (mastery >= 40)
    return {
      fillClass: "fill-amber-500 dark:fill-amber-400",
      strokeClass: "stroke-amber-600 dark:stroke-amber-300",
    };
  if (mastery > 0)
    return {
      fillClass: "fill-red-500 dark:fill-red-400",
      strokeClass: "stroke-red-600 dark:stroke-red-300",
    };
  return {
    fillClass: "fill-gray-400 dark:fill-gray-500",
    strokeClass: "stroke-gray-500 dark:stroke-gray-400",
  };
}

/**
 * 根据知识点树结构计算节点的 x, y 坐标
 * 使用简单的层次布局
 */
function computeNodePositions(nodes: KnowledgeNode[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  // 构建邻接表
  const childrenMap: Record<string, KnowledgeNode[]> = {};
  const roots: KnowledgeNode[] = [];
  for (const node of nodes) {
    if (node.parentId) {
      const children = childrenMap[node.parentId] || [];
      children.push(node);
      childrenMap[node.parentId] = children;
    } else {
      roots.push(node);
    }
  }

  // 递归布局
  const H_SPACING = 130;
  const V_SPACING = 100;
  const START_X = 80;
  const START_Y = 60;

  function layoutSubtree(
    node: KnowledgeNode,
    x: number,
    y: number,
    depth: number
  ): { x: number; width: number } {
    const children = childrenMap[node.id] || [];

    if (children.length === 0) {
      positions[node.id] = { x, y };
      return { x, width: H_SPACING };
    }

    let childX = x;
    const childY = y + V_SPACING;
    const childWidths: { x: number; width: number }[] = [];

    for (const child of children) {
      const result = layoutSubtree(child, childX, childY, depth + 1);
      childWidths.push(result);
      childX += result.width;
    }

    const totalWidth = Math.max(
      H_SPACING,
      childWidths.reduce((sum, cw) => sum + cw.width, 0)
    );
    const centerX = x + totalWidth / 2;
    positions[node.id] = { x: centerX, y };

    return { x, width: Math.max(H_SPACING, totalWidth) };
  }

  const X_OFFSET = START_X;
  let currentX = X_OFFSET;

  for (const root of roots) {
    const result = layoutSubtree(root, currentX, START_Y, 0);
    currentX += result.width + 40; // gap between root trees
  }

  return positions;
}

const nodeRadius = () => 22;

/* ====== Component ====== */
export default function KnowledgeGraphPage() {
  const { weakPoints: _weakPoints, addXP } = useUserStore();
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

  const fetchGraphData = useCallback(async (subject: string) => {
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    try {
      const res = await fetch(`/api/knowledge-graph?subject=${encodeURIComponent(subject)}`);
      if (!res.ok) {
        throw new Error("获取数据失败");
      }
      const data = await res.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载知识图谱数据失败");
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGraphData(activeSubject);
  }, [activeSubject, fetchGraphData]);

  // 计算节点坐标
  const nodePositions = useMemo(() => {
    return computeNodePositions(nodes);
  }, [nodes]);

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
    [nodes]
  );
  const masteredCount = useMemo(
    () => nodes.filter((n) => n.masteryLevel >= 70).length,
    [nodes]
  );

  // Filtered nodes based on mastery filter
  const filteredNodes = useMemo(() => {
    if (masteryFilter === "全部") return nodes;
    return nodes.filter((n) => getMasteryFilterKey(n.masteryLevel) === masteryFilter);
  }, [nodes, masteryFilter]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const handleNodeClick = useCallback(
    (node: KnowledgeNode) => {
      setSelectedNode(node);
      addXP(1);
    },
    [addXP]
  );

  // 查找前置知识点
  const prerequisiteNodes = useMemo(() => {
    if (!selectedNode) return [];
    const parentIds = edges
      .filter((e) => e.to === selectedNode.id)
      .map((e) => e.from);
    return nodes.filter((n) => parentIds.includes(n.id));
  }, [selectedNode, edges, nodes]);

  // 计算 SVG 尺寸
  const svgDimensions = useMemo(() => {
    let maxX = 800;
    let maxY = 600;
    for (const pos of Object.values(nodePositions)) {
      if (pos.x + 60 > maxX) maxX = pos.x + 60;
      if (pos.y + 60 > maxY) maxY = pos.y + 60;
    }
    return { w: Math.max(800, maxX), h: Math.max(600, maxY) };
  }, [nodePositions]);

  /* ====== Loading State ====== */
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">知识图谱</h1>
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
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">知识图谱</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              数据加载失败
            </p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchGraphData(activeSubject)}
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
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subjectColor} flex items-center justify-center shadow-sm`}>
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">知识图谱</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              可视化查看你的知识点掌握情况
            </p>
          </div>
        </div>
        {/* Subject Select */}
        <Card>
          <CardContent className="p-4">
            <Select value={activeSubject} onValueChange={setActiveSubject}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="选择学科" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((sub) => (
                  <SelectItem key={sub.key} value={sub.key}>
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
          onAction={() => fetchGraphData(activeSubject)}
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
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">知识图谱</h1>
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
        </div>
      </div>

      {/* ====== Top Filter Bar ====== */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Subject Select */}
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
                  <SelectItem key={sub.key} value={sub.key}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${sub.color}`} />
                      {sub.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="hidden sm:block h-6" />

            {/* Mastery level filter badges */}
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
          </div>
        </CardContent>
      </Card>

      {/* ====== Overall Mastery Bar ====== */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {activeSubject}掌握度
            </span>
            <span className="text-sm font-bold text-primary">
              {overallMastery}%
            </span>
          </div>
          <Progress value={overallMastery} className="h-2.5" />
        </CardContent>
      </Card>

      {/* ====== Main Graph Area ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left: SVG Graph */}
        <Card className="lg:col-span-2 overflow-hidden">
          {/* Graph controls */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-xs text-muted-foreground">
              点击节点查看详情 | 拖拽平移 | 滚轮缩放
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
                onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
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
            className="relative overflow-hidden"
            style={{ height: "min(520px, 65vh)" }}
          >
            <svg
              viewBox={`0 0 ${svgDimensions.w} ${svgDimensions.h}`}
              className="w-full h-full"
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: "center center",
                cursor: "grab",
              }}
            >
              {/* Defs for shadows and markers */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 8 3, 0 6"
                    className="fill-muted-foreground"
                    opacity={0.5}
                  />
                </marker>
                <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                </filter>
              </defs>

              {/* Connection lines */}
              {edges.map((edge) => {
                const fromPos = nodePositions[edge.from];
                const toPos = nodePositions[edge.to];
                if (!fromPos || !toPos) return null;
                const isFiltered = !filteredNodeIds.has(edge.from) || !filteredNodeIds.has(edge.to);
                return (
                  <line
                    key={`${edge.from}-${edge.to}`}
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    className="stroke-muted-foreground"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={isFiltered ? 0.2 : 0.55}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const { fillClass, strokeClass } = getMasteryNodeClasses(node.masteryLevel);
                const r = nodeRadius();
                const isSelected = selectedNode?.id === node.id;
                const isWeak =
                  node.masteryLevel > 0 && node.masteryLevel < 40;
                const isFiltered = !filteredNodeIds.has(node.id);
                const isHovered = hoveredNode?.id === node.id;

                // Card-style tooltip positioning
                const tooltipWidth = 148;
                const tooltipHeight = 64;
                let tooltipX = pos.x + r + 10;
                let tooltipY = pos.y - tooltipHeight / 2;
                if (tooltipX + tooltipWidth > svgDimensions.w - 10) {
                  tooltipX = pos.x - r - tooltipWidth - 10;
                }
                if (tooltipY < 10) tooltipY = 10;
                if (tooltipY + tooltipHeight > svgDimensions.h - 10) {
                  tooltipY = svgDimensions.h - tooltipHeight - 10;
                }

                return (
                  <g
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer"
                  >
                    {/* Scalable node body (hover scale) */}
                    <g
                      style={{
                        transformOrigin: `${pos.x}px ${pos.y}px`,
                        transform:
                          isHovered && !isFiltered
                            ? "scale(1.1)"
                            : "scale(1)",
                        transition: "transform 0.2s ease-out",
                      }}
                    >
                      {/* Glow for selected */}
                      {isSelected && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={r + 8}
                          fill="none"
                          className="stroke-primary"
                          strokeWidth={3}
                          opacity={0.45}
                          style={{
                            filter: "drop-shadow(0 0 6px currentColor)",
                          }}
                        />
                      )}
                      {/* Pulsing ring for weak points */}
                      {isWeak && !isFiltered && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={r + 8}
                          fill="none"
                          className="stroke-red-500 dark:stroke-red-400 animate-pulse-glow"
                          strokeWidth={2}
                          opacity={0.35}
                        />
                      )}
                      {/* Node circle with shadow */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={r}
                        className={cn(fillClass, strokeClass)}
                        strokeWidth={2}
                        opacity={isFiltered ? 0.2 : (node.masteryLevel === 0 ? 0.55 : 0.9)}
                        filter={!isFiltered ? "url(#nodeShadow)" : undefined}
                      />
                      {/* Hover ring */}
                      {isHovered && !isFiltered && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={r + 3}
                          fill="none"
                          className={strokeClass}
                          strokeWidth={2}
                          opacity={0.6}
                        />
                      )}
                      <text
                        x={pos.x}
                        y={pos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className={cn(
                          "text-[10px] font-semibold",
                          isFiltered ? "fill-muted-foreground" : "fill-white dark:fill-white"
                        )}
                        style={{
                          pointerEvents: "none",
                          textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                        }}
                      >
                        {node.name.length > 5
                          ? node.name.slice(0, 5) + "..."
                          : node.name}
                      </text>
                    </g>

                    {/* Hover tooltip with Card styling */}
                    {isHovered && !isFiltered && (
                      <foreignObject
                        x={tooltipX}
                        y={tooltipY}
                        width={tooltipWidth}
                        height={tooltipHeight}
                      >
                        <div
                          className={cn(
                            "flex flex-col justify-center h-full rounded-xl border border-border bg-popover/95 backdrop-blur-sm p-3 shadow-lg",
                            "text-popover-foreground"
                          )}
                        >
                          <p className="text-sm font-semibold leading-tight truncate">
                            {node.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            掌握度 {node.masteryLevel}%
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
              { color: "#22c55e", label: "已掌握(>=70%)" },
              { color: "#eab308", label: "学习中(40-70%)" },
              { color: "#ef4444", label: "薄弱(<40%)" },
              { color: "#9ca3af", label: "未探索" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-3 h-3 rounded-full border-2 border-red-400 animate-pulse-glow" />
              <span className="text-[10px] text-muted-foreground">
                你的薄弱点
              </span>
            </div>
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
                {/* Mastery bar */}
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
                              : "text-muted-foreground"
                      )}
                    >
                      {selectedNode.masteryLevel}%
                    </span>
                  </div>
                  <Progress
                    value={selectedNode.masteryLevel}
                    className={cn(
                      "h-2",
                      selectedNode.masteryLevel >= 70 && "[&>div]:bg-green-500",
                      selectedNode.masteryLevel >= 40 && selectedNode.masteryLevel < 70 && "[&>div]:bg-amber-500",
                      selectedNode.masteryLevel > 0 && selectedNode.masteryLevel < 40 && "[&>div]:bg-red-500",
                      selectedNode.masteryLevel === 0 && "[&>div]:bg-gray-400"
                    )}
                  />
                </div>

                {/* Status badge */}
                <Badge
                  className={cn(
                    "border-0",
                    selectedNode.masteryLevel >= 70
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : selectedNode.masteryLevel >= 40
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        : selectedNode.masteryLevel > 0
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                  )}
                >
                  {getMasteryColor(selectedNode.masteryLevel).label}
                </Badge>

                {/* Stats */}
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

                {/* Related nodes (prerequisites) */}
                <div>
                  <p className="text-xs font-medium mb-2">
                    前置知识点
                  </p>
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

                {/* Practice button */}
                <Button
                  onClick={() => addXP(5)}
                  className="w-full gap-1"
                >
                  <Play className="w-4 h-4" />
                  练习「{selectedNode.name}」
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5 text-center">
                <Lightbulb className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  点击图中节点查看详情
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  红色/黄色节点需要加强练习
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
                    {
                      nodes.filter(
                        (n) => n.masteryLevel >= 40 && n.masteryLevel < 70
                      ).length
                    }
                  </p>
                  <p className="text-[10px] text-amber-500/70 dark:text-amber-400/70">
                    学习中
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <p className="text-lg font-bold text-red-500">{weakCount}</p>
                  <p className="text-[10px] text-red-500/70 dark:text-red-400/70">
                    薄弱
                  </p>
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

      {/* ====== Recommended Learning Path ====== */}
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
          {/* Build chains from edges */}
          {(() => {
            // Build trees from edges
            const childrenMap: Record<string, string[]> = {};
            for (const edge of edges) {
              const children = childrenMap[edge.from] || [];
              children.push(edge.to);
              childrenMap[edge.from] = children;
            }

            const roots = nodes.filter(
              (n) =>
                !n.parentId ||
                !edges.some((e) => e.to === n.id)
            );

            const findNode = (id: string) => nodes.find((n) => n.id === id);

            // Render tree chains recursively
            const renderTree = (
              nodeId: string,
              depth: number,
              visited: Set<string>
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
                    backgroundColor:
                      getMasteryColor(node.masteryLevel).fill + "20",
                    borderColor: getMasteryColor(node.masteryLevel).fill,
                    color: getMasteryColor(node.masteryLevel).fill,
                  }}
                >
                  {node.name}
                </Badge>
              );

              if (children.length > 0) {
                result.push(
                  <ChevronRight
                    key={`arr-${nodeId}`}
                    className="w-3 h-3 text-muted-foreground shrink-0"
                  />
                );
                children.forEach((childId, idx) => {
                  const childResults = renderTree(childId, depth + 1, visited);
                  result.push(...childResults);
                  if (idx < children.length - 1) {
                    result.push(
                      <span
                        key={`sep-${childId}`}
                        className="text-[10px] text-muted-foreground"
                      >
                        |
                      </span>
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
                  </div>
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
    </div>
  );
}

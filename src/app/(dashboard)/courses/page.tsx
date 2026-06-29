"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Search,
  BookOpen,
  Clock,
  Users,
  Play,
  Star,
  GraduationCap,
  FlaskConical,
  Languages,
  Calculator,
  PenTool,
  Atom,
  AlertTriangle,
  RotateCw,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCourses as repoGetCourses } from "@/lib/repositories/courses.repository";

interface CourseItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  coverImage: string | null;
  isFree: boolean;
  price: number;
  lessonCount: number;
  totalDuration: number;
  enrolledCount: number;
  progress: number;
  createdAt: string;
}

const subjectOptions = [
  { value: "全部", label: "全部" },
  { value: "数学", label: "数学" },
  { value: "语文", label: "语文" },
  { value: "英语", label: "英语" },
  { value: "物理", label: "物理" },
  { value: "化学", label: "化学" },
];

const subjectConfig: Record<
  string,
  { gradient: string; icon: React.ElementType; dot: string }
> = {
  数学: { gradient: "from-blue-500 via-indigo-500 to-purple-600", icon: Calculator, dot: "bg-blue-500" },
  语文: { gradient: "from-rose-500 via-orange-500 to-amber-500", icon: PenTool, dot: "bg-rose-500" },
  英语: { gradient: "from-indigo-500 via-violet-500 to-pink-500", icon: Languages, dot: "bg-indigo-500" },
  物理: { gradient: "from-emerald-500 via-teal-500 to-cyan-600", icon: Atom, dot: "bg-emerald-500" },
  化学: { gradient: "from-amber-500 via-orange-500 to-rose-500", icon: FlaskConical, dot: "bg-amber-500" },
};

const defaultSubjectConfig = {
  gradient: "from-slate-500 to-gray-600",
  icon: GraduationCap,
  dot: "bg-slate-500",
};

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0分钟";
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
}

function CourseCardSkeleton() {
  return (
    <Card className="group overflow-hidden rounded-xl">
      <Skeleton className="h-24 w-full rounded-t-xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
        <Skeleton className="h-3 w-full rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
        <Skeleton className="h-3 w-1/2 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
        <Skeleton className="h-1.5 w-full rounded-full bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-3 w-16 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
          <Skeleton className="h-8 w-20 rounded-lg bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("全部");
  const [sort, setSort] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await repoGetCourses({
        subject: subject !== "全部" ? subject : undefined,
        sort: sort as "latest" | "popular" | "progress",
      });
      setCourses(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取课程列表失败");
      toast({ title: "加载失败", description: "无法获取课程列表，请稍后重试", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [subject, sort, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.trim().toLowerCase();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 space-y-6 animate-fadeIn">
      {/* 页面标题 + 搜索栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">课程中心</h1>
          <p className="text-sm text-muted-foreground mt-1">
            同步课堂 · 专题突破 · 考前冲刺
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索课程..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="选择科目" />
          </SelectTrigger>
          <SelectContent>
            {subjectOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">最新</SelectItem>
            <SelectItem value="popular">最热</SelectItem>
            <SelectItem value="progress">进度</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* 课程卡片网格 */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchCourses}>
              <RotateCw className="h-4 w-4" />
              重试
            </Button>
          </AlertDescription>
        </Alert>
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="没有找到匹配的课程"
          description="尝试调整筛选条件或搜索关键词"
          actionLabel={
            searchQuery || subject !== "全部" || sort !== "latest"
              ? "重置筛选"
              : undefined
          }
          onAction={() => {
            setSearchQuery("");
            setSubject("全部");
            setSort("latest");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => {
            const config = subjectConfig[course.subject] || defaultSubjectConfig;
            const SubjectIcon = config.icon;

            return (
              <Card
                key={course.id}
                className="group overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => setSelectedCourse(course)}
              >
                {/* 课程图标/插画区域 */}
                <div
                  className={`h-28 bg-gradient-to-br ${config.gradient} relative overflow-hidden`}
                >
                  {/* Subtle dot pattern */}
                  <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08]
                    [background-image:radial-gradient(circle_at_1.5px_1.5px,white_1px,transparent_0)]
                    [background-size:12px_12px]" />
                  {/* Large background icon */}
                  <div className="absolute -right-4 -bottom-5 opacity-15 dark:opacity-10 rotate-12 scale-110">
                    <SubjectIcon className="h-28 w-28 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10 dark:to-white/5 pointer-events-none" />
                  <div className="absolute top-3 left-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/10">
                      <SubjectIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-white/25 text-white border-0 backdrop-blur-sm shadow-sm pl-1.5 pr-2.5"
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", config.dot)} />
                      {course.subject}
                    </Badge>
                    {course.isFree ? (
                      <Badge className="text-[10px] bg-emerald-500/90 hover:bg-emerald-500/90 text-white border-0 backdrop-blur-sm shadow-sm">
                        免费
                      </Badge>
                    ) : course.price > 0 ? (
                      <Badge className="text-[10px] bg-amber-500/90 hover:bg-amber-500/90 text-white border-0 backdrop-blur-sm shadow-sm">
                        ¥{course.price}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <CardContent className="p-4 space-y-2">
                  <h3 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(course.totalDuration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {course.lessonCount}节
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {course.enrolledCount.toLocaleString()}
                    </span>
                  </div>

                  {/* 进度条 */}
                  {course.progress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>学习进度</span>
                        <span>{Math.round(course.progress)}%</span>
                      </div>
                      <Progress value={course.progress} className="h-1.5" />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                      <Star className="h-3.5 w-3.5" />
                      {course.lessonCount * 25} XP
                    </span>
                    <Button
                      variant={course.progress > 0 ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs gap-1"
                      asChild
                    >
                      <Link href={`/courses/${course.id}`}>
                        {course.progress > 0 ? "继续学习" : "开始学习"}
                        <Play className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 课程详情 Dialog */}
      <Dialog
        open={!!selectedCourse}
        onOpenChange={(open) => !open && setSelectedCourse(null)}
      >
        {selectedCourse && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedCourse.title}</DialogTitle>
              <DialogDescription>{selectedCourse.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{selectedCourse.subject}</Badge>
                <Badge variant="outline">{selectedCourse.gradeLevel}</Badge>
                {selectedCourse.isFree && (
                  <Badge className="bg-emerald-500 text-white border-0">
                    免费
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold">
                    {selectedCourse.lessonCount}
                  </p>
                  <p className="text-xs text-muted-foreground">课时</p>
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {formatDuration(selectedCourse.totalDuration)}
                  </p>
                  <p className="text-xs text-muted-foreground">总时长</p>
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {selectedCourse.enrolledCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">在学</p>
                </div>
              </div>
              {selectedCourse.progress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">学习进度</span>
                    <span className="font-medium">
                      {Math.round(selectedCourse.progress)}%
                    </span>
                  </div>
                  <Progress value={selectedCourse.progress} />
                </div>
              )}
              <Button className="w-full" asChild>
                <Link href={`/courses/${selectedCourse.id}`}>
                  {selectedCourse.progress > 0 ? "继续学习" : "开始学习"}
                  <Play className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

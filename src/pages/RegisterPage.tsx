import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, BookOpen } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LEARNING_MODES, type LearningMode } from "@/lib/learning-modes";
import { cn } from "@/lib/utils";
import PolarisMascot from "@/components/common/PolarisMascot";
import { register } from "@/lib/services/auth-service";

const ROLES = [
  { value: "student", label: "学生" },
  { value: "parent", label: "家长" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedMode, setSelectedMode] = useState<LearningMode>("YOUTH");
  const [role, setRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("请填写所有必填字段");
      return;
    }

    if (password.length < 6) {
      toast.error("密码长度至少6位");
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, selectedMode, name.trim());
      toast.success("注册成功！请登录");
      navigate("/login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "注册失败，请稍后重试";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full animate-fadeIn border border-white/5 shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)] backdrop-blur-sm">
      <CardHeader className="text-center space-y-3">
        {/* Task 18.6: PolarisMascot 欢迎装饰 */}
        <div className="flex justify-center">
          <PolarisMascot mood="default" size={64} />
        </div>
        <div>
          <CardTitle className="text-2xl">创建账号</CardTitle>
          <CardDescription className="mt-1">加入 Polaris，开启智能学习之旅</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱地址</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位密码"
                autoComplete="new-password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>选择学习模式</Label>
            <div className="grid grid-cols-2 gap-3">
              {LEARNING_MODES.map((mode) => {
                return (
                  <div
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-4 cursor-pointer transition-all",
                      selectedMode === mode.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {/* V2：学段统一视觉，不再使用差异化 icon */}
                    <BookOpen className="size-8 text-primary" />
                    <span className="font-medium text-sm">{mode.label}</span>
                    <span className="text-xs text-muted-foreground text-center">
                      {mode.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>身份</Label>
            <RadioGroup
              value={role}
              onValueChange={setRole}
              className="flex gap-4"
            >
              {ROLES.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={`role-${r.value}`} />
                  <Label htmlFor={`role-${r.value}`} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "注册中..." : "创建账号"}
            </Button>
          </motion.div>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          已有账号？{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            立即登录
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

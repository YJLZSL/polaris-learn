import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
import PolarisMascot from "@/components/common/PolarisMascot";
import { login } from "@/lib/services/auth-service";
import { useUserStore } from "@/stores/useUserStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useUserStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("请填写邮箱和密码");
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        grade: user.grade,
        learningMode: user.learningMode,
        avatar: user.avatar ?? null,
      });
      toast.success("登录成功！");
      navigate("/home");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "登录失败，请稍后重试";
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
          <CardTitle className="text-2xl">欢迎回来</CardTitle>
          <CardDescription className="mt-1">登录你的 Polaris 账号</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="请输入密码"
                autoComplete="current-password"
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

          <motion.div whileTap={{ scale: 0.97 }}>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "登录中..." : "登录"}
            </Button>
          </motion.div>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          还没有账号？{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            立即注册
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getCurrentUser, login, logout } from "@/lib/services/auth-service";
import { seedIfEmpty } from "@/lib/db/seed";
import type { User } from "@/lib/repositories/user.repository";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  grade?: string | null;
  learningMode?: string;
}

export interface SessionData {
  user: SessionUser | null;
  expires: string;
}

export interface UseSessionReturn {
  data: SessionData | null;
  user: SessionUser | null;
  status: SessionStatus;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<UseSessionReturn>({
  data: null,
  user: null,
  status: "loading",
  signIn: async () => {
    throw new Error("SessionProvider not mounted");
  },
  signOut: async () => {
    throw new Error("SessionProvider not mounted");
  },
});

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.avatar ?? null,
    grade: user.grade,
    learningMode: user.learningMode,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  // 挂载时注入种子数据并初始化当前用户
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await seedIfEmpty();
      } catch (e) {
        console.error("[SessionProvider] seedIfEmpty failed:", e);
      }
      try {
        const current = await getCurrentUser();
        if (!active) return;
        if (current) {
          setUser(current);
          setStatus("authenticated");
        } else {
          setUser(null);
          setStatus("unauthenticated");
        }
      } catch (e) {
        console.error("[SessionProvider] getCurrentUser failed:", e);
        if (!active) return;
        setUser(null);
        setStatus("unauthenticated");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSignIn = useCallback(async (email: string, password: string): Promise<User> => {
    const u = await login(email, password);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const handleSignOut = useCallback(async () => {
    await logout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const sessionUser = user ? toSessionUser(user) : null;
  const sessionData: SessionData | null = user
    ? {
        user: sessionUser,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }
    : null;

  const value: UseSessionReturn = {
    data: sessionData,
    user: sessionUser,
    status,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): UseSessionReturn {
  return useContext(SessionContext);
}

export async function signOut(): Promise<void> {
  await logout();
}

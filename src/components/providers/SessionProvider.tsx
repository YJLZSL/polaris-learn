import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { getCurrentUser, login, logout } from "@/lib/services/auth-service";
import { seedIfEmpty } from "@/lib/db/seed";
import type { User } from "@/lib/repositories/user.repository";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "guest";

const INIT_TIMEOUT_MS = 5000;

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

function createGuestUser(): SessionUser {
  return {
    id: "guest",
    name: "游客",
    email: null,
    image: null,
    grade: null,
    learningMode: undefined,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const statusRef = useRef<SessionStatus>("loading");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const applyResolution = (current: User | null) => {
      if (!active) return;
      if (statusRef.current === "authenticated") {
        return;
      }
      if (current) {
        setUser(current);
        setStatus("authenticated");
      } else if (statusRef.current === "loading") {
        // During cold start, treat "no current user" as guest so the dashboard
        // remains reachable without forcing a login redirect.
        setUser(null);
        setStatus("guest");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    };

    const enterGuestMode = () => {
      if (!active) return;
      if (statusRef.current !== "loading") return;
      setUser(null);
      setStatus("guest");
    };

    const initializeSession = async () => {
      try {
        await seedIfEmpty();
      } catch (e) {
        console.error("[SessionProvider] seedIfEmpty failed:", e);
      }
      try {
        const current = await getCurrentUser();
        applyResolution(current);
      } catch (e) {
        console.error("[SessionProvider] getCurrentUser failed:", e);
        applyResolution(null);
      }
    };

    timeoutId = setTimeout(() => {
      if (statusRef.current === "loading") {
        console.warn("[SessionProvider] Init timeout exceeded, entering guest mode");
        enterGuestMode();
      }
    }, INIT_TIMEOUT_MS);

    initializeSession();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
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

  const sessionUser = user ? toSessionUser(user) : status === "guest" ? createGuestUser() : null;
  const sessionData: SessionData | null = sessionUser
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

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): UseSessionReturn {
  return useContext(SessionContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export async function signOut(): Promise<void> {
  await logout();
}

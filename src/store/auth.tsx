import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import {
  finishLoginFromCallback,
  refreshSession,
  shouldRefresh,
  startLogin
} from "../api/auth";
import type { AuthSession } from "../types/reddit";

const SESSION_KEY = "reddit-image-pwa:session";

interface AuthContextValue {
  session: AuthSession | null;
  isBooting: boolean;
  authError: string | null;
  login: () => Promise<void>;
  logout: () => void;
  ensureFreshSession: () => Promise<AuthSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [isBooting, setIsBooting] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const persistSession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);
    if (nextSession) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    persistSession(null);
    setAuthError(null);
  }, [persistSession]);

  const ensureFreshSession = useCallback(async () => {
    if (!session) {
      return null;
    }

    if (!shouldRefresh(session)) {
      return session;
    }

    try {
      const refreshed = await refreshSession(session);
      persistSession(refreshed);
      return refreshed;
    } catch (error) {
      persistSession(null);
      setAuthError(error instanceof Error ? error.message : "Session expiree.");
      return null;
    }
  }, [persistSession, session]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (window.location.pathname !== "/callback") {
        setIsBooting(false);
        return;
      }

      try {
        const nextSession = await finishLoginFromCallback(window.location.search);
        if (!cancelled) {
          persistSession(nextSession);
          window.history.replaceState(null, "", "/");
        }
      } catch (error) {
        if (!cancelled) {
          setAuthError(error instanceof Error ? error.message : "Connexion impossible.");
        }
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [persistSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isBooting,
      authError,
      login: startLogin,
      logout,
      ensureFreshSession
    }),
    [authError, ensureFreshSession, isBooting, logout, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit etre utilise dans AuthProvider.");
  }
  return context;
}

function readSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: string
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  demoSignIn: (
    profileType: "csa" | "architect"
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = "rebon_mock_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase is configured with real credentials, subscribe to real auth
    if (isSupabaseConfigured) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      });

      supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }

    // Local / Offline / Sandbox fallback mode
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        setUser(parsed);
      }
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role = "Cloud Support Associate (L1)"
  ) => {
    if (isSupabaseConfigured) {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role,
          },
        },
      });
      return { error: error as Error | null };
    }

    // Local simulated user creation
    const mockUser: User = {
      id: "usr_" + Math.random().toString(36).substring(2, 10),
      app_metadata: { provider: "email" },
      user_metadata: { full_name: fullName, role },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email,
      role: "authenticated",
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    } catch {
      // storage unavailable
    }
    setUser(mockUser);
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    }

    // Local simulated login
    const cleanName = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const mockUser: User = {
      id: "usr_" + Math.random().toString(36).substring(2, 10),
      app_metadata: { provider: "email" },
      user_metadata: {
        full_name: cleanName || "Cloud Engineer",
        role: "Cloud Support Associate (L1)",
      },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email,
      role: "authenticated",
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    } catch {
      // storage unavailable
    }
    setUser(mockUser);
    return { error: null };
  };

  const demoSignIn = async (profileType: "csa" | "architect") => {
    const isCSA = profileType === "csa";
    const demoUser: User = {
      id: isCSA ? "usr_demo_csa" : "usr_demo_architect",
      app_metadata: { provider: "demo" },
      user_metadata: {
        full_name: isCSA ? "Vikram Aditya (CSA)" : "Sarah Lin (Solutions Architect)",
        role: isCSA ? "Cloud Support Associate (L1)" : "Principal Solutions Architect",
        track: isCSA ? "cloud_fresher" : "cloud_engineer",
      },
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email: isCSA ? "csa.engineer@rebon.cloud" : "architect@rebon.cloud",
      role: "authenticated",
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
    } catch {
      // storage unavailable
    }
    setUser(demoUser);
    return { error: null };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    } catch {
      // storage unavailable
    }
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, demoSignIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

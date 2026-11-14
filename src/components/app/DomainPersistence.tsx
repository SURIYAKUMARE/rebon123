import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDomain } from "@/contexts/DomainContext";
import { supabase } from "@/integrations/supabase/client";

/** Hydrate domain from profile on login; localStorage is the session fallback. */
export function DomainPersistence() {
  const { user } = useAuth();
  const { setDomain } = useDomain();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("domain")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled || data?.domain !== "fullstack") return;
      setDomain("fullstack");
    })();

    return () => {
      cancelled = true;
    };
  }, [user, setDomain]);

  return null;
}

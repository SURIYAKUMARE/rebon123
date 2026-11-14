import { useCallback, useEffect, useRef, useState } from "react";
import { resolveStudentQuery } from "@/services/knowledgeOrchestratorClient";
import {
  dispatchOrchestratorPayload,
  subscribeRenBus,
  type RenBusEvent,
} from "@/services/renEventBus";
import type {
  OrchestratorPayload,
  OrchestratorRequest,
  RenUiSurface,
} from "@/types/knowledgeContainer";
import { useAuth } from "@/contexts/AuthContext";

export type KnowledgeOrchestratorHook = {
  loading: boolean;
  error: string | null;
  lastPayload: OrchestratorPayload | null;
  lastUiSurface: RenUiSurface | null;
  cacheHit: boolean | null;
  ask: (
    partial: Omit<OrchestratorRequest, "session_id"> & { session_id?: string }
  ) => Promise<OrchestratorPayload | null>;
  askAndDispatch: (
    partial: Omit<OrchestratorRequest, "session_id"> & { session_id?: string },
    opts?: { dryRun?: boolean }
  ) => Promise<OrchestratorPayload | null>;
  reset: () => void;
};

function makeSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}`;
}

/**
 * React hook: two-tier knowledge container + optional UI event-bus dispatch.
 */
export function useKnowledgeOrchestrator(): KnowledgeOrchestratorHook {
  const { user } = useAuth();
  const sessionRef = useRef(makeSessionId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<OrchestratorPayload | null>(
    null
  );
  const [lastUiSurface, setLastUiSurface] = useState<RenUiSurface | null>(null);
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);

  useEffect(() => {
    return subscribeRenBus((ev: RenBusEvent) => {
      if (ev.type === "ui_surface") setLastUiSurface(ev.surface);
    });
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setLastPayload(null);
    setCacheHit(null);
  }, []);

  const ask = useCallback(
    async (
      partial: Omit<OrchestratorRequest, "session_id"> & { session_id?: string }
    ): Promise<OrchestratorPayload | null> => {
      const user_input = partial.user_input?.trim();
      if (!user_input) {
        setError("Enter a question for Ren.");
        return null;
      }

      setLoading(true);
      setError(null);

      const req: OrchestratorRequest = {
        session_id: partial.session_id || sessionRef.current,
        lesson_id: partial.lesson_id,
        step_index: partial.step_index ?? 0,
        step_id: partial.step_id,
        user_input,
        current_route: partial.current_route || "unknown",
        current_ui: partial.current_ui || "CONSOLE",
        language: partial.language,
        cloud_role: partial.cloud_role,
      };

      try {
        const result = await resolveStudentQuery(req, { userId: user?.id });
        if (!result) {
          setError("Ren could not resolve this query.");
          return null;
        }
        setLastPayload(result.payload);
        setCacheHit(result.cache_hit);
        return result.payload;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Orchestrator failed";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  const askAndDispatch = useCallback(
    async (
      partial: Omit<OrchestratorRequest, "session_id"> & { session_id?: string },
      opts?: { dryRun?: boolean }
    ) => {
      const payload = await ask(partial);
      if (!payload) return null;
      await dispatchOrchestratorPayload(payload, {
        dryRun: opts?.dryRun,
        actionGapMs: 400,
      });
      return payload;
    },
    [ask]
  );

  return {
    loading,
    error,
    lastPayload,
    lastUiSurface,
    cacheHit,
    ask,
    askAndDispatch,
    reset,
  };
}

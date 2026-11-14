import { useCallback, useState } from "react";
import { safeFetchJson } from "@/lib/safeFetch";
import { logger } from "@/lib/logger";

export type RenTimelineResponse = {
  speech: string;
  action: string | null;
};

export type RenTimelineState = {
  speech: string | null;
  action: string | null;
  loading: boolean;
  error: string | null;
  askRen: (studentQuery: string, currentRoute: string) => Promise<RenTimelineResponse | null>;
  reset: () => void;
};

/**
 * Calls POST /api/ren (Gemini-backed Ren mentor) and exposes speech + ACTION_MAP code
 * for the console timeline / TTS layer.
 */
export function useRenTimeline(): RenTimelineState {
  const [speech, setSpeech] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSpeech(null);
    setAction(null);
    setError(null);
    setLoading(false);
  }, []);

  const askRen = useCallback(
    async (studentQuery: string, currentRoute: string): Promise<RenTimelineResponse | null> => {
      const q = studentQuery.trim();
      if (!q) {
        setError("Please enter a question for Ren.");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await safeFetchJson<RenTimelineResponse>("/api/ren", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentQuery: q,
            currentRoute: currentRoute || "unknown",
          }),
          timeoutMs: 45_000,
          retryOnce: true,
        });

        if (result.ok === false) {
          const message = result.error.message;
          setError(message);
          logger.error("useRenTimeline", message);
          return null;
        }

        const data = result.data;
        if (
          typeof data.speech !== "string" ||
          (data.action !== null && typeof data.action !== "string")
        ) {
          const message = "Ren returned an invalid response shape.";
          setError(message);
          logger.error("useRenTimeline", message, data);
          return null;
        }

        setSpeech(data.speech);
        setAction(data.action);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not reach Ren.";
        setError(message);
        logger.error("useRenTimeline", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { speech, action, loading, error, askRen, reset };
}

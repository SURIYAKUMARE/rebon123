/**
 * Client orchestration — Primary → Third → POST /api/knowledge → Secondary.
 */
import { safeFetchJson } from "@/lib/safeFetch";
import { logger } from "@/lib/logger";
import {
  lookupPrimaryQuery,
  normalizeQueryFingerprint,
  stageInteraction,
  lookupThirdQa,
} from "@/data/cloud/knowledgeContainer";
import type {
  OrchestratorPayload,
  OrchestratorRequest,
  SecondaryStagingEntry,
} from "@/types/knowledgeContainer";
import { supabase } from "@/integrations/supabase/client";

export type KnowledgeClientResult = {
  payload: OrchestratorPayload;
  cache_hit: boolean;
  staging?: SecondaryStagingEntry | null;
};

type ApiKnowledgeResponse = OrchestratorPayload & {
  cache_hit?: boolean;
  staging?: {
    id: string;
    session_id: string;
    lesson_id: string;
    step_index: number;
    step_id?: string | null;
    user_input: string;
    gemini_response_text: string;
    generated_actions: string[];
    ui_surface: OrchestratorPayload["ui_surface"];
    board_ops?: OrchestratorPayload["board_ops"] | null;
    status: "pending_review";
    current_route?: string | null;
    language?: string | null;
    created_at: string;
  };
};

async function persistStagingToSupabase(
  staging: NonNullable<ApiKnowledgeResponse["staging"]>,
  userId?: string | null
) {
  try {
    await (supabase as any).from("secondary_container_staging").insert({
      id: staging.id,
      session_id: staging.session_id,
      lesson_id: staging.lesson_id,
      step_index: staging.step_index,
      step_id: staging.step_id,
      user_input: staging.user_input,
      gemini_response_text: staging.gemini_response_text,
      generated_actions: staging.generated_actions,
      ui_surface: staging.ui_surface,
      board_ops: staging.board_ops,
      status: "pending_review",
      current_route: staging.current_route,
      language: staging.language,
      user_id: userId || null,
    });
  } catch (err) {
    logger.warn(
      "knowledgeOrchestratorClient",
      "Supabase staging insert skipped (table may be missing)",
      err
    );
  }
}

/**
 * Resolve a student query through the three-tier container:
 * 1. Primary local author query_cache
 * 2. Third verified Q&A
 * 3. Server (Primary/Third hints + Gemini) → Secondary staging
 */
export async function resolveStudentQuery(
  req: OrchestratorRequest,
  opts?: { userId?: string | null; localOnly?: boolean }
): Promise<KnowledgeClientResult | null> {
  const primaryHit = lookupPrimaryQuery(req);
  if (primaryHit) {
    return { payload: primaryHit, cache_hit: true, staging: null };
  }

  const thirdHit = lookupThirdQa(req);
  if (thirdHit) {
    return { payload: thirdHit, cache_hit: true, staging: null };
  }

  // Local container mode — no Gemini /api/knowledge (CSA learning pass).
  const localOnly =
    opts?.localOnly !== false &&
    (opts?.localOnly === true ||
      import.meta.env.VITE_KNOWLEDGE_LOCAL_ONLY !== "false");

  if (localOnly) {
    return {
      payload: {
        speech:
          "I only have the authored Primary answers for this lesson right now — no live AI call. Rephrase using something we covered on the board or console, or say no doubts to close.",
        ui_surface: "BOARD",
        actions: [],
        source: "primary",
        staging_id: null,
      },
      cache_hit: false,
      staging: null,
    };
  }

  const result = await safeFetchJson<ApiKnowledgeResponse>("/api/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    timeoutMs: 55_000,
    retryOnce: true,
  });

  if (result.ok === false) {
    logger.error("knowledgeOrchestratorClient", result.error.message);
    return null;
  }

  const data = result.data;
  const payload: OrchestratorPayload = {
    speech: data.speech,
    ui_surface: data.ui_surface,
    actions: data.actions || [],
    board_ops: data.board_ops,
    source:
      data.source ||
      (data.cache_hit
        ? data.qa_id
          ? "third"
          : "primary"
        : "gemini_fallback"),
    staging_id: data.staging_id ?? data.staging?.id ?? null,
    qa_id: data.qa_id ?? null,
  };

  let stagingLocal: SecondaryStagingEntry | null = null;
  if (data.staging && payload.source === "gemini_fallback") {
    stagingLocal = stageInteraction({
      id: data.staging.id,
      session_id: data.staging.session_id,
      lesson_id: data.staging.lesson_id,
      step_index: data.staging.step_index,
      step_id: data.staging.step_id,
      user_input: data.staging.user_input,
      gemini_response_text: data.staging.gemini_response_text,
      generated_actions: data.staging.generated_actions,
      ui_surface: data.staging.ui_surface,
      board_ops: data.staging.board_ops,
      status: "pending_review",
      current_route: data.staging.current_route,
      language: (data.staging.language as "english" | "tanglish") || null,
      user_id: opts?.userId ?? null,
    });
    void persistStagingToSupabase(data.staging, opts?.userId);
  }

  return {
    payload,
    cache_hit: Boolean(data.cache_hit),
    staging: stagingLocal,
  };
}

export function fingerprintQuery(input: string): string {
  return normalizeQueryFingerprint(input);
}

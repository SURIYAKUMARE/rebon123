/**
 * Vercel — POST /api/knowledge-promote
 * Body: PromoteRequest (+ optional staging snapshot if process memory was cold)
 * Seeds server Third cache. Does not invent staging from arbitrary speech alone.
 */
import type { PromoteRequest } from "../src/types/knowledgeContainer";

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  setHeader: (k: string, v: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
};

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      body = {};
    }
  }
  if (typeof body !== "object" || body === null) body = {};

  const { promoteStagingToThird } = await import(
    "../src/data/cloud/knowledgeContainer/promote"
  );
  const { seedServerThirdQa } = await import("../server/knowledgeOrchestrator");
  const { stageInteraction, getStagingEntry } = await import(
    "../src/data/cloud/knowledgeContainer/secondaryStore"
  );

  const promoteReq = body as PromoteRequest & {
    staging_snapshot?: {
      session_id: string;
      user_input: string;
      gemini_response_text: string;
      generated_actions?: string[];
      ui_surface?: "BOARD" | "CONSOLE" | "NONE";
      step_index?: number;
    };
  };

  if (!promoteReq.staging_id || !promoteReq.lesson_id) {
    res.status(400).json({ error: "staging_id and lesson_id are required." });
    return;
  }

  // Hydrate from an explicit staging snapshot only (from the review UI),
  // never from free-form speech without the original user_input trail.
  if (!getStagingEntry(promoteReq.staging_id) && promoteReq.staging_snapshot) {
    const snap = promoteReq.staging_snapshot;
    if (
      typeof snap.user_input === "string" &&
      snap.user_input.trim() &&
      typeof snap.gemini_response_text === "string" &&
      snap.gemini_response_text.trim() &&
      typeof snap.session_id === "string"
    ) {
      stageInteraction({
        id: promoteReq.staging_id,
        session_id: snap.session_id,
        lesson_id: promoteReq.lesson_id,
        step_index: Number(snap.step_index) || 0,
        user_input: snap.user_input,
        gemini_response_text: snap.gemini_response_text,
        generated_actions: Array.isArray(snap.generated_actions)
          ? snap.generated_actions
          : [],
        ui_surface: snap.ui_surface || "NONE",
        status: "pending_review",
      });
    }
  }

  if (!getStagingEntry(promoteReq.staging_id)) {
    res.status(404).json({
      error:
        "Staging entry not found. Pass staging_snapshot from the review UI or stage first.",
    });
    return;
  }

  const result = promoteStagingToThird(promoteReq);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  seedServerThirdQa({
    id: result.entry.id,
    lesson_id: result.entry.lesson_id,
    fingerprint: result.entry.fingerprint,
    match_patterns: result.entry.match_patterns,
    question_canonical: result.entry.question_canonical,
    answer_speech: result.entry.answer_speech,
    ui_surface: result.entry.ui_surface,
    actions: result.entry.actions,
    board_ops: result.entry.board_ops,
  });

  res.status(200).json({ ok: true, entry: result.entry });
}

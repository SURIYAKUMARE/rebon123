/**
 * Review & Promotion Pipeline — Secondary → Third (verified Q&A).
 * Primary lesson trees stay authored; student doubts do not write into Primary.
 */
import type {
  PromoteRequest,
  SecondaryStagingEntry,
  ThirdQaEntry,
} from "../../../types/knowledgeContainer";
import { normalizeQueryFingerprint } from "./primaryStore";
import {
  getStagingEntry,
  listStaging,
  updateStagingStatus,
} from "./secondaryStore";
import {
  createThirdQaId,
  getThirdQaByStagingId,
  upsertThirdQa,
} from "./thirdStore";
import ACTION_MAP_JSON from "../awsConsole/ACTION_MAP.json";

function flattenActionMap(): string[] {
  const families = ACTION_MAP_JSON.ACTION_MAP as Record<string, string[]>;
  return Object.values(families).flat();
}

function isAllowedAction(action: string, codes: string[]): boolean {
  if (!action) return false;
  if (codes.includes(action)) return true;
  return codes.some((pattern) => {
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\{id\\\}/g, "[^:]+")
      .replace(/\\\{value\\\}/g, ".+")
      .replace(/\\\{service\\\}/g, "[a-z0-9-]+");
    return new RegExp(`^${escaped}$`, "i").test(action);
  });
}

function filterActions(actions: string[]): string[] {
  const codes = flattenActionMap();
  return actions.filter((a) => isAllowedAction(a, codes));
}

export function inspectPendingStaging(
  lessonId?: string
): SecondaryStagingEntry[] {
  return listStaging({
    status: "pending_review",
    lesson_id: lessonId,
  });
}

/**
 * Promote a staging entry into the Third Q&A container after human review.
 */
export function promoteStagingToThird(
  req: PromoteRequest
): { ok: true; entry: ThirdQaEntry } | { ok: false; error: string } {
  const staging = getStagingEntry(req.staging_id);
  if (!staging) {
    return { ok: false, error: `Staging entry not found: ${req.staging_id}` };
  }
  if (staging.status === "rejected") {
    return { ok: false, error: "Cannot promote a rejected staging entry." };
  }

  const patterns =
    req.match_patterns.length > 0
      ? req.match_patterns
      : [staging.user_input];

  const existing = getThirdQaByStagingId(staging.id);
  const now = new Date().toISOString();
  const lessonId = (req.lesson_id || staging.lesson_id).toUpperCase();
  const question =
    req.question_canonical?.trim() || staging.user_input.trim();
  const speech =
    req.answer_speech?.trim() || staging.gemini_response_text.trim();

  const entry: ThirdQaEntry = {
    id: existing?.id || createThirdQaId(),
    fingerprint: normalizeQueryFingerprint(question),
    match_patterns: patterns,
    question_canonical: question,
    answer_speech: speech,
    ui_surface: staging.ui_surface,
    actions: filterActions(staging.generated_actions || []),
    board_ops: staging.board_ops ?? null,
    lesson_id: lessonId,
    service_module: null,
    step_id: req.step_id || staging.step_id || null,
    promoted_from_staging_id: staging.id,
    reviewer_note: req.reviewer_note ?? null,
    reviewed_by: req.reviewed_by ?? null,
    status: "active",
    language: staging.language ?? null,
    schema_version: 1,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  upsertThirdQa(entry);
  updateStagingStatus(staging.id, "approved", req.reviewer_note);

  return { ok: true, entry };
}

/**
 * @deprecated Student doubt promotions go to Third. Kept as alias for callers.
 */
export function promoteStagingToPrimary(req: PromoteRequest) {
  const result = promoteStagingToThird(req);
  if (!result.ok) return result;
  return {
    ok: true as const,
    entry: {
      fingerprint: result.entry.fingerprint,
      match_patterns: result.entry.match_patterns,
      response: {
        speech: result.entry.answer_speech,
        ui_surface: result.entry.ui_surface,
        actions: result.entry.actions,
        board_ops: result.entry.board_ops || undefined,
        source: "third" as const,
        staging_id: null,
        qa_id: result.entry.id,
      },
      step_id: result.entry.step_id || undefined,
      promoted_from_staging_id: result.entry.promoted_from_staging_id || undefined,
      updated_at: result.entry.updated_at,
    },
  };
}

export function rejectStaging(
  stagingId: string,
  reviewerNote?: string
): SecondaryStagingEntry | null {
  return updateStagingStatus(stagingId, "rejected", reviewerNote);
}

export function stagingToReviewCard(entry: SecondaryStagingEntry) {
  return {
    id: entry.id,
    lesson_id: entry.lesson_id,
    step_index: entry.step_index,
    user_asked: entry.user_input,
    ren_said: entry.gemini_response_text,
    actions: entry.generated_actions,
    ui_surface: entry.ui_surface,
    status: entry.status,
    created_at: entry.created_at,
    safety_checklist: [
      "Actions are in ACTION_MAP whitelist",
      "No destructive ops outside simulation",
      "Speech matches lesson language policy",
      "Board text (if any) stays English",
      "Promote lands in Third Q&A (not Primary lesson tree)",
    ],
  };
}

/**
 * Secondary Knowledge Container — staging buffer for Gemini-generated paths.
 * Client writes via API; local memory mirrors for offline/dev review.
 */
import type {
  ReviewStatus,
  SecondaryStagingEntry,
  SecondaryStagingInsert,
} from "../../../types/knowledgeContainer";

const memory = new Map<string, SecondaryStagingEntry>();

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `stg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function stageInteraction(
  input: SecondaryStagingInsert
): SecondaryStagingEntry {
  const entry: SecondaryStagingEntry = {
    id: input.id || newId(),
    session_id: input.session_id,
    lesson_id: input.lesson_id.toUpperCase(),
    step_index: input.step_index,
    step_id: input.step_id ?? null,
    user_input: input.user_input,
    gemini_response_text: input.gemini_response_text,
    generated_actions: input.generated_actions || [],
    ui_surface: input.ui_surface,
    board_ops: input.board_ops ?? null,
    status: input.status || "pending_review",
    current_route: input.current_route ?? null,
    language: input.language ?? null,
    user_id: input.user_id ?? null,
    reviewer_note: null,
    reviewed_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  memory.set(entry.id, entry);
  return entry;
}

export function getStagingEntry(id: string): SecondaryStagingEntry | null {
  return memory.get(id) ?? null;
}

export function listStaging(
  filter?: { status?: ReviewStatus; lesson_id?: string }
): SecondaryStagingEntry[] {
  let rows = Array.from(memory.values());
  if (filter?.status) {
    rows = rows.filter((r) => r.status === filter.status);
  }
  if (filter?.lesson_id) {
    const id = filter.lesson_id.toUpperCase();
    rows = rows.filter((r) => r.lesson_id === id);
  }
  return rows.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function updateStagingStatus(
  id: string,
  status: ReviewStatus,
  reviewerNote?: string
): SecondaryStagingEntry | null {
  const entry = memory.get(id);
  if (!entry) return null;
  const next: SecondaryStagingEntry = {
    ...entry,
    status,
    reviewer_note: reviewerNote ?? entry.reviewer_note,
    reviewed_at: nowIso(),
    updated_at: nowIso(),
  };
  memory.set(id, next);
  return next;
}

/** Hydrate memory from a remote list (e.g. after Supabase fetch). */
export function hydrateStagingFromRemote(rows: SecondaryStagingEntry[]): void {
  for (const row of rows) {
    memory.set(row.id, row);
  }
}

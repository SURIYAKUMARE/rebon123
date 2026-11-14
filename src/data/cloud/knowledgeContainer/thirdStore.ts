/**
 * Third Knowledge Container — verified Q&A / doubts store.
 * Human-approved Secondary entries land here permanently.
 */
import type {
  OrchestratorPayload,
  OrchestratorRequest,
  ThirdQaEntry,
  ThirdQaStatus,
} from "../../../types/knowledgeContainer";
import { normalizeQueryFingerprint } from "./primaryStore";

const memory = new Map<string, ThirdQaEntry>();
/** Index: promoted_from_staging_id → third id */
const byStagingId = new Map<string, string>();

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `qa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function upsertThirdQa(entry: ThirdQaEntry): ThirdQaEntry {
  const next: ThirdQaEntry = {
    ...entry,
    lesson_id: entry.lesson_id.toUpperCase(),
    updated_at: nowIso(),
  };
  memory.set(next.id, next);
  if (next.promoted_from_staging_id) {
    byStagingId.set(next.promoted_from_staging_id, next.id);
  }
  return next;
}

export function getThirdQa(id: string): ThirdQaEntry | null {
  return memory.get(id) ?? null;
}

export function getThirdQaByStagingId(
  stagingId: string
): ThirdQaEntry | null {
  const id = byStagingId.get(stagingId);
  return id ? memory.get(id) ?? null : null;
}

export function listThirdQa(filter?: {
  lesson_id?: string;
  status?: ThirdQaStatus;
}): ThirdQaEntry[] {
  let rows = Array.from(memory.values());
  if (filter?.lesson_id) {
    const id = filter.lesson_id.toUpperCase();
    rows = rows.filter((r) => r.lesson_id === id);
  }
  if (filter?.status) {
    rows = rows.filter((r) => r.status === filter.status);
  }
  return rows.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

function patternsMatch(fp: string, patterns: string[]): boolean {
  for (const p of patterns) {
    const pat = normalizeQueryFingerprint(p);
    if (pat.length < 6) continue;
    // Prefer containment of longer pattern in query (or exact-ish equality).
    if (fp === pat) return true;
    if (pat.length >= 8 && fp.includes(pat)) return true;
  }
  return false;
}

/**
 * Lookup verified Q&A for a student query (scoped by lesson).
 */
export function lookupThirdQa(
  req: Pick<OrchestratorRequest, "lesson_id" | "user_input">
): OrchestratorPayload | null {
  const lessonId = req.lesson_id.toUpperCase();
  const fp = normalizeQueryFingerprint(req.user_input);
  if (!fp) return null;

  const candidates = listThirdQa({ lesson_id: lessonId, status: "active" });
  for (const entry of candidates) {
    if (entry.fingerprint === fp) {
      return thirdToPayload(entry);
    }
    if (patternsMatch(fp, entry.match_patterns)) {
      return thirdToPayload(entry);
    }
  }
  return null;
}

export function thirdToPayload(entry: ThirdQaEntry): OrchestratorPayload {
  return {
    speech: entry.answer_speech,
    ui_surface: entry.ui_surface,
    actions: entry.actions,
    board_ops: entry.board_ops || undefined,
    source: "third",
    staging_id: null,
    qa_id: entry.id,
  };
}

export function hydrateThirdFromRemote(rows: ThirdQaEntry[]): void {
  for (const row of rows) {
    upsertThirdQa(row);
  }
}

export function createThirdQaId(): string {
  return newId();
}

/** Test helper — wipe memory. */
export function __resetThirdStoreForTests(): void {
  memory.clear();
  byStagingId.clear();
}

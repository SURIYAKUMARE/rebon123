/**
 * Primary Knowledge Container — production lookup store.
 * Serves cached lesson steps and pre-promoted Q&A / alternate paths.
 */
import type {
  ConsoleActionTag,
  OrchestratorPayload,
  OrchestratorRequest,
  PrimaryKnowledgeRecord,
  PrimaryQueryCacheEntry,
  RoleTrackId,
} from "../../../types/knowledgeContainer";
import { LESSON_PART_MAX_MINUTES } from "../../../types/knowledgeContainer";
import type { ProfessionalLanguage } from "../../../types/professionalMode";
import {
  getProfessionalCurriculum,
  getProfessionalLesson,
} from "../professional_mode";
import ACTION_MAP_JSON from "../awsConsole/ACTION_MAP.json";
import {
  buildPrimaryStepsFromLesson,
  splitStepsIntoParts,
} from "./hydrateSteps";

/** In-memory Primary store keyed by `${LESSON_ID}:${language}`. */
const primaryByLesson = new Map<string, PrimaryKnowledgeRecord>();
const queryIndex = new Map<string, PrimaryQueryCacheEntry[]>();

function flattenActionMap(): ConsoleActionTag[] {
  const families = ACTION_MAP_JSON.ACTION_MAP as Record<string, string[]>;
  return Object.values(families).flat();
}

function storeKey(
  lessonId: string,
  language: ProfessionalLanguage = "english"
): string {
  return `${lessonId.toUpperCase()}:${language}`;
}

/** Normalize student text for fingerprint / pattern matching. */
export function normalizeQueryFingerprint(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function validatePartDuration(minutes: number): boolean {
  return minutes > 0 && minutes <= LESSON_PART_MAX_MINUTES;
}

function roleTracksForLesson(lessonId: string): RoleTrackId[] | undefined {
  const curriculum = getProfessionalCurriculum();
  const id = lessonId.toUpperCase();
  for (const topic of curriculum.topics) {
    const lesson = topic.lessons.find((l) => l.id.toUpperCase() === id);
    if (lesson?.role_tracks?.length) {
      return lesson.role_tracks.filter(
        (t): t is RoleTrackId => t === "l1_cloud_support_associate"
      );
    }
  }
  return undefined;
}

/**
 * Build a Primary record from a Professional lesson file (v2 preferred).
 */
export function hydratePrimaryFromProfessionalLesson(
  lessonId: string,
  language: ProfessionalLanguage = "english"
): PrimaryKnowledgeRecord | null {
  const file = getProfessionalLesson(lessonId, language);
  if (!file) return null;

  const id = file.lesson.toUpperCase();
  const steps = buildPrimaryStepsFromLesson(file);
  const parts = splitStepsIntoParts(
    id,
    file.title,
    file.duration_minutes || 15,
    steps
  );

  const record: PrimaryKnowledgeRecord = {
    metadata: {
      lesson_id: id,
      session: file.session,
      title: file.title,
      language: file.language,
      service_module: inferServiceModule(file.lesson),
      total_duration_minutes: file.duration_minutes,
      part_count: parts.length,
      schema_version: 1,
      tags: [file.environment],
      role_tracks: roleTracksForLesson(id),
    },
    parts,
    query_cache: [],
    allowed_actions: flattenActionMap(),
  };

  registerPrimaryRecord(record);
  return record;
}

function inferServiceModule(
  lessonId: string
): PrimaryKnowledgeRecord["metadata"]["service_module"] {
  const id = lessonId.toUpperCase();
  if (id.startsWith("PM-0")) return "console_intro";
  if (id.startsWith("PM-1")) return "iam";
  if (id.startsWith("PM-2")) return "vpc";
  if (id.startsWith("PM-3")) return "ec2";
  if (id.startsWith("PM-4")) return "s3";
  if (id.startsWith("PM-5")) return "cloudwatch";
  if (id.startsWith("PM-6")) return "cost_explorer";
  return "console_intro";
}

export function registerPrimaryRecord(record: PrimaryKnowledgeRecord): void {
  const key = storeKey(record.metadata.lesson_id, record.metadata.language);
  primaryByLesson.set(key, {
    ...record,
    query_cache: [...record.query_cache],
  });
  queryIndex.set(key, [...record.query_cache]);
}

export function getPrimaryRecord(
  lessonId: string,
  language: ProfessionalLanguage = "english"
): PrimaryKnowledgeRecord | null {
  const key = storeKey(lessonId, language);
  const existing = primaryByLesson.get(key);
  if (existing) return existing;
  return hydratePrimaryFromProfessionalLesson(lessonId, language);
}

export function getPrimaryStep(
  lessonId: string,
  stepIndex: number,
  language: ProfessionalLanguage = "english"
): PrimaryKnowledgeRecord["parts"][0]["steps"][0] | null {
  const record = getPrimaryRecord(lessonId, language);
  if (!record) return null;
  const allSteps = record.parts.flatMap((p) => p.steps);
  return allSteps[stepIndex] ?? null;
}

/**
 * Lookup cached alternate-path / Q&A in the Primary Container.
 * Returns null when the query is unmapped → orchestrator should call Gemini.
 */
export function lookupPrimaryQuery(
  req: OrchestratorRequest
): OrchestratorPayload | null {
  const language = req.language || "english";
  const lessonId = req.lesson_id.toUpperCase();
  getPrimaryRecord(lessonId, language);
  const key = storeKey(lessonId, language);
  const entries = queryIndex.get(key) || [];
  if (!entries.length) return null;

  const fp = normalizeQueryFingerprint(req.user_input);
  if (!fp) return null;

  for (const entry of entries) {
    if (entry.fingerprint === fp) {
      return { ...entry.response, source: "primary", staging_id: null };
    }
    const hit = entry.match_patterns.some((p) => {
      const pat = normalizeQueryFingerprint(p);
      return pat.length >= 3 && (fp.includes(pat) || pat.includes(fp));
    });
    if (hit) {
      return { ...entry.response, source: "primary", staging_id: null };
    }
  }
  return null;
}

/** Insert or replace a promoted Q&A into the Primary query cache. */
export function upsertPrimaryQueryCache(
  lessonId: string,
  entry: PrimaryQueryCacheEntry,
  language: ProfessionalLanguage = "english"
): void {
  const id = lessonId.toUpperCase();
  const record = getPrimaryRecord(id, language);
  if (!record) return;

  const key = storeKey(id, language);
  const list = queryIndex.get(key) || [];
  const next = [...list.filter((e) => e.fingerprint !== entry.fingerprint), entry];
  queryIndex.set(key, next);
  primaryByLesson.set(key, {
    ...record,
    query_cache: next,
  });
}

export function listPrimaryLessonIds(): string[] {
  return Array.from(primaryByLesson.keys());
}

/** Test helper — clear in-memory Primary store. */
export function __resetPrimaryStoreForTests(): void {
  primaryByLesson.clear();
  queryIndex.clear();
}

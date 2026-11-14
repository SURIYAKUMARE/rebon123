/**
 * Three-Tier Knowledge Container — Professional Mode.
 *
 * PRIMARY   = authored lesson trees (topics, steps, vivas, board/console, ACTION_MAP)
 * SECONDARY = staging for Gemini answers to unscripted doubts (pending human review)
 * THIRD     = verified Q&A store — human-approved doubts/alternate paths live here
 *
 * Hard rule: max 25 minutes per lesson part. Longer content → Part 1, Part 2, …
 */

import type {
  ConsoleCursorAction,
  ProfessionalLanguage,
} from "./professionalMode";

/** Hard ceiling per lesson part (minutes). */
export const LESSON_PART_MAX_MINUTES = 25;

/** Job-track ids for Professional Mode career simulation (not CloudRole placement). */
export type RoleTrackId = "l1_cloud_support_associate";

/** UI surface Ren may switch between during a lesson. */
export type RenUiSurface = "BOARD" | "CONSOLE" | "NONE";

/** Whitelisted ACTION_MAP-style tags (NAV:, CLICK:, FILL:, …). */
export type ConsoleActionTag = string;

export type ReviewStatus = "pending_review" | "approved" | "rejected";

export type OrchestrationSource = "primary" | "third" | "gemini_fallback";

export type ThirdQaStatus = "active" | "archived";

/* ─────────────────────────────────────────────────────────────
 * Primary Container — production-ready lesson execution trees
 * ───────────────────────────────────────────────────────────── */

export type BoardOp =
  | { type: "write_heading"; text: string }
  | { type: "write_points"; points: string[] }
  | { type: "write_definition_box"; text: string }
  | { type: "clear" };

export type VivaCheckpoint = {
  id: string;
  prompt_voice: string;
  wait_for_input: true;
  accept_keywords?: string[];
  response_if_correct: string;
  response_if_incorrect: string;
  board_hint?: string;
};

export type PrimaryStepKind =
  | "board_teach"
  | "console_demo"
  | "console_practice"
  | "viva"
  | "quiz"
  | "doubt_gate"
  | "ui_switch";

export type PrimaryExecutionStep = {
  id: string;
  kind: PrimaryStepKind;
  ui_surface: RenUiSurface;
  speech: string | null;
  board_ops?: BoardOp[];
  actions?: ConsoleActionTag[];
  /** Player cursor target (data-console-target); optional for orchestrator path. */
  cursor?: ConsoleCursorAction | null;
  pause_ms?: number;
  viva?: VivaCheckpoint;
  author_note?: string;
};

export type PrimaryLessonPart = {
  part_number: number;
  part_id: string;
  title: string;
  duration_minutes: number;
  steps: PrimaryExecutionStep[];
};

export type PrimaryLessonMetadata = {
  lesson_id: string;
  session: string;
  title: string;
  language: ProfessionalLanguage;
  service_module:
    | "console_intro"
    | "iam"
    | "vpc"
    | "ec2"
    | "s3"
    | "cloudwatch"
    | "cost_explorer";
  total_duration_minutes: number;
  part_count: number;
  schema_version: 1;
  tags?: string[];
  /** Career track(s) this lesson belongs to (from curriculum). */
  role_tracks?: RoleTrackId[];
};

export type PrimaryKnowledgeRecord = {
  metadata: PrimaryLessonMetadata;
  parts: PrimaryLessonPart[];
  /**
   * Author-only alternate paths baked into the lesson (rare).
   * Student doubt promotions land in THIRD, not here.
   */
  query_cache: PrimaryQueryCacheEntry[];
  allowed_actions: ConsoleActionTag[];
};

export type PrimaryQueryCacheEntry = {
  fingerprint: string;
  match_patterns: string[];
  response: OrchestratorPayload;
  step_id?: string;
  promoted_from_staging_id?: string;
  updated_at: string;
};

/* ─────────────────────────────────────────────────────────────
 * Orchestrator I/O
 * ───────────────────────────────────────────────────────────── */

export type OrchestratorPayload = {
  speech: string;
  ui_surface: RenUiSurface;
  actions: ConsoleActionTag[];
  board_ops?: BoardOp[];
  source: OrchestrationSource;
  staging_id?: string | null;
  /** Present when served from Third Q&A. */
  qa_id?: string | null;
};

export type OrchestratorRequest = {
  session_id: string;
  lesson_id: string;
  step_index: number;
  step_id?: string;
  user_input: string;
  current_route: string;
  current_ui: RenUiSurface;
  language?: ProfessionalLanguage;
  cloud_role?: string;
};

export type OrchestratorResult =
  | { ok: true; data: OrchestratorPayload; cache_hit: boolean }
  | { ok: false; error: string; status: number };

/* ─────────────────────────────────────────────────────────────
 * Secondary Container — staging / data flywheel buffer
 * ───────────────────────────────────────────────────────────── */

export type SecondaryStagingEntry = {
  id: string;
  session_id: string;
  lesson_id: string;
  step_index: number;
  step_id?: string | null;
  user_input: string;
  gemini_response_text: string;
  generated_actions: ConsoleActionTag[];
  ui_surface: RenUiSurface;
  board_ops?: BoardOp[] | null;
  status: ReviewStatus;
  current_route?: string | null;
  language?: ProfessionalLanguage | null;
  user_id?: string | null;
  reviewer_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string;
};

export type SecondaryStagingInsert = Omit<
  SecondaryStagingEntry,
  "id" | "created_at" | "updated_at" | "reviewed_at" | "reviewer_note"
> & {
  id?: string;
  status?: ReviewStatus;
};

/* ─────────────────────────────────────────────────────────────
 * Third Container — verified Questions & Answers
 * ───────────────────────────────────────────────────────────── */

export type ThirdQaEntry = {
  id: string;
  fingerprint: string;
  match_patterns: string[];
  /** Reviewer-edited canonical question text. */
  question_canonical: string;
  answer_speech: string;
  ui_surface: RenUiSurface;
  actions: ConsoleActionTag[];
  board_ops?: BoardOp[] | null;
  lesson_id: string;
  service_module?: PrimaryLessonMetadata["service_module"] | null;
  step_id?: string | null;
  promoted_from_staging_id?: string | null;
  reviewer_note?: string | null;
  reviewed_by?: string | null;
  status: ThirdQaStatus;
  language?: ProfessionalLanguage | null;
  schema_version: 1;
  created_at: string;
  updated_at: string;
};

export type PromoteRequest = {
  staging_id: string;
  lesson_id: string;
  match_patterns: string[];
  step_id?: string;
  reviewer_note?: string;
  /** Optional override of Gemini speech after human edit. */
  answer_speech?: string;
  question_canonical?: string;
  reviewed_by?: string;
};

/**
 * MVP Learning schemas — design contract (Student + Professional).
 * Phase 0 LOCKED — see docs/learning/PHASE0_FOUNDER_DECISIONS.md
 *
 * Teaching bar: Principal Mentor L5 (Ren — ex-MNC cloud engineer turned teacher).
 * See: docs/learning/MVP_LEARNING_ARCHITECTURE.md
 */

export type TeachLanguage = "english" | "tanglish";

/** Ren’s teaching bar — every authored lesson targets this level. */
export type RenTeachingLevel = "principal_mentor_l5";

export type RenPersonaConfig = {
  name: "Ren";
  teaching_level: RenTeachingLevel;
  energy: "high";
  background: "ex_mnc_cloud_principal_turned_teacher";
  voice_final_engine: "gemini_tts";
  languages: TeachLanguage[];
};

/** Mandatory pedagogy — every Student + Pro (v3) lesson must cover all six. */
export type PedagogyBlockId =
  | "why_before_how"
  | "mental_model"
  | "company_story"
  | "mistake_or_trap"
  | "check"
  | "practical_habit";

export const REQUIRED_PEDAGOGY_BLOCKS: PedagogyBlockId[] = [
  "why_before_how",
  "mental_model",
  "company_story",
  "mistake_or_trap",
  "check",
  "practical_habit",
];

export type PedagogyCheck = {
  ren_voice: string;
  accept_keywords?: string[];
  response_if_correct: string;
  response_if_incorrect: string;
};

export type PedagogyBoardBeat = {
  board_text: string;
  ren_voice: string;
};

export type PedagogyBundle = {
  why_before_how: PedagogyBoardBeat;
  mental_model: PedagogyBoardBeat;
  company_story: PedagogyBoardBeat;
  mistake_or_trap: PedagogyBoardBeat;
  check: PedagogyCheck;
  practical_habit: PedagogyBoardBeat;
};

// ─── Student Mode ───────────────────────────────────────────────────────────

export type StudentLessonV1 = {
  schema_version: 1;
  mode: "student";
  lesson_id: string;
  unit: string;
  lesson_title: string;
  language: TeachLanguage;
  duration_minutes: number;
  /** Student Mode never requires the AWS console. */
  console_required: false;
  ren: {
    teaching_level: RenTeachingLevel;
    energy: "high";
  };
  pedagogy: PedagogyBundle;
  session_close: {
    ren_voice: string;
    summary_points: string[];
  };
  /** Path A clip URLs after Gemini prerender (optional until generated). */
  voice_assets?: Record<string, string>;
};

export type StudentLessonOutline = {
  id: string;
  title: string;
  duration_minutes: number;
};

export type StudentUnitPlan = {
  unit_id: string;
  title: string;
  focus: string;
  lessons: StudentLessonOutline[];
};

/** MVP Student track — 10 lessons / ~2.5h (founder: max 10, avoid theory boredom) */
export const STUDENT_MVP_UNITS: StudentUnitPlan[] = [
  {
    unit_id: "SM-A",
    title: "Cloud literacy",
    focus: "What/why/how cloud + shared responsibility + service map",
    lessons: [
      { id: "SM-D1", title: "Meet Ren — What Cloud Really Is", duration_minutes: 14 },
      { id: "SM-D2", title: "Why Companies Pay for Cloud", duration_minutes: 14 },
      { id: "SM-D3", title: "How Cloud Helps — Elasticity & Regions", duration_minutes: 14 },
      { id: "SM-D4", title: "Shared Responsibility — Who Fixes What", duration_minutes: 13 },
      { id: "SM-D5", title: "Service Families Map", duration_minutes: 15 },
    ],
  },
  {
    unit_id: "SM-B",
    title: "Families + Finova + readiness",
    focus: "Identity/compute/storage/network/observe + company lens + gate",
    lessons: [
      { id: "SM-D6", title: "Identity & Compute — Why They Exist", duration_minutes: 14 },
      { id: "SM-D7", title: "Storage & Network — Why They Exist", duration_minutes: 14 },
      { id: "SM-D8", title: "Observe — Why Monitoring Exists", duration_minutes: 13 },
      { id: "SM-D9", title: "Finova Company Lens", duration_minutes: 14 },
      { id: "SM-D10", title: "Capstone — Ready for Professional Mode", duration_minutes: 15 },
    ],
  },
];

export const STUDENT_MVP_LESSON_COUNT = STUDENT_MVP_UNITS.reduce(
  (n, u) => n + u.lessons.length,
  0
);

// ─── Professional Mode roles ────────────────────────────────────────────────

export type MvpService =
  | "console"
  | "iam"
  | "cloudwatch"
  | "ec2"
  | "s3"
  | "vpc";

export type ProfessionalRoleId =
  | "l1_cloud_support_associate"
  | "l2_cloud_operations"
  | "cloud_engineer"
  | "senior_cloud_engineer"
  | "cloud_architect_track";

export type ProfessionalRole = {
  role_id: ProfessionalRoleId;
  title: string;
  order: number;
  company_frame: "Finova Technologies";
  entry_speech: string;
  must_know: string[];
  services: MvpService[];
  lesson_id_prefix: string[];
  mastery_gate: {
    min_lessons_complete: number;
    promotion_review_threshold: number;
  };
  next_role_id: ProfessionalRoleId | null;
  launch_status: "live" | "teaser";
};

export const PROFESSIONAL_MVP_ROLES: ProfessionalRole[] = [
  {
    role_id: "l1_cloud_support_associate",
    title: "Cloud Support Associate (L1)",
    order: 1,
    company_frame: "Finova Technologies",
    entry_speech:
      "You are joining Finova as Cloud Support Associate L1. Tickets, Access Denied, dashboards — I will teach you like your desk mentor.",
    must_know: [
      "Console literacy (region, account, search)",
      "IAM read + Access Denied triage",
      "CloudWatch alarms/dashboards basics",
    ],
    services: ["console", "iam", "cloudwatch"],
    lesson_id_prefix: ["PM-0", "PM-1", "PM-5"],
    mastery_gate: { min_lessons_complete: 8, promotion_review_threshold: 0.75 },
    next_role_id: "l2_cloud_operations",
    launch_status: "live",
  },
  {
    role_id: "l2_cloud_operations",
    title: "Cloud Operations Associate",
    order: 2,
    company_frame: "Finova Technologies",
    entry_speech:
      "Promotion: Operations desk. Deeper incidents on compute and storage — still tickets, higher judgment.",
    must_know: ["EC2 day-2 triage", "S3 access/security incidents", "Stronger CloudWatch"],
    services: ["console", "iam", "cloudwatch", "ec2", "s3"],
    lesson_id_prefix: ["PM-3", "PM-4"],
    mastery_gate: { min_lessons_complete: 6, promotion_review_threshold: 0.75 },
    next_role_id: "cloud_engineer",
    launch_status: "live",
  },
  {
    role_id: "cloud_engineer",
    title: "Cloud Engineer",
    order: 3,
    company_frame: "Finova Technologies",
    entry_speech:
      "You build and harden. VPC, launch correctly, load and scale — design with consequences.",
    must_know: ["VPC building blocks", "EC2 launch + ASG/ALB basics", "S3 lifecycle"],
    services: ["vpc", "ec2", "s3", "iam", "cloudwatch"],
    lesson_id_prefix: ["PM-2", "PM-3", "PM-4"],
    mastery_gate: { min_lessons_complete: 8, promotion_review_threshold: 0.75 },
    next_role_id: "senior_cloud_engineer",
    launch_status: "live",
  },
  {
    role_id: "senior_cloud_engineer",
    title: "Senior Cloud Engineer",
    order: 4,
    company_frame: "Finova Technologies",
    entry_speech:
      "Judgment role: cost, reliability, multi-account — you mentor L1s on the desk.",
    must_know: ["Cost awareness", "Cross-service incident command", "Least privilege at scale"],
    services: ["console", "iam", "cloudwatch", "ec2", "s3", "vpc"],
    lesson_id_prefix: ["PM-6"],
    mastery_gate: { min_lessons_complete: 4, promotion_review_threshold: 0.75 },
    next_role_id: "cloud_architect_track",
    launch_status: "teaser",
  },
  {
    role_id: "cloud_architect_track",
    title: "Cloud Architect (track)",
    order: 5,
    company_frame: "Finova Technologies",
    entry_speech:
      "Systems thinking across Finova’s estate. Stretch track — outline in MVP, deepen post-MVP.",
    must_know: ["End-to-end designs", "Trade-off communication"],
    services: ["console", "iam", "cloudwatch", "ec2", "s3", "vpc"],
    lesson_id_prefix: [],
    mastery_gate: { min_lessons_complete: 0, promotion_review_threshold: 0.75 },
    next_role_id: null,
    launch_status: "teaser",
  },
];

/** Six services — Professional MVP ceiling (Phase 0: VPC locked as #6) */
export const PROFESSIONAL_MVP_SERVICES: readonly MvpService[] = [
  "console",
  "iam",
  "cloudwatch",
  "ec2",
  "s3",
  "vpc",
] as const;

/** Professional lesson meta extensions (v2 runtime + v3 pedagogy tags) */
export type ProfessionalLessonMeta = {
  schema_version: 2 | 3;
  mode: "professional";
  role_tracks: ProfessionalRoleId[];
  role_order: number;
  teaching_level: RenTeachingLevel;
  pedagogy_tags: PedagogyBlockId[];
  /** Explicit pedagogy bundle required when schema_version === 3 */
  pedagogy?: PedagogyBundle;
};

// ─── Progression gates (Phase 0 locked) ─────────────────────────────────────

export type ProgressionGateId = "G0" | "G1" | "G2" | "G3" | "G4";

export const PROGRESSION_GATES = {
  G0: "Placement picks default mode; Student always open",
  G1: "Student Units 1–6 + Readiness ≥70% → Finova hire → Professional",
  G2: "Within-role lesson unlock by role_order",
  G3: "Role complete + Promotion Review ≥75% → next role",
  G4: "Strong placement (cloud_engineer) may test-out of R1",
} as const;

export type ProgressStorage = "local_only";

export const MVP_PROGRESS_STORAGE: ProgressStorage = "local_only";

// ─── Voice manifest (Path A) ────────────────────────────────────────────────

export type VoiceManifestV1Clip = {
  hash: string;
  url: string;
  text: string;
};

/** v1 — text-hash keyed (PM-0.1 English already shipped) */
export type VoiceManifestV1 = {
  schema_version: 1;
  lesson_id: string;
  language: TeachLanguage;
  clips: VoiceManifestV1Clip[];
};

export type VoiceManifestV2Clip = {
  line_id: string;
  voice_profile: string;
  hash: string;
  url: string;
  text: string;
  duration_ms?: number;
};

/** v2 — line_id + voice_profile; keep v1 hash fallback for legacy clips */
export type VoiceManifestV2 = {
  schema_version: 2;
  lesson_id: string;
  language: TeachLanguage;
  engine: "gemini_tts" | "edge_tts" | "local";
  coverage: { required_line_ids: string[]; missing_line_ids: string[] };
  clips: VoiceManifestV2Clip[];
};

// ─── Publish validator ──────────────────────────────────────────────────────

export type PedagogyValidationResult = {
  ok: boolean;
  missing: PedagogyBlockId[];
  severity: "error" | "warn";
};

function beatPresent(beat: PedagogyBoardBeat | undefined): boolean {
  return Boolean(beat?.board_text?.trim() && beat?.ren_voice?.trim());
}

function checkPresent(check: PedagogyCheck | undefined): boolean {
  return Boolean(
    check?.ren_voice?.trim() &&
      check?.response_if_correct?.trim() &&
      check?.response_if_incorrect?.trim()
  );
}

/** Refuse Gemini render / publish when pedagogy incomplete (v3 = error, legacy v2 = warn). */
export function validatePedagogyBundle(
  pedagogy: Partial<PedagogyBundle> | undefined,
  opts: { schema: "student_v1" | "pro_v2" | "pro_v3" }
): PedagogyValidationResult {
  const missing: PedagogyBlockId[] = [];
  if (!beatPresent(pedagogy?.why_before_how)) missing.push("why_before_how");
  if (!beatPresent(pedagogy?.mental_model)) missing.push("mental_model");
  if (!beatPresent(pedagogy?.company_story)) missing.push("company_story");
  if (!beatPresent(pedagogy?.mistake_or_trap)) missing.push("mistake_or_trap");
  if (!checkPresent(pedagogy?.check)) missing.push("check");
  if (!beatPresent(pedagogy?.practical_habit)) missing.push("practical_habit");

  const ok = missing.length === 0;
  // student_v1 + pro_v3 → error when missing; legacy pro_v2 → warn only
  if (opts.schema === "pro_v2") {
    return { ok, missing, severity: "warn" };
  }
  return { ok, missing, severity: ok ? "warn" : "error" };
}

export function validateStudentLessonV1(
  lesson: StudentLessonV1
): PedagogyValidationResult {
  if (lesson.console_required !== false) {
    return {
      ok: false,
      missing: REQUIRED_PEDAGOGY_BLOCKS,
      severity: "error",
    };
  }
  return validatePedagogyBundle(lesson.pedagogy, { schema: "student_v1" });
}

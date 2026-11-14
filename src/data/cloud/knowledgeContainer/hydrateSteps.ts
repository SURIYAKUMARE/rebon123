/**
 * Convert a normalized ProfessionalLessonFile into Primary execution steps.
 */
import type {
  BoardOp,
  ConsoleActionTag,
  PrimaryExecutionStep,
  PrimaryLessonPart,
  VivaCheckpoint,
} from "../../../types/knowledgeContainer";
import { LESSON_PART_MAX_MINUTES } from "../../../types/knowledgeContainer";
import type {
  ConsoleCursorAction,
  ConsoleSegment,
  ProfessionalLessonFile,
  SegmentCheck,
} from "../../../types/professionalMode";
import ACTION_MAP_JSON from "../awsConsole/ACTION_MAP.json";

const ALLOWED = new Set(
  Object.values(ACTION_MAP_JSON.ACTION_MAP as Record<string, string[]>).flat()
);

/** Cursor navigate targets → ACTION_MAP NAV codes. */
const NAV_FROM_TARGET: Record<string, string> = {
  "nav-users": "NAV:iam-users",
  "nav-groups": "NAV:iam-groups",
  "nav-roles": "NAV:iam-roles",
  "nav-policies": "NAV:iam-policies",
  "create-user": "NAV:iam-create-user",
  "iam-create-user": "NAV:iam-create-user",
  "iam-create-user-btn": "NAV:iam-create-user",
  "service-iam": "NAV:iam-users",
  "service-ec2": "NAV:ec2-instances",
  "service-s3": "NAV:s3-buckets",
  "service-vpc": "NAV:vpc-vpcs",
  "service-cloudwatch": "NAV:cw-dashboards",
  "cw-dashboards": "NAV:cw-dashboards",
  "cw-alarms": "NAV:cw-alarms",
  "cw-metrics": "NAV:cw-metrics",
  "cw-log-groups": "NAV:cw-log-groups",
  "cw-logs-insights": "NAV:cw-logs-insights",
  "cw-create-alarm": "NAV:cw-create-alarm",
  "ec2-instances-list": "NAV:ec2-instances",
  "console-home": "NAV:console-home",
};

function whitelistActions(tags: ConsoleActionTag[]): ConsoleActionTag[] {
  return tags.filter((t) => {
    if (ALLOWED.has(t)) return true;
    // Template patterns already expanded in ACTION_MAP as literals where needed
    const ok = [...ALLOWED].some((pattern) => {
      if (!pattern.includes("{")) return false;
      const escaped = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\{id\\\}/g, "[^:]+")
        .replace(/\\\{value\\\}/g, ".+")
        .replace(/\\\{service\\\}/g, "[a-z0-9-]+");
      return new RegExp(`^${escaped}$`, "i").test(t);
    });
    if (!ok && typeof process !== "undefined" && process.env?.DEBUG_HYDRATE === "1") {
      console.warn(`[hydrateSteps] dropped unknown action: ${t}`);
    }
    return ok;
  });
}

export function cursorToActions(
  cursor: ConsoleCursorAction | null | undefined
): ConsoleActionTag[] {
  if (!cursor?.target) return [];
  const target = cursor.target.trim().toLowerCase();
  const tags: ConsoleActionTag[] = [];

  if (cursor.action === "navigate" || cursor.action === "navigate_to_url") {
    const nav = NAV_FROM_TARGET[target];
    if (nav) tags.push(nav);
  } else if (cursor.action === "highlight" || cursor.action === "hover") {
    tags.push(`HIGHLIGHT:${target}` as ConsoleActionTag);
  } else if (cursor.action === "click") {
    // Prefer known CLICK codes; else HIGHLIGHT for teachable targets
    const clickCode = `CLICK:${target}`;
    if (ALLOWED.has(clickCode) || target.startsWith("btn-")) {
      tags.push(clickCode as ConsoleActionTag);
    } else if (NAV_FROM_TARGET[target]) {
      tags.push(NAV_FROM_TARGET[target]);
    } else {
      tags.push(`HIGHLIGHT:${target}` as ConsoleActionTag);
    }
  }

  return whitelistActions(tags);
}

/** Split board_text into heading + bullet points. */
export function boardTextToOps(boardText: string, headingFallback?: string): BoardOp[] {
  const lines = boardText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    return headingFallback
      ? [{ type: "write_heading", text: headingFallback }]
      : [];
  }

  const ops: BoardOp[] = [];
  const heading = lines[0].replace(/^•\s*/, "");
  ops.push({ type: "write_heading", text: heading });

  const points = lines
    .slice(1)
    .map((l) => l.replace(/^•\s*/, "").trim())
    .filter(Boolean);
  if (points.length) {
    ops.push({ type: "write_points", points });
  }
  return ops;
}

function checkToViva(id: string, check: SegmentCheck): VivaCheckpoint {
  return {
    id,
    prompt_voice: check.voice,
    wait_for_input: true,
    accept_keywords: check.accept_keywords,
    response_if_correct: check.response_if_correct,
    response_if_incorrect: check.response_if_incorrect,
  };
}

function pushUiSwitch(
  steps: PrimaryExecutionStep[],
  from: PrimaryExecutionStep["ui_surface"] | null,
  to: PrimaryExecutionStep["ui_surface"],
  id: string
): PrimaryExecutionStep["ui_surface"] {
  if (from && from !== to && to !== "NONE") {
    steps.push({
      id: `${id}-ui-switch`,
      kind: "ui_switch",
      ui_surface: to,
      speech: null,
      pause_ms: 200,
    });
  }
  return to;
}

/** Build flat Primary steps from a professional lesson file. */
export function buildPrimaryStepsFromLesson(
  file: ProfessionalLessonFile
): PrimaryExecutionStep[] {
  const steps: PrimaryExecutionStep[] = [];
  let surface: PrimaryExecutionStep["ui_surface"] | null = null;
  const lesson = file.lesson.toUpperCase();

  if (file.lesson_intro) {
    surface = pushUiSwitch(steps, surface, "BOARD", `${lesson}-intro`);
    steps.push({
      id: `${lesson}-lesson-intro`,
      kind: "board_teach",
      ui_surface: "BOARD",
      speech: file.lesson_intro.ren_voice || null,
      board_ops: boardTextToOps(
        file.lesson_intro.board_text,
        file.lesson_intro.heading || file.title
      ),
      pause_ms: 600,
    });
  }

  if (file.whiteboard_intro) {
    surface = pushUiSwitch(steps, surface, "BOARD", `${lesson}-wb`);
    steps.push({
      id: `${lesson}-whiteboard-intro`,
      kind: "board_teach",
      ui_surface: "BOARD",
      speech: file.whiteboard_intro.ren_voice || null,
      board_ops: boardTextToOps(file.whiteboard_intro.board_text),
      pause_ms: 500,
    });
  }

  const segments = file.segments || [];
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    emitSegmentSteps(steps, seg, lesson, si, () => {
      surface = pushUiSwitch(steps, surface, "CONSOLE", `${lesson}-s${si}`);
      return surface;
    });
  }

  const close = file.session_close;
  if (close?.ren_voice || close?.summary_points?.length) {
    surface = pushUiSwitch(steps, surface, "BOARD", `${lesson}-close`);
    const points = close.summary_points || [];
    const board_ops: BoardOp[] = [
      { type: "write_heading", text: "Session close" },
    ];
    if (points.length) board_ops.push({ type: "write_points", points });
    steps.push({
      id: `${lesson}-session-close`,
      kind: "board_teach",
      ui_surface: "BOARD",
      speech: close.ren_voice || null,
      board_ops,
      pause_ms: 500,
    });
  }

  if (close?.doubt_session) {
    steps.push({
      id: `${lesson}-doubt-gate`,
      kind: "doubt_gate",
      ui_surface: "NONE",
      speech: close.doubt_session.ren_opening || null,
      pause_ms: 400,
      author_note: close.doubt_session.ren_response_template,
    });
  }

  return steps;
}

function emitSegmentSteps(
  steps: PrimaryExecutionStep[],
  seg: ConsoleSegment,
  lesson: string,
  si: number,
  ensureConsole: () => void
): void {
  const segId = ("id" in seg && seg.id ? String(seg.id) : `S${si + 1}`);

  if (seg.type === "demonstrate") {
    if (seg.setup_voice) {
      ensureConsole();
      steps.push({
        id: `${segId}-setup`,
        kind: "console_demo",
        ui_surface: "CONSOLE",
        speech: seg.setup_voice,
        actions: [],
        pause_ms: 400,
      });
    }
    seg.steps.forEach((ls, i) => {
      ensureConsole();
      steps.push({
        id: `${segId}-step-${i + 1}`,
        kind: "console_demo",
        ui_surface: "CONSOLE",
        speech: ls.voice,
        cursor: ls.cursor,
        actions: cursorToActions(ls.cursor),
        pause_ms: ls.pause_ms ?? 500,
      });
    });
    if (seg.lesson_voice) {
      steps.push({
        id: `${segId}-lesson-voice`,
        kind: "console_demo",
        ui_surface: "CONSOLE",
        speech: seg.lesson_voice,
        actions: [],
        pause_ms: 400,
      });
    }
    if (seg.check) {
      steps.push({
        id: `${segId}-check`,
        kind: "viva",
        ui_surface: "CONSOLE",
        speech: seg.check.voice,
        viva: checkToViva(`${segId}-check`, seg.check),
        pause_ms: 300,
      });
    }
    return;
  }

  if (seg.type === "teach") {
    seg.steps.forEach((ls, i) => {
      ensureConsole();
      steps.push({
        id: `${segId}-step-${i + 1}`,
        kind: "console_demo",
        ui_surface: "CONSOLE",
        speech: ls.voice,
        cursor: ls.cursor,
        actions: cursorToActions(ls.cursor),
        pause_ms: ls.pause_ms ?? 500,
      });
    });
    if (seg.check) {
      steps.push({
        id: `${segId}-check`,
        kind: "viva",
        ui_surface: "CONSOLE",
        speech: seg.check.voice,
        viva: checkToViva(`${segId}-check`, seg.check),
        pause_ms: 300,
      });
    }
    return;
  }

  if (seg.type === "practice") {
    ensureConsole();
    const cursor: ConsoleCursorAction = {
      action: "navigate",
      target: seg.target,
    };
    steps.push({
      id: `${segId}-practice`,
      kind: "console_practice",
      ui_surface: "CONSOLE",
      speech: seg.instruction_voice,
      cursor,
      actions: cursorToActions(cursor),
      pause_ms: 400,
    });
    return;
  }

  if (seg.type === "ask") {
    steps.push({
      id: `${segId}-ask`,
      kind: "viva",
      ui_surface: surfaceForAsk(steps),
      speech: seg.voice || seg.question,
      viva: {
        id: `${segId}-ask`,
        prompt_voice: seg.question,
        wait_for_input: true,
        accept_keywords: seg.accept_keywords,
        response_if_correct: seg.response_if_correct,
        response_if_incorrect: seg.response_if_incorrect,
      },
      pause_ms: 300,
    });
  }
}

function surfaceForAsk(
  steps: PrimaryExecutionStep[]
): PrimaryExecutionStep["ui_surface"] {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].ui_surface !== "NONE") return steps[i].ui_surface;
  }
  return "BOARD";
}

/**
 * Split flat steps into parts of ≤ LESSON_PART_MAX_MINUTES.
 * Weighted by pause_ms + speech length; CSA lessons stay one part.
 */
export function splitStepsIntoParts(
  lessonId: string,
  title: string,
  totalMinutes: number,
  steps: PrimaryExecutionStep[]
): PrimaryLessonPart[] {
  if (totalMinutes <= LESSON_PART_MAX_MINUTES || steps.length === 0) {
    return [
      {
        part_number: 1,
        part_id: `${lessonId}-P1`,
        title,
        duration_minutes: Math.min(
          Math.max(totalMinutes, 1),
          LESSON_PART_MAX_MINUTES
        ),
        steps,
      },
    ];
  }

  const partCount = Math.ceil(totalMinutes / LESSON_PART_MAX_MINUTES);
  const chunk = Math.ceil(steps.length / partCount);
  const parts: PrimaryLessonPart[] = [];
  for (let i = 0; i < partCount; i++) {
    const slice = steps.slice(i * chunk, (i + 1) * chunk);
    if (!slice.length) continue;
    parts.push({
      part_number: i + 1,
      part_id: `${lessonId}-P${i + 1}`,
      title: `${title} — Part ${i + 1}`,
      duration_minutes: Math.min(
        LESSON_PART_MAX_MINUTES,
        Math.ceil(totalMinutes / partCount)
      ),
      steps: slice,
    });
  }
  return parts.length
    ? parts
    : [
        {
          part_number: 1,
          part_id: `${lessonId}-P1`,
          title,
          duration_minutes: Math.min(totalMinutes, LESSON_PART_MAX_MINUTES),
          steps,
        },
      ];
}

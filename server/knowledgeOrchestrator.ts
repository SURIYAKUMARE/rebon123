/**
 * Knowledge Orchestrator — Primary → Third Q&A → Gemini → Secondary staging.
 * Server-side (Vite middleware + Vercel /api/knowledge).
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import ACTION_MAP_JSON from "../src/data/cloud/awsConsole/ACTION_MAP.json";
import type {
  BoardOp,
  ConsoleActionTag,
  OrchestratorPayload,
  OrchestratorRequest,
  OrchestratorResult,
  RenUiSurface,
} from "../src/types/knowledgeContainer";

const ALLOWED_MODEL = "gemini-3.6-flash";

const BoardOpSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("write_heading"), text: z.string() }),
  z.object({
    type: z.literal("write_points"),
    points: z.array(z.string()),
  }),
  z.object({ type: z.literal("write_definition_box"), text: z.string() }),
  z.object({ type: z.literal("clear") }),
]);

const GeminiPayloadSchema = z.object({
  speech: z.string().min(1).max(2_500),
  ui_surface: z.enum(["BOARD", "CONSOLE", "NONE"]),
  actions: z.array(z.string().min(1).max(200)).max(12),
  board_ops: z.array(BoardOpSchema).max(8).optional(),
});

/** In-process Primary query cache (server). Mirrors client promotions via body.cache_hints. */
type ServerCacheEntry = {
  lesson_id: string;
  fingerprint: string;
  match_patterns: string[];
  response: Omit<OrchestratorPayload, "source" | "staging_id">;
};

const serverQueryCache: ServerCacheEntry[] = [];

/** Staging buffer on the server (also returned to client for Supabase sync). */
export type ServerStagingRow = {
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
  status: "pending_review";
  current_route?: string | null;
  language?: string | null;
  created_at: string;
};

const serverStaging: ServerStagingRow[] = [];

/** Verified Third Q&A cache on the server (seeded via promote API + client hints). */
type ServerThirdEntry = {
  id: string;
  lesson_id: string;
  fingerprint: string;
  match_patterns: string[];
  question_canonical: string;
  answer_speech: string;
  ui_surface: RenUiSurface;
  actions: ConsoleActionTag[];
  board_ops?: BoardOp[] | null;
};

const serverThirdQa: ServerThirdEntry[] = [];

function flattenActionMapCodes(): string[] {
  const families = ACTION_MAP_JSON.ACTION_MAP as Record<string, string[]>;
  return Object.values(families).flat();
}

function normalizeFp(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
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

function filterActions(actions: string[], codes: string[]): ConsoleActionTag[] {
  return actions.filter((a) => isAllowedAction(a, codes));
}

function lookupServerCache(
  lessonId: string,
  userInput: string
): OrchestratorPayload | null {
  const fp = normalizeFp(userInput);
  const id = lessonId.toUpperCase();
  for (const entry of serverQueryCache) {
    if (entry.lesson_id !== id) continue;
    if (entry.fingerprint === fp) {
      return { ...entry.response, source: "primary", staging_id: null };
    }
    const hit = entry.match_patterns.some((p) => {
      const pat = normalizeFp(p);
      return pat.length >= 3 && (fp.includes(pat) || pat.includes(fp));
    });
    if (hit) {
      return { ...entry.response, source: "primary", staging_id: null };
    }
  }
  return null;
}

export function seedServerPrimaryCache(entry: ServerCacheEntry): void {
  const next = serverQueryCache.filter(
    (e) =>
      !(
        e.lesson_id === entry.lesson_id &&
        e.fingerprint === entry.fingerprint
      )
  );
  next.push(entry);
  serverQueryCache.length = 0;
  serverQueryCache.push(...next);
}

export function seedServerThirdQa(entry: ServerThirdEntry): void {
  const next = serverThirdQa.filter((e) => e.id !== entry.id);
  // Also replace by staging/fingerprint+lesson
  const filtered = next.filter(
    (e) =>
      !(
        e.lesson_id === entry.lesson_id &&
        e.fingerprint === entry.fingerprint
      )
  );
  filtered.push(entry);
  serverThirdQa.length = 0;
  serverThirdQa.push(...filtered);
}

function lookupServerThird(
  lessonId: string,
  userInput: string
): OrchestratorPayload | null {
  const fp = normalizeFp(userInput);
  const id = lessonId.toUpperCase();
  for (const entry of serverThirdQa) {
    if (entry.lesson_id !== id) continue;
    if (entry.fingerprint === fp) {
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
    const hit = entry.match_patterns.some((p) => {
      const pat = normalizeFp(p);
      if (pat.length < 6) return false;
      if (fp === pat) return true;
      return pat.length >= 8 && fp.includes(pat);
    });
    if (hit) {
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
  }
  return null;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*"speech"[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function buildSystemPrompt(actionCodes: string[]): string {
  return `You are Ren — energetic Cloud Architect mentor teaching AWS on the REBON platform.

PERSONA:
- Senior cloud expertise, peer warmth, concise (2–5 sentences in speech).
- No markdown, no bullet lists in speech, no code fences.

TWO SURFACES:
- BOARD = theory / diagrams on the whiteboard (board_ops text MUST be English).
- CONSOLE = interactive AWS console clone (emit ACTION_MAP codes).
- NONE = speech only, no UI change.

OUTPUT — JSON only, schema:
{
  "speech": "string",
  "ui_surface": "BOARD" | "CONSOLE" | "NONE",
  "actions": ["NAV:...", "CLICK:...", ...],
  "board_ops": [ { "type": "write_heading", "text": "..." }, ... ]
}

RULES:
- actions must be empty OR only codes from ACTION_MAP below.
- Prefer CONSOLE + actions when demonstrating how-to; BOARD for concepts.
- If unsure of a UI path, set actions to [] and explain in speech.
- Never invent ACTION codes.

ACTION_MAP:
${actionCodes.map((c) => `- ${c}`).join("\n")}`;
}

function newStagingId(): string {
  return `stg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export type KnowledgeOrchestratorBody = OrchestratorRequest & {
  /** Optional Primary author cache hints from the client. */
  cache_hints?: Array<{
    fingerprint: string;
    match_patterns: string[];
    speech: string;
    ui_surface: RenUiSurface;
    actions: string[];
    board_ops?: BoardOp[];
  }>;
  /** Optional Third Q&A hints (verified answers mirrored from client). */
  third_hints?: Array<{
    id: string;
    fingerprint: string;
    match_patterns: string[];
    question_canonical?: string;
    answer_speech: string;
    ui_surface: RenUiSurface;
    actions: string[];
    board_ops?: BoardOp[] | null;
  }>;
};

export async function handleKnowledgeOrchestrator(
  body: KnowledgeOrchestratorBody,
  apiKey: string
): Promise<OrchestratorResult & { staging?: ServerStagingRow }> {
  const userInput =
    typeof body.user_input === "string" ? body.user_input.trim() : "";
  const lessonId =
    typeof body.lesson_id === "string" ? body.lesson_id.trim().toUpperCase() : "";
  const sessionId =
    typeof body.session_id === "string" ? body.session_id.trim() : "";

  if (!userInput || userInput.length > 4_000) {
    return {
      ok: false,
      error: "user_input must be a non-empty string (max 4000 chars).",
      status: 400,
    };
  }
  if (!lessonId || !sessionId) {
    return {
      ok: false,
      error: "session_id and lesson_id are required.",
      status: 400,
    };
  }

  // Client already resolves Primary/Third locally before calling this API.
  // Do NOT seed shared in-process caches from request body (cache poisoning).

  // 1) Primary author cache (server-seeded only via install / author tools)
  const primaryHit = lookupServerCache(lessonId, userInput);
  if (primaryHit) {
    return { ok: true, data: primaryHit, cache_hit: true };
  }

  // 2) Third verified Q&A (server-seeded only via promote API)
  const thirdHit = lookupServerThird(lessonId, userInput);
  if (thirdHit) {
    return { ok: true, data: thirdHit, cache_hit: true };
  }

  if (!apiKey) {
    return {
      ok: false,
      error: "GEMINI_API_KEY is not configured on the server.",
      status: 503,
    };
  }

  const actionCodes = flattenActionMapCodes();
  const stepIndex =
    typeof body.step_index === "number" && Number.isFinite(body.step_index)
      ? body.step_index
      : 0;
  const currentRoute =
    typeof body.current_route === "string" ? body.current_route : "unknown";
  const currentUi = body.current_ui || "CONSOLE";
  const language = body.language || "english";

  const userPrompt = `Lesson: ${lessonId}
Step index: ${stepIndex}
Step id: ${body.step_id || "n/a"}
Current UI surface: ${currentUi}
Current console route: ${currentRoute}
Student language preference: ${language}
Cloud role: ${body.cloud_role || "unknown"}

Student query / alternate-path request (PRIMARY + THIRD MISS — synthesize carefully):
${userInput}

Reply with JSON only.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: ALLOWED_MODEL,
      systemInstruction: buildSystemPrompt(actionCodes),
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(userPrompt);
    const raw = result.response.text();
    if (!raw?.trim()) {
      return { ok: false, error: "Empty Gemini response", status: 502 };
    }

    const parsed = extractJsonObject(raw);
    const validated = GeminiPayloadSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: "Gemini response did not match orchestrator JSON schema.",
        status: 502,
      };
    }

    const speech = validated.data.speech.trim();
    const actions = filterActions(validated.data.actions, actionCodes);
    const ui_surface = validated.data.ui_surface;
    const board_ops = validated.data.board_ops;

    const staging: ServerStagingRow = {
      id: newStagingId(),
      session_id: sessionId,
      lesson_id: lessonId,
      step_index: stepIndex,
      step_id: body.step_id ?? null,
      user_input: userInput,
      gemini_response_text: speech,
      generated_actions: actions,
      ui_surface,
      board_ops: board_ops ?? null,
      status: "pending_review",
      current_route: currentRoute,
      language,
      created_at: new Date().toISOString(),
    };
    serverStaging.unshift(staging);
    if (serverStaging.length > 500) serverStaging.length = 500;

    const data: OrchestratorPayload = {
      speech,
      ui_surface,
      actions,
      board_ops,
      source: "gemini_fallback",
      staging_id: staging.id,
    };

    return { ok: true, data, cache_hit: false, staging };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Knowledge orchestrator failed";
    return { ok: false, error: message, status: 500 };
  }
}

export function listServerStaging(limit = 50): ServerStagingRow[] {
  return serverStaging.slice(0, limit);
}

export function listServerThirdQa(limit = 100): ServerThirdEntry[] {
  return serverThirdQa.slice(0, limit);
}

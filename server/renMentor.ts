/**
 * Ren mentor brain — Gemini-backed console guidance (speech + ACTION_MAP code).
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import ACTION_MAP_JSON from "../src/data/cloud/awsConsole/ACTION_MAP.json";

export type RenMentorRequest = {
  studentQuery?: unknown;
  currentRoute?: unknown;
};

export type RenMentorResponse = {
  speech: string;
  action: string | null;
};

export type RenMentorOk = {
  ok: true;
  data: RenMentorResponse;
};

export type RenMentorErr = {
  ok: false;
  error: string;
  status: number;
};

const RenResponseSchema = z.object({
  speech: z.string().min(1).max(2_000),
  action: z.union([z.string().min(1).max(200), z.null()]),
});

const ALLOWED_MODEL = "gemini-3.6-flash";

function flattenActionMapCodes(): string[] {
  const families = ACTION_MAP_JSON.ACTION_MAP as Record<string, string[]>;
  return Object.values(families).flat();
}

function buildRenSystemPrompt(actionCodes: string[]): string {
  return `You are Ren — an energetic Cloud Architect mentor under 30 years old teaching AWS on the REBON interactive console.

PERSONA (always stay in character):
- Senior-level cloud expertise with the warmth of a passionate peer, not a lecturer.
- Highly interactive, open-minded, motivated, and encouraging — teaching students is your passion.
- Speak like a real human mentor: concise, confident, occasionally witty, never robotic.
- Explain the "why" behind AWS decisions; celebrate good instincts; nudge gently on mistakes.
- 2–4 sentences max in "speech". No markdown, no bullet lists, no code fences.

CONSOLE CONTEXT:
- You guide students inside a simulated AWS console. When a UI step is needed, emit an ACTION_MAP code.
- When the student only needs explanation (concepts, trade-offs, reassurance), set "action" to null.
- Never invent UI codes. Only use codes from ACTION_MAP below (replace {id}, {value}, {service} when needed).

OUTPUT FORMAT — CRITICAL:
Respond with ONLY a single JSON object. No preamble, no markdown, no extra keys.
Schema: {"speech": "string", "action": "string or null"}

ACTION_MAP (whitelist — action must be null or one of these patterns/codes):
${actionCodes.map((c) => `- ${c}`).join("\n")}`;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*"speech"[\s\S]*"action"[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function isAllowedAction(action: string, codes: string[]): boolean {
  if (!action) return false;
  const exact = codes.includes(action);
  if (exact) return true;
  return codes.some((pattern) => {
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\{id\\\}/g, "[^:]+")
      .replace(/\\\{value\\\}/g, ".+")
      .replace(/\\\{service\\\}/g, "[a-z0-9-]+");
    return new RegExp(`^${escaped}$`, "i").test(action);
  });
}

export async function handleRenMentor(
  body: RenMentorRequest,
  apiKey: string
): Promise<RenMentorOk | RenMentorErr> {
  if (!apiKey) {
    return {
      ok: false,
      error: "GEMINI_API_KEY is not configured on the server.",
      status: 503,
    };
  }

  const studentQuery =
    typeof body.studentQuery === "string" ? body.studentQuery.trim() : "";
  const currentRoute =
    typeof body.currentRoute === "string" ? body.currentRoute.trim() : "unknown";

  if (!studentQuery || studentQuery.length > 4_000) {
    return {
      ok: false,
      error: "studentQuery must be a non-empty string (max 4000 chars).",
      status: 400,
    };
  }

  const actionCodes = flattenActionMapCodes();
  const systemInstruction = buildRenSystemPrompt(actionCodes);

  const userPrompt = `Current console route: ${currentRoute}

Student question:
${studentQuery}

Reply with JSON only: {"speech":"...","action":"ACTION_CODE or null"}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: ALLOWED_MODEL,
      systemInstruction,
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
    const validated = RenResponseSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false,
        error: "Ren response did not match required JSON schema.",
        status: 502,
      };
    }

    let { speech, action } = validated.data;
    speech = speech.trim();

    if (action !== null && !isAllowedAction(action, actionCodes)) {
      action = null;
    }

    return {
      ok: true,
      data: { speech, action },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ren mentor request failed";
    return { ok: false, error: message, status: 500 };
  }
}

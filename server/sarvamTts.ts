/**
 * Server-side Sarvam TTS proxy (shared by Vite dev middleware + Vercel /api/sarvam-tts).
 * Keeps SARVAM_API_KEY off the browser.
 */

const ALLOWED_SPEAKERS = new Set(["priya", "meera", "arvind", "amol", "karun"]);
const ALLOWED_MODELS = new Set(["bulbul:v3", "bulbul:v2"]);
const ALLOWED_LANGS = new Set(["ta-IN", "hi-IN", "en-IN"]);

export type SarvamTtsRequest = {
  inputs?: unknown;
  target_language_code?: unknown;
  speaker?: unknown;
  model?: unknown;
  speech_sample_rate?: unknown;
  enable_preprocessing?: unknown;
};

export type SarvamTtsOk = {
  ok: true;
  status: number;
  body: string;
};

export type SarvamTtsErr = {
  ok: false;
  error: string;
  status: number;
};

function asInputs(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 4) return null;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 500) return null;
    out.push(trimmed);
  }
  return out;
}

export async function handleSarvamTts(
  body: SarvamTtsRequest,
  apiKey: string
): Promise<SarvamTtsOk | SarvamTtsErr> {
  if (!apiKey) {
    return {
      ok: false,
      error: "SARVAM_API_KEY is not configured on the server.",
      status: 503,
    };
  }

  const inputs = asInputs(body.inputs);
  if (!inputs) {
    return {
      ok: false,
      error: "inputs must be a non-empty array of strings (max 4, 500 chars each).",
      status: 400,
    };
  }

  const target_language_code =
    typeof body.target_language_code === "string" &&
    ALLOWED_LANGS.has(body.target_language_code)
      ? body.target_language_code
      : "ta-IN";

  const speaker =
    typeof body.speaker === "string" && ALLOWED_SPEAKERS.has(body.speaker)
      ? body.speaker
      : "priya";

  const model =
    typeof body.model === "string" && ALLOWED_MODELS.has(body.model)
      ? body.model
      : "bulbul:v3";

  const speech_sample_rate =
    typeof body.speech_sample_rate === "number" &&
    Number.isFinite(body.speech_sample_rate)
      ? Math.min(48_000, Math.max(8_000, Math.round(body.speech_sample_rate)))
      : 22_050;

  const enable_preprocessing = body.enable_preprocessing !== false;

  try {
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs,
        target_language_code,
        speaker,
        model,
        speech_sample_rate,
        enable_preprocessing,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        error: text || `Sarvam TTS failed (${response.status}).`,
        status: response.status >= 400 && response.status < 600 ? response.status : 502,
      };
    }

    return { ok: true, status: response.status, body: text };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sarvam proxy failed";
    return { ok: false, error: message, status: 502 };
  }
}

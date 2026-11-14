/**
 * Hybrid mentor voice client — Path A pre-rendered assets, Path B local TTS engine.
 * Used by useAvaVoice (Professional Mode). Not the AWS account store.
 */

import { logger } from "@/lib/logger";
import {
  GEMINI_VOICE_TRIAL,
  HYBRID_LOCAL_TTS_ENABLED,
} from "@/lib/voiceFeatureFlags";

export type MentorVoiceLang = "en" | "ta" | "tanglish";

export { GEMINI_VOICE_TRIAL, HYBRID_LOCAL_TTS_ENABLED };

/** Dev: Vite proxies /rebon-tts → http://127.0.0.1:8000 */
const LOCAL_TTS_SPEAK_URL =
  import.meta.env.VITE_REBON_TTS_URL?.trim() || "/rebon-tts/speak";

export function mapTeachLanguageToTtsLang(
  teachLanguage?: string | null
): MentorVoiceLang {
  const v = (teachLanguage || "english").toLowerCase();
  if (v === "tanglish") return "tanglish";
  if (v === "tamil" || v === "ta") return "ta";
  return "en";
}

export function isVoiceAssetUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const t = value.trim();
  return (
    t.startsWith("data:audio/") ||
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("/") ||
    t.endsWith(".mp3") ||
    t.endsWith(".wav") ||
    t.endsWith(".ogg") ||
    t.includes("/audio/lessons/")
  );
}

/** Path B — POST text to local FastAPI /speak, return object URL for Audio(). */
export async function fetchMentorTtsBlobUrl(
  text: string,
  lang: MentorVoiceLang,
  signal?: AbortSignal
): Promise<string> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 600_000);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(LOCAL_TTS_SPEAK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Local TTS ${res.status}: ${detail || res.statusText}`);
    }
    const blob = await res.blob();
    if (!blob.size) throw new Error("Local TTS returned empty audio");
    return URL.createObjectURL(blob);
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function playMentorVoiceRequest(opts: {
  text: string;
  language: MentorVoiceLang;
  voiceAssetUrl?: string | null;
  signal?: AbortSignal;
}): Promise<{ objectUrl: string; path: "prerendered" | "dynamic" }> {
  const asset = opts.voiceAssetUrl?.trim();
  if (asset && isVoiceAssetUrl(asset)) {
    logger.info("mentorVoice", "Path A — pre-rendered asset");
    return { objectUrl: asset, path: "prerendered" };
  }
  logger.info("mentorVoice", "Path B — local TTS engine", opts.language);
  const objectUrl = await fetchMentorTtsBlobUrl(
    opts.text,
    opts.language,
    opts.signal
  );
  return { objectUrl, path: "dynamic" };
}

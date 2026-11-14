/**
 * Path A lesson teaching voice cache.
 * Pre-rendered MP3s: public/audio/lessons/<PM-x.y>/<lang>/
 * Lookup by sha256(text)[:16] and by exact normalized text.
 */

import { logger } from "@/lib/logger";

export type LessonVoiceManifest = {
  lesson_id?: string;
  lesson_folder: string;
  language: string;
  engine?: string;
  voice?: string;
  url_prefix: string;
  clips: Record<
    string,
    {
      file: string;
      url: string;
      bytes?: number;
      text?: string;
      text_preview?: string;
    }
  >;
};

type VoiceIndex = {
  byHash: Map<string, string>;
  byText: Map<string, string>;
  urls: string[];
};

const manifestCache = new Map<string, LessonVoiceManifest | null>();
const indexCache = new Map<string, VoiceIndex>();

export function normalizeLessonVoiceText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/** Same key as rebon-voice-engine/scripts/prerender_lesson.py text_key() */
export async function lessonVoiceTextKey(text: string): Promise<string> {
  const normalized = normalizeLessonVoiceText(text);
  const data = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
}

function manifestUrl(lessonFolder: string, language: string): string {
  const lang =
    language === "tanglish"
      ? "tanglish"
      : language === "tamil" || language === "ta"
        ? "tamil"
        : "english";
  return `/audio/lessons/${lessonFolder}/${lang}/manifest.json`;
}

export function lessonFolderFromId(lessonId: string | null | undefined): string | null {
  if (!lessonId) return null;
  const id = lessonId.toLowerCase();
  if (id.includes("pm_console") || id === "pm-0.1" || id.includes("console_intro")) {
    return "PM-0.1";
  }
  const m = lessonId.match(/PM[-_]?(\d+\.\d+)/i);
  if (m) return `PM-${m[1]}`;
  return null;
}

function buildIndex(manifest: LessonVoiceManifest): VoiceIndex {
  const byHash = new Map<string, string>();
  const byText = new Map<string, string>();
  const urls: string[] = [];
  for (const [hash, clip] of Object.entries(manifest.clips || {})) {
    if (!clip?.url) continue;
    byHash.set(hash, clip.url);
    urls.push(clip.url);
    if (clip.text) {
      byText.set(normalizeLessonVoiceText(clip.text), clip.url);
    }
  }
  return { byHash, byText, urls };
}

export async function loadLessonVoiceManifest(
  lessonFolder: string,
  language: string
): Promise<LessonVoiceManifest | null> {
  const key = `${lessonFolder}:${language}`;
  if (manifestCache.has(key)) return manifestCache.get(key) ?? null;

  const url = manifestUrl(lessonFolder, language);
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) {
      logger.info("lessonVoiceCache", "No pre-render manifest yet", url, res.status);
      manifestCache.set(key, null);
      return null;
    }
    const data = (await res.json()) as LessonVoiceManifest;
    manifestCache.set(key, data);
    indexCache.set(key, buildIndex(data));
    logger.info(
      "lessonVoiceCache",
      "Loaded Path A manifest",
      lessonFolder,
      language,
      Object.keys(data.clips || {}).length
    );
    return data;
  } catch (err) {
    logger.warn("lessonVoiceCache", "Manifest fetch failed", err);
    manifestCache.set(key, null);
    return null;
  }
}

/** Load preferred language, fall back to english. Builds sync lookup index. */
export async function warmLessonVoiceCache(
  lessonFolder: string | null,
  language: string
): Promise<VoiceIndex | null> {
  if (!lessonFolder) return null;
  const preferred = language === "tanglish" ? "tanglish" : "english";
  let manifest = await loadLessonVoiceManifest(lessonFolder, preferred);
  let used = preferred;
  if (!manifest && preferred !== "english") {
    manifest = await loadLessonVoiceManifest(lessonFolder, "english");
    used = "english";
  }
  if (!manifest) return null;
  const key = `${lessonFolder}:${used}`;
  const index = indexCache.get(key) ?? buildIndex(manifest);
  indexCache.set(key, index);
  // Also alias under the requested language key so sync lookup works.
  indexCache.set(`${lessonFolder}:${preferred}`, index);

  // Browser-prefetch so Path A starts instantly
  for (const url of index.urls.slice(0, 80)) {
    try {
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = url;
    } catch {
      /* ignore */
    }
  }
  return index;
}

/** Sync lookup after warmLessonVoiceCache — no network, no delay. */
export function lookupPreRenderedVoiceUrlSync(
  text: string,
  lessonFolder: string | null,
  language: string
): string | null {
  if (!text?.trim() || !lessonFolder) return null;
  const preferred = language === "tanglish" ? "tanglish" : "english";
  const index =
    indexCache.get(`${lessonFolder}:${preferred}`) ||
    indexCache.get(`${lessonFolder}:english`);
  if (!index) return null;
  const norm = normalizeLessonVoiceText(text);
  return index.byText.get(norm) ?? null;
}

export async function resolvePreRenderedVoiceUrl(
  text: string,
  lessonFolder: string | null,
  language: string
): Promise<string | null> {
  if (!text?.trim() || !lessonFolder) return null;
  await warmLessonVoiceCache(lessonFolder, language);
  const sync = lookupPreRenderedVoiceUrlSync(text, lessonFolder, language);
  if (sync) return sync;
  const preferred = language === "tanglish" ? "tanglish" : "english";
  const index =
    indexCache.get(`${lessonFolder}:${preferred}`) ||
    indexCache.get(`${lessonFolder}:english`);
  if (!index) return null;
  const key = await lessonVoiceTextKey(text);
  return index.byHash.get(key) ?? null;
}

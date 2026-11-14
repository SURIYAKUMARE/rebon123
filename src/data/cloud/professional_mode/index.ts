/**
 * Professional Mode lesson registry.
 * Explicit imports (works in Vite + Node/tsx). Stubs are skipped by register().
 */
import curriculum from "./_curriculum.json";
import workspaceCatalog from "./_workspace_catalog.json";
import { normalizeProfessionalLesson } from "./normalizeLesson";
import type {
  ProfessionalCurriculum,
  ProfessionalLanguage,
  ProfessionalLessonFile,
} from "../../../types/professionalMode";

import pm01English from "./lessons/PM-0.1_english.json";
import pm01Tanglish from "./lessons/PM-0.1_tanglish.json";
import pm11English from "./lessons/PM-1.1_english.json";
import pm11Tanglish from "./lessons/PM-1.1_tanglish.json";
import pm12English from "./lessons/PM-1.2_english.json";
import pm12Tanglish from "./lessons/PM-1.2_tanglish.json";
import pm13English from "./lessons/PM-1.3_english.json";
import pm13Tanglish from "./lessons/PM-1.3_tanglish.json";
import pm14English from "./lessons/PM-1.4_english.json";
import pm14Tanglish from "./lessons/PM-1.4_tanglish.json";
import pm15English from "./lessons/PM-1.5_english.json";
import pm15Tanglish from "./lessons/PM-1.5_tanglish.json";
import pm21English from "./lessons/PM-2.1_english.json";
import pm21Tanglish from "./lessons/PM-2.1_tanglish.json";
import pm22English from "./lessons/PM-2.2_english.json";
import pm22Tanglish from "./lessons/PM-2.2_tanglish.json";
import pm23English from "./lessons/PM-2.3_english.json";
import pm23Tanglish from "./lessons/PM-2.3_tanglish.json";
import pm24English from "./lessons/PM-2.4_english.json";
import pm24Tanglish from "./lessons/PM-2.4_tanglish.json";
import pm31English from "./lessons/PM-3.1_english.json";
import pm31Tanglish from "./lessons/PM-3.1_tanglish.json";
import pm32English from "./lessons/PM-3.2_english.json";
import pm32Tanglish from "./lessons/PM-3.2_tanglish.json";
import pm33English from "./lessons/PM-3.3_english.json";
import pm33Tanglish from "./lessons/PM-3.3_tanglish.json";
import pm34English from "./lessons/PM-3.4_english.json";
import pm34Tanglish from "./lessons/PM-3.4_tanglish.json";
import pm41English from "./lessons/PM-4.1_english.json";
import pm41Tanglish from "./lessons/PM-4.1_tanglish.json";
import pm42English from "./lessons/PM-4.2_english.json";
import pm42Tanglish from "./lessons/PM-4.2_tanglish.json";
import pm43English from "./lessons/PM-4.3_english.json";
import pm43Tanglish from "./lessons/PM-4.3_tanglish.json";
import pm51English from "./lessons/PM-5.1_english.json";
import pm51Tanglish from "./lessons/PM-5.1_tanglish.json";
import pm52English from "./lessons/PM-5.2_english.json";
import pm52Tanglish from "./lessons/PM-5.2_tanglish.json";
import pm53English from "./lessons/PM-5.3_english.json";
import pm53Tanglish from "./lessons/PM-5.3_tanglish.json";

/**
 * Runtime lesson registry keyed by `${LESSON_ID}:${language}`.
 * Also aliases bare lesson id → english for /lesson/PM-0.1 routes.
 */
const lessonsByKey: Record<string, ProfessionalLessonFile> = {};

function register(raw: Record<string, unknown>) {
  if (raw.status === "stub") return;
  const hasSegments =
    (Array.isArray(raw.segments) && raw.segments.length > 0) ||
    (Array.isArray(raw.console_segments) &&
      (raw.console_segments as unknown[]).length > 0);
  if (!hasSegments) return;
  const normalized = normalizeProfessionalLesson(raw);
  const id = normalized.lesson.toUpperCase();
  const lang = normalized.language;
  lessonsByKey[`${id}:${lang}`] = normalized;
  if (lang === "english") {
    lessonsByKey[id] = normalized;
  }
}

const LESSON_MODULES = [
  pm01English,
  pm01Tanglish,
  pm11English,
  pm11Tanglish,
  pm12English,
  pm12Tanglish,
  pm13English,
  pm13Tanglish,
  pm14English,
  pm14Tanglish,
  pm15English,
  pm15Tanglish,
  pm21English,
  pm21Tanglish,
  pm22English,
  pm22Tanglish,
  pm23English,
  pm23Tanglish,
  pm24English,
  pm24Tanglish,
  pm31English,
  pm31Tanglish,
  pm32English,
  pm32Tanglish,
  pm33English,
  pm33Tanglish,
  pm34English,
  pm34Tanglish,
  pm41English,
  pm41Tanglish,
  pm42English,
  pm42Tanglish,
  pm43English,
  pm43Tanglish,
  pm51English,
  pm51Tanglish,
  pm52English,
  pm52Tanglish,
  pm53English,
  pm53Tanglish,
] as unknown as Record<string, unknown>[];

for (const raw of LESSON_MODULES) {
  register(raw);
}

export function getProfessionalCurriculum(): ProfessionalCurriculum {
  return curriculum as ProfessionalCurriculum;
}

export function getProfessionalWorkspaceCatalog() {
  return workspaceCatalog;
}

export function getProfessionalLesson(
  lessonId: string,
  language: ProfessionalLanguage = "english"
): ProfessionalLessonFile | null {
  const id = lessonId.toUpperCase();
  return (
    lessonsByKey[`${id}:${language}`] ||
    lessonsByKey[id] ||
    lessonsByKey[`${id}:english`] ||
    null
  );
}

export function listAvailableProfessionalLessons(): string[] {
  return Object.keys(lessonsByKey)
    .filter((k) => !k.includes(":") || k.endsWith(":english"))
    .map((k) => k.split(":")[0])
    .filter((v, i, a) => a.indexOf(v) === i);
}

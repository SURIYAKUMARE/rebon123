/**
 * Student Mode data loader.
 * Lessons: separate english / tanglish JSON files per day part.
 * Workspace + readiness: English question text; bilingual hints on items.
 * Canonical track: 10 fundamentals lessons (no console) — see _sm_track.json
 */
import type {
  ReadinessCheckFile,
  StudentCurriculum,
  StudentLanguage,
  StudentLessonFile,
  StudentWorkspaceFile,
} from "@/types/studentMode";
import curriculum from "./_curriculum.json";
import readiness from "./readiness_check.json";

import day1En from "./day1_lesson_english.json";
import day1Tg from "./day1_lesson_tanglish.json";
import day1Ws from "./day1_workspace.json";
import day2En from "./day2_lesson_english.json";
import day2Tg from "./day2_lesson_tanglish.json";
import day2Ws from "./day2_workspace.json";
import day3En from "./day3_lesson_english.json";
import day3Tg from "./day3_lesson_tanglish.json";
import day3Ws from "./day3_workspace.json";
import day4En from "./day4_lesson_english.json";
import day4Tg from "./day4_lesson_tanglish.json";
import day4Ws from "./day4_workspace.json";
import day5En from "./day5_lesson_english.json";
import day5Tg from "./day5_lesson_tanglish.json";
import day5Ws from "./day5_workspace.json";
import day6En from "./day6_lesson_english.json";
import day6Tg from "./day6_lesson_tanglish.json";
import day6Ws from "./day6_workspace.json";
import day7En from "./day7_lesson_english.json";
import day7Tg from "./day7_lesson_tanglish.json";
import day7Ws from "./day7_workspace.json";
import day8En from "./day8_lesson_english.json";
import day8Tg from "./day8_lesson_tanglish.json";
import day8Ws from "./day8_workspace.json";
import day9En from "./day9_lesson_english.json";
import day9Tg from "./day9_lesson_tanglish.json";
import day9Ws from "./day9_workspace.json";
import day10En from "./day10_lesson_english.json";
import day10Tg from "./day10_lesson_tanglish.json";
import day10Ws from "./day10_workspace.json";

const lessonsByKey: Record<string, StudentLessonFile> = {
  day1_english: day1En as StudentLessonFile,
  day1_tanglish: day1Tg as StudentLessonFile,
  day2_english: day2En as StudentLessonFile,
  day2_tanglish: day2Tg as StudentLessonFile,
  day3_english: day3En as StudentLessonFile,
  day3_tanglish: day3Tg as StudentLessonFile,
  day4_english: day4En as StudentLessonFile,
  day4_tanglish: day4Tg as StudentLessonFile,
  day5_english: day5En as StudentLessonFile,
  day5_tanglish: day5Tg as StudentLessonFile,
  day6_english: day6En as StudentLessonFile,
  day6_tanglish: day6Tg as StudentLessonFile,
  day7_english: day7En as StudentLessonFile,
  day7_tanglish: day7Tg as StudentLessonFile,
  day8_english: day8En as StudentLessonFile,
  day8_tanglish: day8Tg as StudentLessonFile,
  day9_english: day9En as StudentLessonFile,
  day9_tanglish: day9Tg as StudentLessonFile,
  day10_english: day10En as StudentLessonFile,
  day10_tanglish: day10Tg as StudentLessonFile,
};

const workspacesByDay: Record<number, StudentWorkspaceFile> = {
  1: day1Ws as StudentWorkspaceFile,
  2: day2Ws as StudentWorkspaceFile,
  3: day3Ws as StudentWorkspaceFile,
  4: day4Ws as StudentWorkspaceFile,
  5: day5Ws as StudentWorkspaceFile,
  6: day6Ws as StudentWorkspaceFile,
  7: day7Ws as StudentWorkspaceFile,
  8: day8Ws as StudentWorkspaceFile,
  9: day9Ws as StudentWorkspaceFile,
  10: day10Ws as StudentWorkspaceFile,
};

export function getStudentCurriculum(): StudentCurriculum {
  return curriculum as StudentCurriculum;
}

export function getStudentLesson(
  partStem: string,
  language: StudentLanguage
): StudentLessonFile | null {
  return lessonsByKey[`${partStem}_${language}`] ?? null;
}

/** All lesson parts for a day in curriculum order, for the active language. */
export function getStudentLessonsForDay(
  day: number,
  language: StudentLanguage
): StudentLessonFile[] {
  const meta = getStudentCurriculum().days.find((d) => d.day === day);
  if (!meta) return [];
  return meta.lesson_parts
    .map((stem) => getStudentLesson(stem, language))
    .filter((x): x is StudentLessonFile => Boolean(x));
}

export function getStudentWorkspace(day: number): StudentWorkspaceFile | null {
  return workspacesByDay[day] ?? null;
}

export function getReadinessCheck(): ReadinessCheckFile {
  return readiness as ReadinessCheckFile;
}

export const STUDENT_LESSON_COUNT = 10;

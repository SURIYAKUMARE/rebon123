/**
 * Professional Mode — current Finova role + lesson completion (local).
 * Lessons shown = only what the active role must know (not all 6 services).
 */
import { progressGet, progressSet } from "@/data/cloud/ephemeralProgress";
import { TESTING_UNLOCK_ALL_LESSONS } from "@/data/cloud/ephemeralProgress";
import rolesFile from "@/data/cloud/professional_mode/_roles.json";
import { getProfessionalCurriculum } from "@/data/cloud/professional_mode";
import type { CloudRole } from "@/data/cloud/cloudRole";
import {
  CLOUD_ENGINEER_TRACK,
  CSA_L1_TRACK,
  L2_OPS_TRACK,
} from "@/data/cloud/roleTrack";

export type ProRoleId =
  | "l1_cloud_support_associate"
  | "l2_cloud_operations"
  | "cloud_engineer"
  | "senior_cloud_engineer"
  | "cloud_architect_track";

export type ProRoleDef = {
  role_id: ProRoleId;
  title: string;
  order: number;
  entry_speech: string;
  must_know: string[];
  services: string[];
  lesson_sessions: string[];
  entry_first_lesson?: string;
  mastery_gate: {
    min_lessons_complete: number;
    promotion_review_threshold: number;
  };
  next_role_id: ProRoleId | null;
  available: boolean;
  launch_status: "live" | "teaser";
};

const ROLE_KEY = "rebon_pro_current_role";
const DONE_KEY = "rebon_pro_lessons_done";

const roles = (rolesFile as { roles: ProRoleDef[] }).roles;

export function getAllProRoles(): ProRoleDef[] {
  return roles;
}

export function getProRole(roleId: ProRoleId): ProRoleDef | null {
  return roles.find((r) => r.role_id === roleId) ?? null;
}

/** Placement → starting Finova desk role (entry role, not full ladder dump). */
export function entryRoleFromPlacement(cloudRole?: CloudRole | null): ProRoleId {
  if (cloudRole === "cloud_engineer") return CLOUD_ENGINEER_TRACK;
  // Junior and unlocked fresher path start at joining desk
  return CSA_L1_TRACK;
}

export function getCurrentProRoleId(cloudRole?: CloudRole | null): ProRoleId {
  const stored = progressGet(ROLE_KEY) as ProRoleId | null;
  if (stored && getProRole(stored)) return stored;
  const entry = entryRoleFromPlacement(cloudRole);
  progressSet(ROLE_KEY, entry);
  return entry;
}

export function setCurrentProRoleId(roleId: ProRoleId) {
  progressSet(ROLE_KEY, roleId);
}

export function getCompletedProLessonIds(): string[] {
  const raw = progressGet(DONE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function markProLessonComplete(lessonId: string) {
  const id = lessonId.toUpperCase();
  const next = Array.from(new Set([...getCompletedProLessonIds(), id]));
  progressSet(DONE_KEY, JSON.stringify(next));
}

export function isProLessonComplete(lessonId: string): boolean {
  return getCompletedProLessonIds().includes(lessonId.toUpperCase());
}

/** Lesson IDs available for a role: must be tagged with that role AND in role sessions.
 * PM-0.1 (console first) is always included when tagged for the role.
 */
export function lessonIdsForRole(roleId: ProRoleId): string[] {
  const role = getProRole(roleId);
  if (!role) return [];
  const sessions = new Set(role.lesson_sessions);
  // Always allow entry console session
  sessions.add("PM-0");
  const curriculum = getProfessionalCurriculum();
  const ids: string[] = [];
  for (const topic of curriculum.topics) {
    if (!sessions.has(topic.session)) continue;
    for (const lesson of topic.lessons) {
      if (!lesson.available) continue;
      if (!lesson.role_tracks?.includes(roleId)) continue;
      ids.push(lesson.id);
    }
  }
  // Pin console first in id list order
  ids.sort((a, b) => {
    if (a === "PM-0.1") return -1;
    if (b === "PM-0.1") return 1;
    return a.localeCompare(b);
  });
  return ids;
}

export const CONSOLE_FIRST_LESSON_ID = "PM-0.1";

export function hasCompletedConsoleFirst(): boolean {
  return isProLessonComplete(CONSOLE_FIRST_LESSON_ID);
}

/** Other role lessons stay locked until console literacy is done. */
export function isProLessonUnlocked(lessonId: string): boolean {
  if (TESTING_UNLOCK_ALL_LESSONS) return true;
  const id = lessonId.toUpperCase();
  if (id === CONSOLE_FIRST_LESSON_ID) return true;
  return hasCompletedConsoleFirst();
}

export function roleLessonProgress(roleId: ProRoleId): {
  done: number;
  total: number;
  completeIds: string[];
  remainingIds: string[];
} {
  const ids = lessonIdsForRole(roleId);
  const doneSet = new Set(getCompletedProLessonIds());
  const completeIds = ids.filter((id) => doneSet.has(id.toUpperCase()));
  return {
    done: completeIds.length,
    total: ids.length,
    completeIds,
    remainingIds: ids.filter((id) => !doneSet.has(id.toUpperCase())),
  };
}

export function canPromoteFromRole(roleId: ProRoleId): boolean {
  const role = getProRole(roleId);
  if (!role?.next_role_id) return false;
  const next = getProRole(role.next_role_id);
  if (!next || !next.available) return false;
  const { done, total } = roleLessonProgress(roleId);
  const min = role.mastery_gate.min_lessons_complete;
  // Prefer completing the role's lesson list; fall back to mastery min if list is longer
  const need = Math.min(min, total || min);
  return done >= need && done > 0;
}

export function promoteToNextRole(roleId: ProRoleId): ProRoleId | null {
  if (!canPromoteFromRole(roleId)) return null;
  const role = getProRole(roleId);
  if (!role?.next_role_id) return null;
  setCurrentProRoleId(role.next_role_id);
  return role.next_role_id;
}

export function servicesLabel(services: string[]): string {
  return services.map((s) => s.toUpperCase()).join(" · ");
}

export { CSA_L1_TRACK, L2_OPS_TRACK, CLOUD_ENGINEER_TRACK };

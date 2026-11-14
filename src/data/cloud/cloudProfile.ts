import { supabase } from "@/integrations/supabase/client";
import {
  type CloudRole,
  isCloudRole,
  catalogModeForRole,
} from "@/data/cloud/cloudRole";
import { setRebonMode } from "@/data/cloud/rebonMode";
import {
  markDayWorkspaceComplete,
  markReadinessPassed,
} from "@/data/cloud/studentModeProgress";
import { progressSet } from "@/data/cloud/ephemeralProgress";

const CLOUD_ROLE_KEY = "rebon_cloud_role";

export function cacheCloudRole(role: CloudRole) {
  try {
    localStorage.setItem(CLOUD_ROLE_KEY, role);
  } catch {
    /* ignore */
  }
  progressSet(CLOUD_ROLE_KEY, role);
}

export function getCachedCloudRole(): CloudRole | null {
  try {
    const fromLs = localStorage.getItem(CLOUD_ROLE_KEY);
    if (isCloudRole(fromLs)) return fromLs;
  } catch {
    /* ignore */
  }
  return null;
}

export function applyRoleUnlocks(role: CloudRole) {
  cacheCloudRole(role);
  setRebonMode(catalogModeForRole(role));
  if (role === "cloud_junior" || role === "cloud_engineer") {
    markReadinessPassed();
  }
}

export async function persistCloudDomain(userId: string) {
  await supabase
    .from("profiles")
    .update({ domain: "fullstack" })
    .eq("user_id", userId);
}

export async function saveCloudPlacement(
  userId: string,
  role: CloudRole,
  scorePct: number
) {
  await supabase.from("fullstack_profiles").upsert(
    {
      user_id: userId,
      assessment_completed: true,
      fullstack_level: role,
      overall_score: Math.round(scorePct),
    },
    { onConflict: "user_id" }
  );

  await supabase
    .from("profiles")
    .update({ domain: "fullstack", path_type: role })
    .eq("user_id", userId);

  applyRoleUnlocks(role);
}

export async function fetchCloudPlacement(userId: string): Promise<{
  role: CloudRole | null;
  assessmentCompleted: boolean;
  scorePct: number;
}> {
  const { data } = await supabase
    .from("fullstack_profiles")
    .select("fullstack_level, assessment_completed, overall_score")
    .eq("user_id", userId)
    .maybeSingle();

  const role = isCloudRole(data?.fullstack_level)
    ? data.fullstack_level
    : getCachedCloudRole();

  if (role && data?.assessment_completed) {
    applyRoleUnlocks(role);
  }

  return {
    role,
    assessmentCompleted: Boolean(data?.assessment_completed),
    scorePct: data?.overall_score ?? 0,
  };
}

export async function syncCloudLessonComplete(
  userId: string,
  lessonId: string
) {
  await supabase.from("learning_progress").upsert(
    {
      user_id: userId,
      video_id: lessonId,
      marked_understood: true,
      quiz_passed: true,
      total_seconds: 0,
    },
    { onConflict: "user_id,video_id" }
  );
}

export async function hydrateCloudProgressFromDb(userId: string) {
  const { data } = await supabase
    .from("learning_progress")
    .select("video_id, quiz_passed")
    .eq("user_id", userId);

  for (const row of data ?? []) {
    const dayMatch = row.video_id.match(/^SM-D(\d+)/i);
    if (dayMatch) {
      markDayWorkspaceComplete(Number(dayMatch[1]));
    }
    if (row.video_id === "cloud-readiness" && row.quiz_passed) {
      markReadinessPassed();
    }
  }
}

export async function syncReadinessPassed(userId: string) {
  await syncCloudLessonComplete(userId, "cloud-readiness");
}

/**
 * Role-track helpers for Professional Mode career simulation.
 */
export const CSA_L1_TRACK = "l1_cloud_support_associate" as const;
export const L2_OPS_TRACK = "l2_cloud_operations" as const;
export const CLOUD_ENGINEER_TRACK = "cloud_engineer" as const;

/** MVP launch roles — lessons for these tracks are shown in Professional Learn. */
export const MVP_LIVE_ROLE_TRACKS = [
  CSA_L1_TRACK,
  L2_OPS_TRACK,
  CLOUD_ENGINEER_TRACK,
] as const;

export const ROLE_TRACK_LABELS: Record<string, string> = {
  l1_cloud_support_associate: "Cloud Support Associate (L1)",
  l2_cloud_operations: "Cloud Operations Associate",
  cloud_engineer: "Cloud Engineer",
  senior_cloud_engineer: "Senior Cloud Engineer",
  cloud_architect_track: "Cloud Architect (track)",
};

export const FINOVA_HIRE = {
  company: "Finova Technologies",
  role: "Cloud Support Associate (L1)",
  account: "finova-dev",
  manager: "Arjun Mehta (Infrastructure Lead)",
  welcomeSpeech: `You were selected. Finova Technologies is offering you the role of Cloud Support Associate, Level 1. I am Ren, your mentor. Finova runs cloud systems for finance clients. Your work is the support desk: read the company mail, use the AWS console, and reply with what you did. You start with the account, IAM, and CloudWatch. Learn teaches the base. The desk is where you solve it. When I finish, sign the offer.`,
} as const;

export function isCsaL1Track(tracks?: string[] | null): boolean {
  return Boolean(tracks?.includes(CSA_L1_TRACK));
}

/** True if lesson belongs to any MVP live role (R1–R3). */
export function isMvpLiveTrack(tracks?: string[] | null): boolean {
  if (!tracks?.length) return false;
  return tracks.some((t) =>
    (MVP_LIVE_ROLE_TRACKS as readonly string[]).includes(t)
  );
}

export function primaryRoleLabel(tracks?: string[] | null): string {
  if (!tracks?.length) return ROLE_TRACK_LABELS[CSA_L1_TRACK];
  for (const id of MVP_LIVE_ROLE_TRACKS) {
    if (tracks.includes(id)) return ROLE_TRACK_LABELS[id];
  }
  return ROLE_TRACK_LABELS[tracks[0]] || tracks[0];
}

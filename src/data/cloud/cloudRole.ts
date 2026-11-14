/** Cloud placement roles — drive lesson catalog and mode routing. */
export type CloudRole = "cloud_fresher" | "cloud_junior" | "cloud_engineer";

export const CLOUD_ROLE_LABELS: Record<CloudRole, string> = {
  cloud_fresher: "Cloud Fresher",
  cloud_junior: "Cloud Junior",
  cloud_engineer: "Cloud Engineer",
};

export type CloudCatalogMode = "student" | "professional";

/** Fresher → Student Mode Day 1; Junior/Engineer → Professional Mode. */
export function catalogModeForRole(role: CloudRole): CloudCatalogMode {
  return role === "cloud_fresher" ? "student" : "professional";
}

/**
 * Placement score + self-reported comfort level → cloud role.
 * Quiz performance is weighted; self-level nudges borderline scores.
 */
export function roleFromPlacement(
  score: number,
  maxScore: number,
  selfLevel: string
): CloudRole {
  const pct = maxScore > 0 ? score / maxScore : 0;
  const level = selfLevel.toLowerCase();

  if (pct >= 0.85 || level === "ultra_pro") return "cloud_engineer";
  if (pct >= 0.55 || level === "pro" || level === "moderate") {
    return pct >= 0.75 ? "cloud_engineer" : "cloud_junior";
  }
  if (pct >= 0.35 && level === "moderate") return "cloud_junior";
  return "cloud_fresher";
}

export function isCloudRole(value: string | null | undefined): value is CloudRole {
  return (
    value === "cloud_fresher" ||
    value === "cloud_junior" ||
    value === "cloud_engineer"
  );
}

export function formatCloudRoleLabel(value: string | null | undefined): string {
  if (isCloudRole(value)) return CLOUD_ROLE_LABELS[value];
  if (!value) return "Not assessed";
  return value.replace(/_/g, " ");
}

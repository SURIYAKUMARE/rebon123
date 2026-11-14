const HIRE_SEEN_KEY = "rebon_csa_hire_ceremony_seen_v1";

export function hasSeenCsaHire(): boolean {
  try {
    return localStorage.getItem(HIRE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markCsaHireSeen(): void {
  try {
    localStorage.setItem(HIRE_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

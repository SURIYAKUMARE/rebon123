import { progressGet, progressSet } from "@/data/cloud/ephemeralProgress";

const KEY = "rebon_proof_identity_v1";

export type ProofIdentity = {
  name: string;
  age: string;
  department: string;
  college: string;
  year: string;
};

export const EMPTY_IDENTITY: ProofIdentity = {
  name: "",
  age: "",
  department: "",
  college: "",
  year: "",
};

export function loadProofIdentity(): ProofIdentity {
  const raw = progressGet(KEY);
  if (!raw) return EMPTY_IDENTITY;
  try {
    const parsed = JSON.parse(raw) as Partial<ProofIdentity>;
    return {
      name: String(parsed.name ?? "").trim(),
      age: String(parsed.age ?? "").trim(),
      department: String(parsed.department ?? "").trim(),
      college: String(parsed.college ?? "").trim(),
      year: String(parsed.year ?? "").trim(),
    };
  } catch {
    return EMPTY_IDENTITY;
  }
}

export function identityComplete(identity: ProofIdentity): boolean {
  const age = Number(identity.age);
  const year = Number(identity.year);
  return (
    identity.name.length > 1 &&
    Number.isInteger(age) &&
    age >= 16 &&
    age <= 70 &&
    identity.department.length > 1 &&
    identity.college.length > 1 &&
    Number.isInteger(year) &&
    year >= 1 &&
    year <= 5
  );
}

export function saveProofIdentity(identity: ProofIdentity): ProofIdentity {
  const next: ProofIdentity = {
    name: identity.name.trim(),
    age: identity.age.trim(),
    department: identity.department.trim(),
    college: identity.college.trim(),
    year: identity.year.trim(),
  };
  if (!identityComplete(next)) {
    throw new Error("Name, age, department, college, and year are required.");
  }
  progressSet(KEY, JSON.stringify(next));
  return next;
}

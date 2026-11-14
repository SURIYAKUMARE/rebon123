/**
 * Shared keyword-group grader for Student short answers + Pro mail replies.
 * Deterministic, offline, no LLM.
 */

export type KeywordGroup = {
  id: string;
  label: string;
  any_of: string[];
};

export type KeywordRubric = {
  accept_keywords: KeywordGroup[];
  required_groups: string[];
  bonus_groups?: string[];
  reject_keywords?: string[];
  min_words?: number;
  max_words?: number;
};

export type GradeResult = {
  pass: boolean;
  score: number;
  matchedGroups: string[];
  missingGroups: string[];
  bonusMatched: string[];
  rejected: string | null;
  wordCount: number;
  feedback: string[];
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function stemLight(w: string): string {
  if (w.length <= 4) return w;
  return w
    .replace(/ing$/i, "")
    .replace(/ed$/i, "")
    .replace(/es$/i, "")
    .replace(/s$/i, "");
}

function includesPhrase(hay: string, needle: string): boolean {
  const n = normalize(needle);
  if (!n) return false;
  if (hay.includes(n)) return true;
  const hayTokens = hay.split(" ").map(stemLight);
  const needleTokens = n.split(" ").map(stemLight);
  if (needleTokens.length === 1) {
    return hayTokens.some(
      (t) => t === needleTokens[0] || t.startsWith(needleTokens[0])
    );
  }
  // sequential stem match
  for (let i = 0; i <= hayTokens.length - needleTokens.length; i++) {
    let ok = true;
    for (let j = 0; j < needleTokens.length; j++) {
      if (
        hayTokens[i + j] !== needleTokens[j] &&
        !hayTokens[i + j].startsWith(needleTokens[j])
      ) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function groupHits(hay: string, group: KeywordGroup): boolean {
  return group.any_of.some((phrase) => includesPhrase(hay, phrase));
}

export function gradeText(text: string, rubric: KeywordRubric): GradeResult {
  const raw = text ?? "";
  const hay = normalize(raw);
  const words = wordCount(raw);
  const feedback: string[] = [];

  if (rubric.min_words != null && words < rubric.min_words) {
    return {
      pass: false,
      score: 0,
      matchedGroups: [],
      missingGroups: [...rubric.required_groups],
      bonusMatched: [],
      rejected: null,
      wordCount: words,
      feedback: [
        `Write a bit more — at least ${rubric.min_words} words (you have ${words}).`,
      ],
    };
  }
  if (rubric.max_words != null && words > rubric.max_words) {
    feedback.push(
      `Keep it tighter — under ${rubric.max_words} words (you have ${words}).`
    );
  }

  for (const bad of rubric.reject_keywords ?? []) {
    if (includesPhrase(hay, bad)) {
      return {
        pass: false,
        score: 0,
        matchedGroups: [],
        missingGroups: [...rubric.required_groups],
        bonusMatched: [],
        rejected: bad,
        wordCount: words,
        feedback: [
          "That reply describes an unsafe or wrong fix. Rewrite with least privilege.",
        ],
      };
    }
  }

  const byId = new Map(rubric.accept_keywords.map((g) => [g.id, g]));
  const matchedGroups: string[] = [];
  const missingGroups: string[] = [];

  for (const id of rubric.required_groups) {
    const g = byId.get(id);
    if (g && groupHits(hay, g)) matchedGroups.push(id);
    else {
      missingGroups.push(id);
      feedback.push(
        g
          ? `Your lead still needs: ${g.label}.`
          : `Missing required point: ${id}.`
      );
    }
  }

  const bonusMatched: string[] = [];
  for (const id of rubric.bonus_groups ?? []) {
    const g = byId.get(id);
    if (g && groupHits(hay, g)) bonusMatched.push(id);
  }

  const required = rubric.required_groups.length || 1;
  const base = matchedGroups.length / required;
  const bonus =
    (rubric.bonus_groups?.length ?? 0) > 0
      ? (bonusMatched.length / (rubric.bonus_groups!.length || 1)) * 0.15
      : 0;
  const score = Math.min(1, base + bonus);
  const pass = missingGroups.length === 0 && score >= 0.7;

  if (pass && feedback.length === 0) {
    feedback.push("Solid reply — desk lead would send this.");
  }

  return {
    pass,
    score,
    matchedGroups,
    missingGroups,
    bonusMatched,
    rejected: null,
    wordCount: words,
    feedback,
  };
}

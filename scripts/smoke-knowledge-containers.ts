/**
 * Smoke: Secondary → Third promote + Third lookup (no Gemini).
 */
import { stageInteraction } from "../src/data/cloud/knowledgeContainer/secondaryStore";
import {
  promoteStagingToThird,
  rejectStaging,
} from "../src/data/cloud/knowledgeContainer/promote";
import {
  lookupThirdQa,
  listThirdQa,
  __resetThirdStoreForTests,
} from "../src/data/cloud/knowledgeContainer/thirdStore";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

__resetThirdStoreForTests();

const bad = stageInteraction({
  id: "stg_smoke_1",
  session_id: "sess_smoke",
  lesson_id: "PM-0.1",
  step_index: 2,
  user_input: "junk",
  gemini_response_text: "nope",
  generated_actions: [],
  ui_surface: "NONE",
  status: "pending_review",
});

assert(rejectStaging(bad.id)?.status === "rejected", "reject status");

const blocked = promoteStagingToThird({
  staging_id: bad.id,
  lesson_id: "PM-0.1",
  match_patterns: ["junk"],
});
assert(!blocked.ok, "cannot promote rejected");

const staged = stageInteraction({
  id: "stg_smoke_2",
  session_id: "sess_smoke",
  lesson_id: "PM-0.1",
  step_index: 2,
  user_input: "where is my account id",
  gemini_response_text: "Top right account menu — twelve-digit Account ID.",
  generated_actions: ["HIGHLIGHT:nav-search"],
  ui_surface: "CONSOLE",
  status: "pending_review",
});

const promo = promoteStagingToThird({
  staging_id: staged.id,
  lesson_id: "PM-0.1",
  match_patterns: ["where is my account id", "account id"],
  reviewer_note: "smoke approve",
});

assert(promo.ok, "promote ok");
if (!promo.ok) throw new Error(promo.error);

const hit = lookupThirdQa({
  lesson_id: "PM-0.1",
  user_input: "account id please",
});

assert(hit, "third lookup hit");
assert(hit?.source === "third", "source third");
assert(hit?.qa_id === promo.entry.id, "qa id match");

const rows = listThirdQa({ lesson_id: "PM-0.1", status: "active" });
assert(rows.length >= 1, "list third");

// Idempotent re-promote
const again = promoteStagingToThird({
  staging_id: staged.id,
  lesson_id: "PM-0.1",
  match_patterns: ["account id"],
});
assert(again.ok && again.entry.id === promo.entry.id, "idempotent promote");

console.log("smoke-knowledge-containers: PASS");
console.log(`  third entries: ${rows.length}`);
console.log(`  speech: ${hit?.speech.slice(0, 60)}…`);

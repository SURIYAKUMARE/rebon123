/**
 * Validate Primary hydrator + mapConsoleTarget for CSA L1.
 * Run: npx tsx scripts/validate-primary.ts
 */
import { mapConsoleTarget } from "../src/data/cloud/professional_mode/normalizeLesson";
import {
  getProfessionalCurriculum,
  listAvailableProfessionalLessons,
} from "../src/data/cloud/professional_mode";
import {
  __resetPrimaryStoreForTests,
  getPrimaryRecord,
  hydratePrimaryFromProfessionalLesson,
} from "../src/data/cloud/knowledgeContainer/primaryStore";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const CSA_IDS = [
  "PM-0.1",
  "PM-1.1",
  "PM-1.2",
  "PM-1.3",
  "PM-1.4",
  "PM-1.5",
  "PM-5.1",
  "PM-5.2",
  "PM-5.3",
];

__resetPrimaryStoreForTests();

assert(mapConsoleTarget("cw-metric-ec2-cpu") === "cw-metric-ec2-cpu", "cw-metric-ec2-cpu exact");
assert(mapConsoleTarget("nav-groups") === "nav-groups", "nav-groups exact");
assert(mapConsoleTarget("nav-roles") === "nav-roles", "nav-roles exact");
assert(mapConsoleTarget("nav-policies") === "nav-policies", "nav-policies exact");
assert(mapConsoleTarget("cw-log-groups") === "cw-log-groups", "cw-log-groups exact");
assert(mapConsoleTarget("ec2-instances-list") === "ec2-instances-list", "ec2 list still maps");

const available = listAvailableProfessionalLessons();
for (const id of CSA_IDS) {
  assert(available.includes(id), `${id} registered`);
}

const curriculum = getProfessionalCurriculum();
for (const id of CSA_IDS) {
  let found = false;
  for (const topic of curriculum.topics) {
    const lesson = topic.lessons.find((l) => l.id === id);
    if (lesson) {
      found = true;
      assert(lesson.available, `${id} available`);
      assert(
        lesson.role_tracks?.includes("l1_cloud_support_associate"),
        `${id} role_tracks`
      );
    }
  }
  assert(found, `${id} in curriculum`);
}

for (const id of CSA_IDS) {
  __resetPrimaryStoreForTests();
  const en = hydratePrimaryFromProfessionalLesson(id, "english");
  assert(en, `${id} english hydrates`);
  assert(en!.metadata.language === "english", `${id} en lang`);
  assert(en!.metadata.part_count === 1, `${id} single part`);
  assert(en!.parts[0].duration_minutes <= 25, `${id} duration`);
  assert(
    en!.metadata.role_tracks?.includes("l1_cloud_support_associate"),
    `${id} metadata role_tracks`
  );

  const kinds = new Set(en!.parts.flatMap((p) => p.steps.map((s) => s.kind)));
  assert(kinds.has("board_teach"), `${id} board_teach`);
  assert(kinds.has("viva"), `${id} viva`);
  assert(kinds.has("doubt_gate"), `${id} doubt_gate`);
  if (id !== "PM-1.5") {
    assert(kinds.has("console_demo") || kinds.has("console_practice"), `${id} console`);
  }

  const stepIds = en!.parts[0].steps.map((s) => s.id);
  assert(new Set(stepIds).size === stepIds.length, `${id} unique step ids`);

  const ta = getPrimaryRecord(id, "tanglish");
  assert(ta, `${id} tanglish hydrates`);
  assert(ta!.metadata.language === "tanglish", `${id} ta lang`);
}

__resetPrimaryStoreForTests();
const en2 = getPrimaryRecord("PM-0.1", "english");
const ta2 = getPrimaryRecord("PM-0.1", "tanglish");
assert(en2 && ta2, "PM-0.1 both languages coexist");
assert(en2!.metadata.language !== ta2!.metadata.language, "lang isolation");

console.log("validate-primary: OK — CSA L1 Primary filled");

/**
 * Generate Tanglish lesson JSON from English CSA lessons.
 * Board text / cursor / ids stay identical; speech fields get a Tanglish prefix.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lessonsDir = path.join(
  __dirname,
  "../src/data/cloud/professional_mode/lessons"
);

const IDS = [
  "PM-1.1",
  "PM-1.2",
  "PM-1.3",
  "PM-1.4",
  "PM-1.5",
  "PM-5.1",
  "PM-5.2",
  "PM-5.3",
];

const SPEECH_KEYS = new Set([
  "ren_voice",
  "setup_voice",
  "lesson_voice",
  "instruction_voice",
  "hint_voice",
  "completion_voice",
  "voice",
  "question",
  "response_if_correct",
  "response_if_incorrect",
  "ren_opening",
  "ren_closing",
  "ren_response_template",
]);

function tanglishifySpeech(key: string, value: string): string {
  if (!value || !SPEECH_KEYS.has(key)) return value;
  if (key === "ren_voice" && !value.startsWith("Vanakkam")) {
    return `Vanakkam. ${value}`;
  }
  if (key === "setup_voice" && !value.startsWith("Paathukonga")) {
    return `Paathukonga — ${value}`;
  }
  if (key === "instruction_voice" && !value.startsWith("Ungal turn")) {
    return `Ungal turn. ${value}`;
  }
  if (key === "hint_voice" && !value.startsWith("Hint:")) {
    return `Hint: ${value}`;
  }
  if (key === "completion_voice" && !value.startsWith("Super.")) {
    return `Super. ${value}`;
  }
  if (
    (key === "voice" || key === "question") &&
    !value.includes("Clear-ah")
  ) {
    return value;
  }
  if (key === "ren_opening" && !value.startsWith("Doubt irukka")) {
    return `Doubt irukka? ${value}`;
  }
  if (key === "ren_closing" && !value.includes("Seri")) {
    return `${value} Seri — next lesson ku ready.`;
  }
  return value;
}

function walk(node: unknown, parentKey = ""): unknown {
  if (Array.isArray(node)) return node.map((n) => walk(n, parentKey));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "board_text" || k === "board_ops" || k === "cursor" || k === "accept_keywords") {
        out[k] = v;
        continue;
      }
      if (typeof v === "string" && SPEECH_KEYS.has(k)) {
        out[k] = tanglishifySpeech(k, v);
      } else {
        out[k] = walk(v, k);
      }
    }
    return out;
  }
  return node;
}

for (const id of IDS) {
  const src = path.join(lessonsDir, `${id}_english.json`);
  const dst = path.join(lessonsDir, `${id}_tanglish.json`);
  const raw = JSON.parse(fs.readFileSync(src, "utf8")) as Record<string, unknown>;
  const next = walk(raw) as Record<string, unknown>;
  next.language = "tanglish";
  fs.writeFileSync(dst, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log("wrote", path.basename(dst));
}

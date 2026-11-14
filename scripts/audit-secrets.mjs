/**
 * Offline audit: API keys must not ship in browser bundles or edge fallbacks.
 * Run: node scripts/audit-secrets.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_IN_SRC = [
  /VITE_GROQ_API_KEY/,
  /VITE_GEMINI_API_KEY/,
  /VITE_SARVAM_API_KEY/,
  /PLACEHOLDER_API_KEY/,
  /import\.meta\.env\.VITE_.*API_KEY/,
  /['"]sk-[a-zA-Z0-9]{20,}['"]/,
];

const SRC_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(full, out);
    } else if (SRC_EXT.has(path.extname(name))) {
      out.push(full);
    }
  }
  return out;
}

function scanFile(file, patterns) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, "utf8");
  const hits = [];
  for (const pattern of patterns) {
    if (pattern.test(text)) hits.push(pattern.source);
  }
  return hits.length ? { rel, hits } : null;
}

const srcHits = walk(path.join(root, "src"))
  .map((f) => scanFile(f, FORBIDDEN_IN_SRC))
  .filter(Boolean);

if (srcHits.length) {
  console.error("FAIL secrets audit — forbidden patterns in src:");
  for (const h of srcHits) {
    console.error(`  ${h.rel}: ${h.hits.join(", ")}`);
  }
  process.exit(1);
}

const askAva = fs.readFileSync(
  path.join(root, "supabase/functions/ask-ava/index.ts"),
  "utf8"
);
if (askAva.includes("PLACEHOLDER_API_KEY")) {
  console.error("FAIL ask-ava still uses PLACEHOLDER_API_KEY fallback");
  process.exit(1);
}

const viteConfig = fs.readFileSync(path.join(root, "vite.config.ts"), "utf8");
if (!viteConfig.includes("handleSarvamTts")) {
  console.error("FAIL vite Sarvam proxy must use shared handleSarvamTts");
  process.exit(1);
}

const sarvamApi = path.join(root, "api/sarvam-tts.ts");
if (!fs.existsSync(sarvamApi)) {
  console.error("FAIL missing production api/sarvam-tts.ts");
  process.exit(1);
}

console.log("OK secrets audit — no VITE_* API keys or placeholder fallbacks in src");
console.log("OK ask-ava fail-closed");
console.log("OK Sarvam shared handler + production api/sarvam-tts.ts");

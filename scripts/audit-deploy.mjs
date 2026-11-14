/**
 * Pre-deploy checklist (offline). Verifies API routes, env template, and SPA config.
 * Run: node scripts/audit-deploy.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function mustExist(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`missing required file: ${rel}`);
  }
}

const REQUIRED_API = [
  "api/groq-chat.ts",
  "api/gemini-generate.ts",
  "api/student-doubt.ts",
  "api/sarvam-tts.ts",
  "api/ren.ts",
];

for (const rel of REQUIRED_API) mustExist(rel);

const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
for (const key of [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "GROQ_API_KEY",
  "SARVAM_API_KEY",
  "GEMINI_API_KEY",
]) {
  if (!envExample.includes(`${key}=`)) {
    throw new Error(`.env.example missing ${key}`);
  }
}

if (envExample.includes("VITE_GROQ_API_KEY=") && !envExample.includes("# VITE_GROQ_API_KEY")) {
  throw new Error(".env.example must not expose active VITE_GROQ_API_KEY");
}

const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
if (vercel.outputDirectory !== "dist") {
  throw new Error("vercel.json outputDirectory must be dist");
}
const hasSpaRewrite = (vercel.rewrites || []).some(
  (r) => typeof r.destination === "string" && r.destination.includes("index.html")
);
if (!hasSpaRewrite) {
  throw new Error("vercel.json missing SPA fallback rewrite");
}

const rlsMigration = path.join(
  root,
  "supabase/migrations/20260830000000_tighten_audio_cache_rls.sql"
);
if (!fs.existsSync(rlsMigration)) {
  throw new Error("missing audio cache RLS migration");
}

console.log("OK deploy audit — API routes present");
console.log(`OK .env.example documents ${REQUIRED_API.length} server proxies + Supabase`);
console.log("OK vercel.json SPA + dist output");
console.log("OK RLS migration file on disk (apply via supabase db push before prod)");

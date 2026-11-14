/**
 * Offline RLS audit: migrations vs client table usage.
 * Run: node scripts/audit-rls.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const srcDir = path.join(root, "src");

function readAllSql() {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8"))
    .join("\n");
}

function walkTsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") walkTsFiles(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const sql = readAllSql();

const rlsTables = new Set(
  [...sql.matchAll(/ALTER TABLE (?:public\.)?(\w+) ENABLE ROW LEVEL SECURITY/gi)].map(
    (m) => m[1].toLowerCase()
  )
);

const policies = [];
const droppedPolicies = new Set();

for (const m of sql.matchAll(
  /DROP POLICY IF EXISTS "([^"]+)"\s+ON (?:public\.)?(\w+)/gi
)) {
  droppedPolicies.add(`${m[2].toLowerCase()}::${m[1]}`);
}

for (const m of sql.matchAll(
  /CREATE POLICY "([^"]+)"\s+ON (?:public\.)?(\w+)\s+FOR (\w+)(?:\s+TO ([^\s]+))?[^;]*USING\s*\(([^)]*)\)/gis
)) {
  policies.push({
    name: m[1],
    table: m[2].toLowerCase(),
    action: m[3].toUpperCase(),
    role: m[4] || "default",
    using: m[5].trim(),
  });
}

const activePolicies = policies.filter(
  (p) => !droppedPolicies.has(`${p.table}::${p.name}`)
);

const tablesWithPolicy = new Set(activePolicies.map((p) => p.table));

const clientTables = new Set();
for (const file of walkTsFiles(srcDir)) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/supabase\.from\(['"](\w+)['"]\)/g)) {
    clientTables.add(m[1].toLowerCase());
  }
}

const issues = [];

for (const table of rlsTables) {
  if (!tablesWithPolicy.has(table)) {
    issues.push(`RLS enabled but no policy found: ${table}`);
  }
}

for (const table of clientTables) {
  if (!rlsTables.has(table)) {
    issues.push(`Client queries table without RLS in migrations: ${table}`);
  }
}

for (const p of activePolicies) {
  if (p.action === "ALL" && p.using === "true") {
    issues.push(`Overly permissive policy "${p.name}" on ${p.table} (FOR ALL USING true)`);
  }
}

const userScoped = activePolicies.filter(
  (p) => p.using.includes("auth.uid()") && p.using.includes("user_id")
);
const publicRead = activePolicies.filter((p) => p.using === "true" && p.action === "SELECT");

console.log(`RLS tables: ${rlsTables.size}`);
console.log(`Policies parsed: ${activePolicies.length} active (${policies.length} total)`);
console.log(`Client tables: ${[...clientTables].sort().join(", ")}`);
console.log(`User-scoped policies: ${userScoped.length}`);
console.log(`Public read policies: ${publicRead.length}`);

if (issues.length) {
  console.error("\nRLS AUDIT ISSUES:");
  for (const i of issues) console.error(`  - ${i}`);
  process.exit(1);
}

const expectedPublicRead = new Set([
  "video_library",
  "rebon_student_lessons",
  "rebon_professional_scenarios",
  "audio_files",
  "qa_voice_cache",
]);

for (const t of expectedPublicRead) {
  if (rlsTables.has(t) && !publicRead.some((p) => p.table === t)) {
    console.warn(`WARN: expected public read policy on ${t}`);
  }
}

console.log("\nOK RLS audit — no missing policies or permissive ALL(true) rules in migrations");

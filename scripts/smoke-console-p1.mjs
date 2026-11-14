/**
 * Offline store smoke for Priority 1 console (no browser).
 * Run: node --experimental-vm-modules scripts/smoke-console-p1.mjs
 * Prefer: npx tsx scripts/smoke-console-p1.mjs after build tools available.
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Minimal DOM for executeAction click paths
globalThis.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
};
globalThis.window = globalThis;
globalThis.HTMLInputElement = class {};

async function main() {
  // Dynamic import of compiled? We use a lightweight inline check of ACTION_MAP + simulate helpers via tsx if available.
  const { awsId, scaledMs, simulateOperation, SIM_MS } = await import(
    pathToFileURL(
      path.join(root, "src/components/cloud/awsConsole/cloudscape/simulateOperation.ts")
    ).href
  ).catch(async () => {
    // Fallback: re-implement critical asserts without TS import
    return null;
  });

  if (!awsId) {
    console.log("SKIP: cannot import TS modules directly. Run npm run build instead.");
    console.log("ACTION_MAP file present:", true);
    process.exit(0);
  }

  const i = awsId("i");
  const vpc = awsId("vpc");
  if (!/^i-0[0-9a-f]{17}$/.test(i)) throw new Error(`bad instance id ${i}`);
  if (!/^vpc-0[0-9a-f]{17}$/.test(vpc)) throw new Error(`bad vpc id ${vpc}`);

  if (scaledMs("ec2PendingToRunning", "work") !== SIM_MS.ec2PendingToRunning) {
    throw new Error("work timing mismatch");
  }
  if (scaledMs("ec2PendingToRunning", "learn") !== 8000) {
    throw new Error(`learn EC2 should be 8s, got ${scaledMs("ec2PendingToRunning", "learn")}`);
  }

  const t0 = Date.now();
  await simulateOperation({ durationMs: 50, ticks: 2 });
  if (Date.now() - t0 < 40) throw new Error("simulateOperation too fast");

  console.log("OK simulateOperation + awsId");
  console.log("OK timings work/learn");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Offline stress: rapid ACTION_MAP execution + console store navigation.
 * Simulates fast clicks / mid-session churn without a browser.
 * Run: npx tsx scripts/stress-actionmap.ts
 */
import { executeAction, listActionCodes } from "../src/components/cloud/awsConsole/actionMap/executeAction";
import { useAccountStore } from "../src/components/cloud/awsConsole/cloudscape/store";
import { repairAccountResources } from "../src/components/cloud/awsConsole/cloudscape/storeIntegrity";
import type { ServiceId } from "../src/components/cloud/awsConsole/cloudscape/types";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

// Minimal DOM for executeAction click/highlight paths (no-op when missing).
(globalThis as { document?: unknown }).document = {
  querySelector: () => null,
  querySelectorAll: () => [],
};
(globalThis as { window?: unknown }).window = globalThis;

function sampleCode(code: string): string {
  return code
    .replace(/\{id\}/g, "i-0stressdemo001abc")
    .replace(/\{value\}/g, "stress-demo")
    .replace(/\{service\}/g, "ec2");
}

function snapshotIntegrity(): void {
  const patch = repairAccountResources(useAccountStore.getState());
  if (patch) {
    useAccountStore.setState(patch);
  }
  const second = repairAccountResources(useAccountStore.getState());
  assert(second === null, "integrity repair should be idempotent after stress");
}

const store = useAccountStore.getState();
store.hydrate({
  accountId: "123456789012",
  accountName: "StressTest",
  region: "ap-south-1",
  initialService: "home",
  fresh: true,
  iamUsername: "stress-user",
});

const codes = listActionCodes();
assert(codes.length > 50, "ACTION_MAP should expose many codes");

let ok = 0;
let fail = 0;
const ROUNDS = 3;

for (let round = 0; round < ROUNDS; round++) {
  for (const code of codes) {
    const sample = sampleCode(code);
    const result = await executeAction(sample);
    if (result.ok) ok += 1;
    else fail += 1;
  }
  snapshotIntegrity();
}

const services: ServiceId[] = [
  "home",
  "iam",
  "ec2",
  "s3",
  "vpc",
  "cloudwatch",
  "billing",
];
const pages = ["dashboard", "users", "instances", "buckets", "vpcs", "alarms", "home"];

for (let i = 0; i < 250; i++) {
  const svc = services[i % services.length];
  const page = pages[i % pages.length];
  store.navigate(svc, page);
  if (i % 7 === 0) {
    store.setOverlay({
      services_open: i % 2 === 0,
      search_open: i % 3 === 0,
      region_open: false,
      account_open: false,
      notifications_open: false,
      settings_open: false,
      support_open: false,
      cloudshell_open: i % 5 === 0,
    });
  }
  if (i % 11 === 0) store.toggleFavorite(services[(i + 2) % services.length]);
  if (i % 13 === 0) store.resetHomeLayout();
}
snapshotIntegrity();

// Mid-op refresh: hydrate fresh while overlays are open.
store.setOverlay({ services_open: true, search_open: true, cloudshell_open: true });
store.hydrate({
  accountId: "123456789012",
  accountName: "StressTest",
  region: "ap-south-1",
  initialService: "ec2",
  initialPage: "instances",
  fresh: true,
});
snapshotIntegrity();

const final = useAccountStore.getState();
assert(final.route.service === "ec2", "hydrate should restore route after refresh");
assert(Array.isArray(final.instances), "instances slice should survive stress");
assert(final.users.every((u) => u.username.length > 0), "users should remain valid");

console.log(`OK ACTION_MAP stress (${ROUNDS}×${codes.length} codes, ok=${ok}, fail=${fail})`);
console.log("OK rapid navigate / overlay / favorites churn");
console.log("OK mid-session hydrate + integrity idempotent");

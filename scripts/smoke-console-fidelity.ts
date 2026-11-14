/**
 * TDD smoke — real-AWS familiarity (F0/F1/F2).
 * Run: npx tsx scripts/smoke-console-fidelity.ts
 */
import { executeAction } from "../src/components/cloud/awsConsole/actionMap/executeAction";
import { useAccountStore } from "../src/components/cloud/awsConsole/cloudscape/store";
import { SIM_MS, scaledMs } from "../src/components/cloud/awsConsole/cloudscape/simulateOperation";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

(globalThis as { document?: unknown }).document = {
  querySelector: () => null,
  querySelectorAll: () => [],
};
(globalThis as { window?: unknown }).window = globalThis;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stubSrc = readFileSync(
  join(root, "src/components/cloud/awsConsole/cloudscape/AwsConsoleStubPanel.tsx"),
  "utf8"
);
assert(!/\blab account\b|later pass|this simulated/i.test(stubSrc), "stub panel must not say lab/simulated");
assert(
  /You don(?:&apos;|')t have any/i.test(stubSrc),
  "stub uses real AWS empty-state phrasing"
);

const consoleSrc = readFileSync(
  join(root, "src/components/cloud/awsConsole/cloudscape/AwsConsole.tsx"),
  "utf8"
);
assert(
  !/mode === ["']learn["'][\s\S]{0,200}skip AppLayout|Learn mode: skip AppLayout/i.test(
    consoleSrc
  ),
  "Learn must not skip AppLayout"
);
assert(/data-console-mode=\{mode\}/.test(consoleSrc), "mode attribute present");
assert(!/Launch instances/.test(consoleSrc) || !/#launch-instance/.test(consoleSrc), "Launch instances not a side-nav leaf");
assert(!/#create-bucket/.test(consoleSrc.split("s3:")[1]?.split("vpc:")[0] || ""), "Create bucket not in S3 side nav");
assert(/Endpoints/.test(consoleSrc), "VPC Endpoints in nav");
assert(/Peering connections/.test(consoleSrc), "VPC Peering in nav");
assert(/Logs Insights/.test(consoleSrc), "CW Logs Insights label");
assert(!/Events[\s\S]{0,80}Rules/.test(consoleSrc), "EventBridge Rules not under CW");

// Work-mode timing feels like real AWS
assert(SIM_MS.vpcCreateNat >= 60_000, `NAT work wait too short: ${SIM_MS.vpcCreateNat}`);
assert(SIM_MS.ec2StatusChecks >= 60_000, `status checks too short: ${SIM_MS.ec2StatusChecks}`);
assert(SIM_MS.ec2Stop >= 25_000, `stop too short: ${SIM_MS.ec2Stop}`);
assert(scaledMs("vpcCreateNat", "work") === SIM_MS.vpcCreateNat, "work NAT = full");
assert(scaledMs("vpcCreateNat", "learn") < SIM_MS.vpcCreateNat, "learn NAT scaled");

useAccountStore.getState().hydrate({
  accountId: "123456789012",
  accountName: "FidelityLab",
  region: "ap-south-1",
  initialService: "home",
  fresh: false,
});

const fidelityNav = [
  { code: "NAV:vpc-endpoints", service: "vpc", page: "endpoints" },
  { code: "NAV:vpc-peering", service: "vpc", page: "peering-connections" },
  { code: "NAV:iam-security-credentials", service: "iam", page: "security-credentials" },
  { code: "NAV:iam-organizations", service: "iam", page: "organizations" },
  { code: "NAV:ec2-key-pairs", service: "ec2", page: "key-pairs" },
  { code: "NAV:s3-account-bpa", service: "s3", page: "account-bpa" },
];

for (const c of fidelityNav) {
  const r = await executeAction(c.code);
  assert(r.ok, `${c.code}: ${"reason" in r ? r.reason : ""}`);
  const route = useAccountStore.getState().route;
  assert(route.service === c.service && route.page === c.page, `${c.code} route`);
}

console.log("smoke-console-fidelity: PASS");
console.log(`  nav cases: ${fidelityNav.length}`);
console.log(`  NAT work ms: ${SIM_MS.vpcCreateNat}`);
console.log(`  status-check work ms: ${SIM_MS.ec2StatusChecks}`);

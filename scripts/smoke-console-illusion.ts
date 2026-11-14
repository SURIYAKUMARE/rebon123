/**
 * TDD smoke — AWS console illusion backbone (P0).
 * RED→GREEN: shell contract, timing IDs, NAV dispatch for 6 services.
 * Run: npx tsx scripts/smoke-console-illusion.ts
 */
import {
  OPS_SHELL_CONTRACT,
  normalizeAccountId,
  accountIdsMatch,
  formatAccountIdDisplay,
} from "../src/components/cloud/awsConsole/shellContract";
import {
  SIM_MS,
  scaledMs,
  awsId,
  simulateOperation,
} from "../src/components/cloud/awsConsole/cloudscape/simulateOperation";
import { executeAction } from "../src/components/cloud/awsConsole/actionMap/executeAction";
import { useAccountStore } from "../src/components/cloud/awsConsole/cloudscape/store";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

(globalThis as { document?: unknown }).document = {
  querySelector: () => null,
  querySelectorAll: () => [],
};
(globalThis as { window?: unknown }).window = globalThis;

// --- shell contract: all 6 launch services ---
const env = OPS_SHELL_CONTRACT.environmentIds;
assert(env.iam === "aws_iam_console", "iam env id");
assert(env.vpc === "aws_vpc_console", "vpc env id");
assert(env.ec2 === "aws_ec2_console", "ec2 env id");
assert(env.s3 === "aws_s3_console", "s3 env id");
assert(env.cloudwatch === "aws_cloudwatch_console", "cw env id");
assert(env.billing === "aws_billing_console", "billing env id");

assert(normalizeAccountId("1234-5678-9012") === "123456789012", "normalize");
assert(accountIdsMatch("1234-5678-9012", "123456789012"), "match");
assert(
  formatAccountIdDisplay("123456789012") === "1234-5678-9012",
  "format display"
);

// --- timing illusion ---
assert(scaledMs("iamCreateUser", "work") === SIM_MS.iamCreateUser, "iam work ms");
assert(scaledMs("ec2PendingToRunning", "work") === 35_000, "ec2 pending work");
assert(scaledMs("ec2PendingToRunning", "learn") === 8_000, "ec2 pending learn");
assert(scaledMs("vpcAndMore", "learn") === 12_000, "vpc learn scale");

const idI = awsId("i");
assert(/^i-0[a-f0-9]{16}$/.test(idI), `instance id shape: ${idI}`);
const idV = awsId("vpc");
assert(/^vpc-0[a-f0-9]{16}$/.test(idV), `vpc id shape: ${idV}`);
const idNat = awsId("nat");
assert(/^nat-0[a-f0-9]{16}$/.test(idNat), `nat id shape: ${idNat}`);
const akia = awsId("akia");
assert(/^AKIA[A-F0-9]{16}$/.test(akia), `akia shape: ${akia}`);

// simulateOperation progress + abort
let ticks = 0;
await simulateOperation({
  durationMs: 30,
  ticks: 3,
  onTick: () => {
    ticks += 1;
  },
});
assert(ticks === 3, `expected 3 ticks got ${ticks}`);

const ac = new AbortController();
ac.abort();
let aborted = false;
try {
  await simulateOperation({ durationMs: 1000, signal: ac.signal });
} catch (e) {
  aborted =
    e instanceof DOMException
      ? e.name === "AbortError"
      : e instanceof Error && e.name === "AbortError";
}
assert(aborted, "simulateOperation should honor abort");

// --- NAV dispatch: junior entry for all 6 ---
useAccountStore.getState().hydrate({
  accountId: "123456789012",
  accountName: "IllusionLab",
  region: "ap-south-1",
  initialService: "home",
  fresh: true,
});

const navCases: Array<{ code: string; service: string; page?: string }> = [
  { code: "NAV:console-home", service: "home" },
  { code: "NAV:iam-users", service: "iam", page: "users" },
  { code: "NAV:ec2-instances", service: "ec2", page: "instances" },
  { code: "NAV:s3-buckets", service: "s3", page: "buckets" },
  { code: "NAV:vpc-vpcs", service: "vpc", page: "vpcs" },
  { code: "NAV:vpc-subnets", service: "vpc", page: "subnets" },
  { code: "NAV:vpc-route-tables", service: "vpc", page: "route-tables" },
  { code: "NAV:cw-alarms", service: "cloudwatch", page: "alarms" },
  { code: "NAV:cw-dashboards", service: "cloudwatch", page: "dashboards" },
  { code: "NAV:cw-create-alarm", service: "cloudwatch", page: "create-alarm" },
  { code: "NAV:billing-dashboard", service: "billing", page: "dashboard" },
  { code: "NAV:cost-explorer", service: "billing", page: "cost-explorer" },
  { code: "NAV:budgets-list", service: "billing", page: "budgets" },
  { code: "NAV:budgets-create", service: "billing", page: "create-budget" },
];

for (const c of navCases) {
  const result = await executeAction(c.code);
  assert(result.ok, `${c.code} should dispatch: ${"reason" in result ? result.reason : ""}`);
  const route = useAccountStore.getState().route;
  assert(route.service === c.service, `${c.code} service → ${route.service}`);
  if (c.page) {
    assert(route.page === c.page, `${c.code} page → ${route.page}`);
  }
}

console.log("smoke-console-illusion: PASS");
console.log(`  env services: ${Object.keys(env).length}`);
console.log(`  nav cases: ${navCases.length}`);

/**
 * TDD smoke — P1 junior blockers (key pairs, NAT, account BPA, Bills, CW metrics/Insights).
 * Run: npx tsx scripts/smoke-console-p1.ts
 */
import { executeAction } from "../src/components/cloud/awsConsole/actionMap/executeAction";
import { useAccountStore } from "../src/components/cloud/awsConsole/cloudscape/store";
import { SIM_MS, scaledMs } from "../src/components/cloud/awsConsole/cloudscape/simulateOperation";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

(globalThis as { document?: unknown }).document = {
  querySelector: () => null,
  querySelectorAll: () => [],
};
(globalThis as { window?: unknown }).window = globalThis;

useAccountStore.getState().hydrate({
  accountId: "123456789012",
  accountName: "P1Lab",
  region: "ap-south-1",
  initialService: "home",
  fresh: false,
});

// Force learn mode so createKeyPair / createNat complete quickly in smoke
useAccountStore.setState({ consoleMode: "learn" });

assert(scaledMs("ec2CreateKeyPair", "learn") === SIM_MS.ec2CreateKeyPair, "key pair learn ms");
assert(typeof SIM_MS.vpcCreateNat === "number" && SIM_MS.vpcCreateNat > 0, "nat sim ms");

const navCases: Array<{ code: string; service: string; page: string }> = [
  { code: "NAV:ec2-key-pairs", service: "ec2", page: "key-pairs" },
  { code: "NAV:vpc-nat-gateways", service: "vpc", page: "nat-gateways" },
  { code: "NAV:s3-account-bpa", service: "s3", page: "account-bpa" },
  { code: "NAV:billing-bills", service: "billing", page: "bills" },
  { code: "NAV:cw-metrics", service: "cloudwatch", page: "metrics-all" },
  { code: "NAV:cw-logs-insights", service: "cloudwatch", page: "logs-insights" },
];

for (const c of navCases) {
  const result = await executeAction(c.code);
  assert(result.ok, `${c.code} should dispatch: ${"reason" in result ? result.reason : ""}`);
  const route = useAccountStore.getState().route;
  assert(route.service === c.service, `${c.code} service → ${route.service}`);
  assert(route.page === c.page, `${c.code} page → ${route.page}`);
}

// Seed must expose junior resources
const seeded = useAccountStore.getState();
assert(seeded.key_pairs.length >= 1, "seed key_pairs");
assert(seeded.nat_gateways.length >= 1, "seed nat_gateways");
assert(seeded.account_bpa.block_acls === true, "seed account BPA on");
assert(seeded.cost_rows.length >= 1, "seed cost_rows for Bills");
assert(seeded.insight_logs.length >= 1, "seed insight_logs");

// createKeyPair mutates store
const beforeKeys = seeded.key_pairs.length;
await useAccountStore.getState().createKeyPair("smoke-p1-key", "rsa");
const afterKeys = useAccountStore.getState().key_pairs;
assert(afterKeys.length === beforeKeys + 1, "createKeyPair adds row");
assert(
  afterKeys.some((k) => k.name === "smoke-p1-key"),
  "createKeyPair name present"
);

// setAccountBpa
useAccountStore.getState().setAccountBpa({
  block_acls: true,
  ignore_acls: true,
  block_policy: false,
  restrict_buckets: true,
});
assert(
  useAccountStore.getState().account_bpa.block_policy === false,
  "setAccountBpa updates block_policy"
);

// createNatGateway (learn mode ~3s)
const subnet =
  useAccountStore.getState().subnets.find((s) => s.subnet_type === "public") ||
  useAccountStore.getState().subnets[0];
assert(subnet, "need a subnet for NAT");
const beforeNat = useAccountStore.getState().nat_gateways.length;
await useAccountStore.getState().createNatGateway({
  name: "smoke-nat",
  subnet_id: subnet!.id,
  connectivity: "public",
});
const nats = useAccountStore.getState().nat_gateways;
assert(nats.length === beforeNat + 1, "createNatGateway adds row");
const created = nats.find((n) => n.name === "smoke-nat");
assert(created?.state === "available", `NAT should be available, got ${created?.state}`);

// Bills total from cost_rows
const billTotal = useAccountStore
  .getState()
  .cost_rows.reduce((s, r) => s + r.this_month, 0);
assert(billTotal > 0, "Bills total > 0 from cost_rows");

console.log("smoke-console-p1: PASS");
console.log(`  nav cases: ${navCases.length}`);
console.log(`  key_pairs: ${afterKeys.length}`);
console.log(`  nat_gateways: ${nats.length}`);
console.log(`  bill total: $${billTotal.toFixed(2)}`);

/**
 * Offline stress checks for AWS console store integrity (no browser).
 * Run: npx tsx scripts/stress-store-integrity.ts
 */
import {
  repairAccountResources,
  validateBucketName,
  validateIamUsername,
  type AccountResourceSlice,
} from "../src/components/cloud/awsConsole/cloudscape/storeIntegrity";

function emptySlice(): AccountResourceSlice {
  return {
    users: [],
    groups: [],
    roles: [],
    policies: [],
    instances: [],
    asgs: [],
    load_balancers: [],
    buckets: [],
    vpcs: [],
    subnets: [],
    security_groups: [],
    igws: [],
    route_tables: [],
    dashboards: [],
    alarms: [],
    log_groups: [],
    budgets: [],
  };
}

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

// ── Input validators (null = invalid, string = cleaned value) ───────────────
assert(validateIamUsername("admin") === "admin", "valid IAM username rejected");
assert(validateIamUsername("") === null, "empty IAM username accepted");
assert(validateIamUsername("  ") === null, "blank IAM username accepted");

assert(validateBucketName("my-bucket-01") === "my-bucket-01", "valid bucket name rejected");
assert(validateBucketName("-invalid") === null, "invalid bucket prefix accepted");
assert(validateBucketName("ab") === null, "too-short bucket name accepted");

// ── Dangling VPC references ─────────────────────────────────────────────────
const danglingVpc = {
  ...emptySlice(),
  vpcs: [
    {
      id: "vpc-0abc",
      name: "main",
      state: "available" as const,
      cidr: "10.0.0.0/16",
      ipv6: null,
      dhcp: "default",
      main_route_table: "rtb-main",
    },
  ],
  subnets: [
    {
      id: "subnet-0aaa",
      name: "public-a",
      state: "available" as const,
      vpc: "vpc-missing",
      cidr: "10.0.1.0/24",
      az: "ap-south-1a",
      public_ip_on_launch: true,
    },
  ],
};
const danglingPatch = repairAccountResources(danglingVpc);
assert(danglingPatch?.subnets?.length === 0, "dangling subnet should be removed");

// ── Invalid EC2 state ───────────────────────────────────────────────────────
const badInstance = {
  ...emptySlice(),
  instances: [
    {
      id: "i-0123456789abcdef0",
      name: "web",
      state: "flying" as never,
      type: "t3.micro",
      status_check: "initializing" as const,
      alarm_status: "No alarms" as const,
      az: "ap-south-1a",
      region: "ap-south-1",
      public_ip: null,
      private_ip: "10.0.1.10",
    },
  ],
};
const instancePatch = repairAccountResources(badInstance);
assert(
  instancePatch?.instances?.[0]?.state === "stopped",
  "invalid EC2 state should reset to stopped"
);

// ── Invalid favorites ───────────────────────────────────────────────────────
const badFavorites = {
  ...emptySlice(),
  favorites: ["ec2", "not-a-service" as never],
};
const favPatch = repairAccountResources(badFavorites);
assert(favPatch?.favorites?.length === 1, "invalid favorites should be stripped");
assert(favPatch?.favorites?.[0] === "ec2", "valid favorite should remain");

// ── Idempotent repair (apply patch, repair again) ───────────────────────────
const repaired = {
  ...badFavorites,
  ...favPatch,
};
const secondPass = repairAccountResources(repaired);
assert(secondPass === null, "repaired state should need no second patch");

// ── Rapid repeated repair on clean state (stress) ───────────────────────────
const clean = emptySlice();
for (let i = 0; i < 100; i++) {
  const patch = repairAccountResources(clean);
  assert(patch === null, `clean state should not patch on iteration ${i}`);
}

console.log("OK store integrity validators");
console.log("OK dangling VPC / invalid EC2 / favorites repair");
console.log("OK idempotent + 100x clean-state stress");

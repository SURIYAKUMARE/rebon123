/**
 * TDD smoke — P3 familiarity depth (catalog, NACL, IdP, TG, cost tags).
 * Run: npx tsx scripts/smoke-console-p3.ts
 */
import { executeAction } from "../src/components/cloud/awsConsole/actionMap/executeAction";
import { useAccountStore } from "../src/components/cloud/awsConsole/cloudscape/store";
import {
  SERVICE_CATALOG,
  SERVICE_CATEGORIES,
  catalogMatchesQuery,
} from "../src/components/cloud/awsConsole/cloudscape/serviceCatalog";

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
  accountName: "P3Lab",
  region: "ap-south-1",
  initialService: "home",
  fresh: false,
});

// Catalog completeness
const cats = SERVICE_CATEGORIES.filter(
  (c) => c !== "Favorites" && c !== "All services" && c !== "Recently visited"
);
for (const cat of cats) {
  const n = SERVICE_CATALOG.filter((s) => s.category === cat).length;
  assert(n >= 1, `category ${cat} must have ≥1 service (got ${n})`);
}
assert(SERVICE_CATALOG.filter((c) => c.launchId).length >= 6, "6 launch services");
assert(catalogMatchesQuery(SERVICE_CATALOG.find((c) => c.slug === "lambda")!, "lambda"), "find lambda");
assert(catalogMatchesQuery(SERVICE_CATALOG.find((c) => c.slug === "rds")!, "rds"), "find rds");

// Seed depth
const s = useAccountStore.getState();
assert(s.network_acls.length >= 1, "seed NACLs");
assert(s.network_acls[0].inbound.some((r) => r.rule_number === 100), "NACL rule 100");
assert(s.network_acls[0].inbound.some((r) => r.rule_number === "*"), "NACL * deny");
assert(s.target_groups.length >= 1, "seed target groups");
assert(s.target_groups[0].load_balancer_arns.length >= 1, "TG linked to LB");
assert(s.cost_allocation_tags.some((t) => t.status === "Active"), "active cost tags");

const navs = [
  { code: "NAV:vpc-network-acls", service: "vpc", page: "network-acls" },
  { code: "NAV:ec2-target-groups", service: "ec2", page: "target-groups" },
  { code: "NAV:billing-cost-tags", service: "billing", page: "cost-allocation-tags" },
];
for (const c of navs) {
  const r = await executeAction(c.code);
  assert(r.ok, `${c.code}`);
  const route = useAccountStore.getState().route;
  assert(route.service === c.service && route.page === c.page, `${c.code} route`);
}

// Mutations
useAccountStore.getState().addIdentityProvider({
  name: "corp-sso",
  type: "SAML",
});
assert(
  useAccountStore.getState().identity_providers.some((p) => p.name === "corp-sso"),
  "IdP added"
);

useAccountStore.getState().createTargetGroup({
  name: "smoke-tg",
  protocol: "HTTP",
  port: 8080,
  vpc: useAccountStore.getState().vpcs[0].id,
  target_type: "instance",
});
assert(
  useAccountStore.getState().target_groups.some((g) => g.name === "smoke-tg"),
  "TG created"
);

useAccountStore.getState().setCostAllocationTagStatus("aws:createdBy", "Active");
assert(
  useAccountStore.getState().cost_allocation_tags.find((t) => t.key === "aws:createdBy")
    ?.status === "Active",
  "tag activated"
);

console.log("smoke-console-p3: PASS");
console.log(`  catalog services: ${SERVICE_CATALOG.length}`);
console.log(`  categories: ${cats.length}`);
console.log(`  nav cases: ${navs.length}`);

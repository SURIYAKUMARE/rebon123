/**
 * TDD smoke — P2 chrome polish (search aliases, overlays, region lock, ACTION_MAP).
 * Run: npx tsx scripts/smoke-console-p2.ts
 */
import { executeAction } from "../src/components/cloud/awsConsole/actionMap/executeAction";
import { useAccountStore } from "../src/components/cloud/awsConsole/cloudscape/store";
import {
  SERVICES,
  serviceMatchesQuery,
} from "../src/components/cloud/awsConsole/cloudscape/ui";

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
  accountName: "P2Lab",
  region: "ap-south-1",
  initialService: "home",
  fresh: false,
});

// Billing searchable by aliases
assert(serviceMatchesQuery(SERVICES.find((s) => s.id === "billing")!, "billing"), "alias billing");
assert(serviceMatchesQuery(SERVICES.find((s) => s.id === "billing")!, "ce"), "alias ce");
assert(serviceMatchesQuery(SERVICES.find((s) => s.id === "billing")!, "cost"), "alias cost");
assert(serviceMatchesQuery(SERVICES.find((s) => s.id === "cloudwatch")!, "cw"), "alias cw");

const chromeClicks = [
  "CLICK:btn-services-mega-menu",
  "CLICK:btn-global-search",
  "CLICK:btn-region-selector",
  "CLICK:btn-account-menu",
  "CLICK:btn-notifications-bell",
];
for (const code of chromeClicks) {
  const r = await executeAction(code);
  assert(r.ok, `${code} should dispatch`);
}
assert(useAccountStore.getState().notifications_open, "notifications open after click");

const fill = await executeAction("FILL:global-search-input:billing");
assert(fill.ok, "FILL global search");
assert(useAccountStore.getState().search_query === "billing", "search query set");
assert(useAccountStore.getState().search_open, "search open");

const selectBilling = await executeAction("SELECT:search-result-service-billing");
assert(selectBilling.ok, "SELECT billing from search");
assert(useAccountStore.getState().route.service === "billing", "navigated to billing");

// S3 is regional (not Global-locked) — navigate and check store only; lock is UI
await executeAction("SELECT:search-result-service-s3");
assert(useAccountStore.getState().route.service === "s3", "navigated to s3");

// IAM stays a valid Global service target
await executeAction("SELECT:search-result-service-iam");
assert(useAccountStore.getState().route.service === "iam", "navigated to iam");

// Widget toggle
const before = useAccountStore.getState().homeLayout.widgets.length;
const tog = await executeAction("TOGGLE:widget-welcome-visibility");
assert(tog.ok, "toggle welcome widget");
const after = useAccountStore.getState().homeLayout.widgets.length;
assert(after !== before, "widget list changed");

const shell = await executeAction("NAV:open-cloudshell-drawer");
assert(shell.ok, "open cloudshell");
assert(useAccountStore.getState().cloudshell_open, "cloudshell open");

console.log("smoke-console-p2: PASS");
console.log(`  services: ${SERVICES.length}`);
console.log(`  chrome clicks: ${chromeClicks.length}`);

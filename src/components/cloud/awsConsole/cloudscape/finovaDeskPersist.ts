import type { AccountSnapshot } from "./types";

const STORAGE_KEY = "rebon_finova_desk_v1";

const FIELDS: (keyof AccountSnapshot)[] = [
  "identity",
  "users",
  "groups",
  "roles",
  "policies",
  "available_policies",
  "instances",
  "asgs",
  "load_balancers",
  "key_pairs",
  "elastic_ips",
  "network_interfaces",
  "launch_templates",
  "placement_groups",
  "spot_requests",
  "reserved_instances",
  "launch_configurations",
  "buckets",
  "account_bpa",
  "vpcs",
  "subnets",
  "security_groups",
  "igws",
  "route_tables",
  "nat_gateways",
  "network_acls",
  "vpc_endpoints",
  "endpoint_services",
  "peering_connections",
  "customer_gateways",
  "virtual_private_gateways",
  "vpn_connections",
  "prefix_lists",
  "egress_igws",
  "carrier_gateways",
  "dhcp_option_sets",
  "identity_providers",
  "target_groups",
  "cost_allocation_tags",
  "dashboards",
  "alarms",
  "log_groups",
  "insight_logs",
  "budgets",
  "cost_rows",
];

function isSnapshot(value: unknown): value is AccountSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as AccountSnapshot;
  return Boolean(row.identity?.account_id) && Array.isArray(row.users);
}

/** Company account after the student has changed it. Next ticket continues from here. */
export function readFinovaDesk(): AccountSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeFinovaDesk(state: AccountSnapshot) {
  const snap = {} as Record<keyof AccountSnapshot, unknown>;
  for (const field of FIELDS) {
    snap[field] = state[field];
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* quota — desk still works for this visit */
  }
}

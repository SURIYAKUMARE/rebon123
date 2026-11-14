/**
 * Seed Primary query_cache alternate paths for CSA L1 lessons.
 */
import {
  upsertPrimaryQueryCache,
  normalizeQueryFingerprint,
} from "./primaryStore";
import type { PrimaryQueryCacheEntry } from "@/types/knowledgeContainer";

type Seed = {
  lessonId: string;
  patterns: string[];
  speech: string;
  ui_surface: "BOARD" | "CONSOLE" | "NONE";
  actions?: string[];
};

const SEEDS: Seed[] = [
  {
    lessonId: "PM-1.1",
    patterns: ["reset mfa", "how to reset mfa", "mfa locked out"],
    speech:
      "MFA reset is a privileged path at Finova — open the user, Security credentials, manage MFA. For L1, confirm ticket approval from Arjun before you remove a device. Never share temporary codes in chat.",
    ui_surface: "CONSOLE",
    actions: ["NAV:iam-users"],
  },
  {
    lessonId: "PM-1.1",
    patterns: ["rotate access key", "access key leaked", "disable access key"],
    speech:
      "Deactivate or delete the leaked key first, then create a new one only if still required. Paste the secret through the approved vault channel — never Slack.",
    ui_surface: "CONSOLE",
    actions: ["NAV:iam-users"],
  },
  {
    lessonId: "PM-1.3",
    patterns: ["what is explicit deny", "deny vs allow", "deny wins"],
    speech:
      "Explicit Deny always wins over Allow. If nothing Allows the action, that is an implicit deny — the call still fails.",
    ui_surface: "BOARD",
    actions: [],
  },
  {
    lessonId: "PM-1.4",
    patterns: ["just give admin", "attach administratoraccess", "admin to fix denied"],
    speech:
      "That fails the Finova security audit. Find the missing Allow or the Deny, then attach a scoped policy to the group. AdministratorAccess is not an L1 fix.",
    ui_surface: "BOARD",
    actions: [],
  },
  {
    lessonId: "PM-1.2",
    patterns: ["trust vs permission", "difference trust policy", "what is trust policy"],
    speech:
      "Trust policy answers who can AssumeRole. Permission policies answer what they can do after they assume. Diagnose which document failed before you edit.",
    ui_surface: "BOARD",
    actions: [],
  },
  {
    lessonId: "PM-1.5",
    patterns: ["how to use cloudtrail", "where is event history", "open cloudtrail"],
    speech:
      "For L1 learning we stay on the board — learn eventName, userIdentity, eventTime, requestParameters, errorCode. Full Event history console comes with workspace tickets.",
    ui_surface: "BOARD",
    actions: [],
  },
  {
    lessonId: "PM-5.1",
    patterns: ["empty dashboard", "no metrics showing", "graph is blank"],
    speech:
      "Check region first — CloudWatch metrics are regional. Then confirm the namespace and that the resource is emitting.",
    ui_surface: "CONSOLE",
    actions: ["NAV:cw-dashboards"],
  },
  {
    lessonId: "PM-5.2",
    patterns: [
      "insufficient_data",
      "why insufficient data",
      "alarm insufficient",
    ],
    speech:
      "INSUFFICIENT_DATA means not enough datapoints yet — wrong region, metric not emitting, or period/datapoints not met. It is not the same as OK.",
    ui_surface: "CONSOLE",
    actions: ["NAV:cw-alarms"],
  },
  {
    lessonId: "PM-5.3",
    patterns: ["how to query logs", "insights query", "filter error logs"],
    speech:
      "Open the right log group, set the time range to the alarm window, then fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20.",
    ui_surface: "CONSOLE",
    actions: ["NAV:cw-logs-insights"],
  },
];

export function seedCsaL1Cache(): void {
  const now = new Date().toISOString();
  for (const s of SEEDS) {
    const entry: PrimaryQueryCacheEntry = {
      fingerprint: normalizeQueryFingerprint(s.patterns[0]),
      match_patterns: s.patterns,
      response: {
        speech: s.speech,
        ui_surface: s.ui_surface,
        actions: s.actions || [],
        source: "primary",
        staging_id: null,
      },
      updated_at: now,
    };
    upsertPrimaryQueryCache(s.lessonId, entry, "english");
  }
}

if (typeof window !== "undefined") {
  try {
    seedCsaL1Cache();
  } catch {
    /* ignore */
  }
}

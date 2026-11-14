import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { IamSimState } from "@/types/cloudLesson";
import { createFreshBiteSeed, createEmptyAccountSeed, createFinovaDeskSeed } from "./seed";
import { readFinovaDesk } from "./finovaDeskPersist";
import { awsId, scaledMs, simulateOperation, SIM_MS, beginEc2Transition, cancelAllEc2Transitions, isAbortError } from "./simulateOperation";
import {
  rememberGoodResources,
  repairAccountResources,
  validateBucketName,
  validateEc2LaunchInput,
  validateIamUsername,
} from "./storeIntegrity";
import type {
  AccountSnapshot,
  ActionLogEntry,
  ConsoleMode,
  ConsoleRoute,
  Ec2InstanceState,
  FlashMessage,
  GradingAction,
  IamUser,
  OverlayState,
  ServiceId,
  VisualMode,
  S3ObjectItem,
  CwAlarm,
  Budget,
  HomeLayoutState,
  HomeWidgetId,
} from "./types";

const THEME_STORAGE_KEY = "rebon-aws-console-theme";
const FAV_STORAGE_KEY = "rebon-aws-console-favorites";
const HOME_LAYOUT_KEY = "rebon-aws-console-home-layout";

const DEFAULT_HOME_LAYOUT: HomeLayoutState = {
  widgets: ["welcome", "cost", "recent", "health", "favorites", "trusted"],
  showFavIcon: true,
  showFavName: true,
};

const VALID_SERVICE_IDS: readonly ServiceId[] = [
  "home",
  "iam",
  "ec2",
  "s3",
  "vpc",
  "cloudwatch",
  "billing",
  "catalog",
];

const VALID_HOME_WIDGETS: readonly HomeWidgetId[] = [
  "welcome",
  "cost",
  "recent",
  "health",
  "favorites",
  "trusted",
  "explore",
];

function loadFavorites(): ServiceId[] {
  const fallback: ServiceId[] = ["ec2", "s3", "vpc"];
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const valid = parsed.filter(
      (x): x is ServiceId =>
        typeof x === "string" &&
        (VALID_SERVICE_IDS as readonly string[]).includes(x)
    );
    return valid.length ? valid : fallback;
  } catch {
    return fallback;
  }
}

function persistFavorites(favs: ServiceId[]) {
  try {
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favs));
  } catch {
    /* ignore */
  }
}

function loadHomeLayout(): HomeLayoutState {
  const fallback = {
    ...DEFAULT_HOME_LAYOUT,
    widgets: [...DEFAULT_HOME_LAYOUT.widgets],
  };
  try {
    const raw = localStorage.getItem(HOME_LAYOUT_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const p = parsed as Record<string, unknown>;
    const widgets = Array.isArray(p.widgets)
      ? p.widgets.filter((w): w is HomeWidgetId =>
          typeof w === "string" &&
          (VALID_HOME_WIDGETS as readonly string[]).includes(w)
        )
      : [];
    return {
      ...DEFAULT_HOME_LAYOUT,
      showFavIcon:
        typeof p.showFavIcon === "boolean"
          ? p.showFavIcon
          : DEFAULT_HOME_LAYOUT.showFavIcon,
      showFavName:
        typeof p.showFavName === "boolean"
          ? p.showFavName
          : DEFAULT_HOME_LAYOUT.showFavName,
      widgets: widgets.length ? widgets : [...DEFAULT_HOME_LAYOUT.widgets],
    };
  } catch {
    return fallback;
  }
}

function persistHomeLayout(layout: HomeLayoutState) {
  try {
    localStorage.setItem(HOME_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

function loadVisualMode(): VisualMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "light";
}

function persistVisualMode(mode: VisualMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function now() {
  return Date.now();
}

function okFlash(content: string): FlashMessage {
  return { type: "success", content };
}

function errFlash(content: string): FlashMessage {
  return { type: "error", content };
}

export type VpcProvisionStep = {
  id: string;
  label: string;
  done: boolean;
};

export type ActionDrafts = {
  "iam-user-name": string;
  "ec2-instance-name": string;
  "s3-bucket-name": string;
  "vpc-cidr-block": string;
  "cw-threshold-value": string;
  "ec2-instance-type": string;
  "iam-console-access": boolean;
  "s3-block-public-access": boolean;
  "cloudshell-command": string;
  highlight: string | null;
  showArchitecture: boolean;
  showPolicyViewer: string | null;
};

function usersFromIamSeed(iam: IamSimState): IamUser[] {
  return (iam.users || []).map((u) => ({
    username: u.user_name,
    created: u.create_date || "2024-01-01",
    mfa: false,
    console_access: u.console_access !== false,
    policies: [...(u.attached_policies || [])],
    groups: [...(u.groups || [])],
    last_activity: "—",
    password_age: u.console_access !== false ? "30 days" : "None",
    access_keys: Array.from({ length: u.access_keys ?? 0 }).map((_, i) => ({
      id: `${awsId("akia")}${i}`.slice(0, 20),
      status: "Active" as const,
      created: u.create_date || "2024-01-01",
    })),
    password: null,
  }));
}

function toGrading(entry: ActionLogEntry): GradingAction | null {
  const p = entry.params;
  switch (entry.action_type) {
    case "navigate":
      return { type: "navigate", path: String(p.path || entry.resource_id) };
    case "search_user":
      return { type: "search_user", query: String(p.query || "") };
    case "open_user":
      return { type: "open_user", user_name: entry.resource_id };
    case "attach_policy":
      return {
        type: "attach_policy",
        user_name: entry.resource_id,
        policy: String(p.policy || ""),
      };
    case "add_to_group":
      return {
        type: "add_to_group",
        user_name: entry.resource_id,
        group: String(p.group || ""),
      };
    case "delete_access_key":
      return { type: "delete_access_key", user_name: entry.resource_id };
    case "create_access_key":
      return { type: "create_access_key", user_name: entry.resource_id };
    default:
      return null;
  }
}

export type AccountStore = AccountSnapshot &
  OverlayState & {
    route: ConsoleRoute;
    actionLog: ActionLogEntry[];
    gradingLog: GradingAction[];
    clickedTrail: string[];
    flash: FlashMessage | null;
    interactive: boolean;
    consoleMode: ConsoleMode;
    visualMode: VisualMode;
    vpcProvision: VpcProvisionStep[] | null;
    actionDrafts: ActionDrafts;
    setConsoleMode: (mode: ConsoleMode) => void;
    setVisualMode: (mode: VisualMode) => void;
    toggleFavorite: (id: ServiceId) => void;
    setFavorites: (favorites: ServiceId[]) => void;
    setHomeLayout: (patch: Partial<HomeLayoutState>) => void;
    resetHomeLayout: () => void;
    setFlash: (flash: FlashMessage | null) => void;
    setActionDraft: (patch: Partial<ActionDrafts>) => void;
    hydrate: (opts: {
      accountId: string;
      accountName: string;
      region?: string;
      iamSeed?: IamSimState | null;
      initialService?: ServiceId;
      initialPage?: string;
      fresh?: boolean;
      /** finova = company desk data. empty = blank sandbox. freshbite = lesson world. */
      preset?: "empty" | "freshbite" | "finova";
      iamUsername?: string;
    }) => void;
    log: (
      action_type: string,
      resource_type: string,
      resource_id: string,
      params?: ActionLogEntry["params"]
    ) => void;
    markClick: (targetId: string) => void;
    clearTrail: () => void;
    navigate: (service: ServiceId, page?: string, selectedId?: string | null) => void;
    setOverlay: (patch: Partial<OverlayState>) => void;
    setRegion: (region: string) => void;
    setSearch: (q: string) => void;
    attachPolicy: (username: string, policy: string) => void;
    createUser: (user: {
      username: string;
      console_access: boolean;
      policies: string[];
      groups: string[];
      password?: string | null;
    }) => Promise<void>;
    deleteUsers: (usernames: string[]) => void;
    createAccessKey: (username: string) => void;
    deleteAccessKey: (username: string, keyId: string) => void;
    setUserMfa: (username: string, enabled: boolean) => void;
    setUserConsoleAccess: (username: string, enabled: boolean) => void;
    addUserToGroup: (username: string, group: string) => void;
    detachPolicy: (username: string, policy: string) => void;
    createGroup: (name: string, policies?: string[]) => void;
    deleteGroups: (names: string[]) => void;
    attachPolicyToGroup: (group: string, policy: string) => void;
    createRole: (
      name: string,
      trusted: string,
      policies?: string[],
      opts?: { description?: string; max_session_duration?: string }
    ) => Promise<void>;
    deleteRoles: (names: string[]) => void;
    attachPolicyToRole: (role: string, policy: string) => void;
    createPolicy: (name: string) => void;
    deletePolicies: (names: string[]) => void;
    setInstanceState: (
      id: string,
      state: "running" | "stopped" | "terminated" | "reboot"
    ) => void;
    patchInstanceType: (id: string, type: string) => void;
    launchInstance: (name: string, type: string, subnet?: string) => void;
    createKeyPair: (name: string, type?: "rsa" | "ed25519") => Promise<void>;
    deleteKeyPairs: (names: string[]) => void;
    allocateElasticIp: (opts?: { name?: string }) => Promise<void>;
    createNetworkInterface: (opts: {
      description?: string;
      subnet_id: string;
    }) => Promise<void>;
    createLaunchTemplate: (opts: { name: string }) => Promise<void>;
    createPlacementGroup: (opts: {
      name: string;
      strategy?: "cluster" | "spread" | "partition";
    }) => Promise<void>;
    requestSpotInstances: (opts: {
      instance_type: string;
      spot_price?: string;
    }) => Promise<void>;
    purchaseReservedInstances: (opts: {
      instance_type: string;
      offering_class?: "standard" | "convertible";
    }) => Promise<void>;
    createLaunchConfiguration: (opts: {
      name: string;
      instance_type?: string;
      image_id?: string;
    }) => Promise<void>;
    createVpcNamedResource: (
      slice:
        | "vpc_endpoints"
        | "endpoint_services"
        | "peering_connections"
        | "customer_gateways"
        | "virtual_private_gateways"
        | "vpn_connections"
        | "prefix_lists"
        | "egress_igws"
        | "carrier_gateways"
        | "dhcp_option_sets",
      opts: { name: string; detail?: string; vpc_id?: string }
    ) => Promise<void>;
    deleteVpc: (ids: string[]) => void;
    updateNetworkAclRules: (
      aclId: string,
      direction: "inbound" | "outbound",
      rules: import("./types").NaclRule[]
    ) => void;
    createNatGateway: (opts: {
      name: string;
      subnet_id: string;
      connectivity?: "public" | "private";
    }) => Promise<void>;
    setAccountBpa: (settings: AccountSnapshot["account_bpa"]) => void;
    addIdentityProvider: (provider: {
      name: string;
      type: "SAML" | "OpenID Connect";
      provider_url?: string;
      audience?: string;
    }) => void;
    deleteIdentityProvider: (name: string) => void;
    createTargetGroup: (opts: {
      name: string;
      protocol: string;
      port: number;
      vpc: string;
      target_type: "instance" | "ip" | "lambda" | "alb";
    }) => void;
    setCostAllocationTagStatus: (
      key: string,
      status: "Active" | "Inactive"
    ) => void;
    updateAsgDesired: (name: string, desired: number) => void;
    createAsg: (name: string, desired: number, min: number, max: number) => void;
    createLoadBalancer: (name: string, type: "application" | "network") => void;
    createBucket: (bucket: {
      name: string;
      region: string;
      versioning: boolean;
      block_public_access: boolean;
    }) => Promise<void>;
    /** Spec aliases */
    createS3Bucket: AccountStore["createBucket"];
    toggleBucketBpa: (name: string, allOn: boolean) => void;
    setBucketVersioning: (name: string, enabled: boolean) => void;
    uploadObject: (bucket: string, key: string, meta?: Partial<S3ObjectItem>) => void;
    uploadS3Object: AccountStore["uploadObject"];
    deleteObject: (bucket: string, key: string) => void;
    deleteS3Object: AccountStore["deleteObject"];
    emptyBucket: (name: string) => void;
    saveBucketPolicy: (bucket: string, policy: string) => void;
    addLifecycleRule: (bucket: string, name: string, prefix: string) => void;
    deleteBucket: (name: string) => void;
    addSgRule: (
      sgId: string,
      direction: "inbound" | "outbound",
      rule: AccountSnapshot["security_groups"][0]["inbound"][0]
    ) => void;
    setSgInboundRules: (
      sgId: string,
      rules: AccountSnapshot["security_groups"][0]["inbound"]
    ) => void;
    createVpc: (opts: {
      name: string;
      cidr: string;
      tenancy: "default" | "dedicated";
      azCount: 1 | 2 | 3;
      publicPerAz: number;
      privatePerAz: number;
      /** Exact totals (2026 UI). Prefer over publicPerAz * azCount when set. */
      publicSubnets?: number;
      privateSubnets?: number;
      nat: "none" | "one" | "per-az";
      dnsHostnames: boolean;
      dnsSupport: boolean;
      s3Endpoint?: boolean;
    }) => Promise<void>;
    /** Spec alias for createVpc (Ren / ACTION_MAP docs). */
    createVpcWorkflow: (
      opts: Parameters<AccountStore["createVpc"]>[0]
    ) => Promise<void>;
    clearVpcProvision: () => void;
    updateSubnetSettings: (
      subnetId: string,
      settings: { public_ip_on_launch: boolean }
    ) => void;
    setRoutes: (
      rtId: string,
      routes: AccountSnapshot["route_tables"][0]["routes"]
    ) => void;
    /** Spec alias for setRoutes. */
    editRoutes: AccountStore["setRoutes"];
    createSubnet: (opts: {
      name: string;
      vpc: string;
      cidr: string;
      az: string;
      public_ip_on_launch: boolean;
    }) => void;
    createSecurityGroup: (
      name: string,
      vpc: string,
      description: string,
      opts?: { stayOnPage?: boolean }
    ) => void;
    createIgw: (name: string, vpc?: string | null) => void;
    attachIgw: (igwId: string, vpcId: string) => void;
    addRoute: (rtId: string, destination: string, target: string) => void;
    createAlarm: (opts: {
      name: string;
      description?: string;
      condition: string;
      metric?: string;
      namespace?: string;
      statistic?: "Average" | "Sum" | "Minimum" | "Maximum";
      period?: string;
      threshold?: number;
      comparisonOperator?: CwAlarm["comparisonOperator"];
      actionTarget?: string;
    }) => Promise<void>;
    createCloudWatchAlarm: AccountStore["createAlarm"];
    deleteAlarm: (nameOrId: string) => void;
    deleteCloudWatchAlarm: AccountStore["deleteAlarm"];
    createDashboard: (name: string) => void;
    addDashboardWidget: (
      name: string,
      widget?: Partial<import("./types").CwWidget>
    ) => void;
    addWidgetToDashboard: AccountStore["addDashboardWidget"];
    deleteDashboard: (name: string) => void;
    createLogGroup: (name: string) => void;
    createBudget: (opts: {
      name: string;
      amount: number;
      period?: Budget["period"];
      threshold: number;
      thresholdType?: Budget["threshold_type"];
      email: string;
    }) => Promise<void>;
    deleteBudget: (nameOrId: string) => void;
    getCostExplorerData: (
      granularity: string,
      dateRange: string
    ) => import("./types").MonthlyCostData[];
    addLogInsightQuery: (query: string) => void;
  };

const emptyOverlay: OverlayState = {
  services_open: false,
  search_open: false,
  search_query: "",
  region_open: false,
  account_open: false,
  notifications_open: false,
  settings_open: false,
  support_open: false,
  cloudshell_open: false,
  recentlyVisited: ["iam", "ec2", "s3"],
  favorites: loadFavorites(),
  homeLayout: loadHomeLayout(),
};

const emptyDrafts: ActionDrafts = {
  "iam-user-name": "",
  "ec2-instance-name": "",
  "s3-bucket-name": "",
  "vpc-cidr-block": "10.0.0.0/16",
  "cw-threshold-value": "80",
  "ec2-instance-type": "t2.micro",
  "iam-console-access": false,
  "s3-block-public-access": true,
  "cloudshell-command": "",
  highlight: null,
  showArchitecture: false,
  showPolicyViewer: null,
};

export const useAccountStore = create<AccountStore>()(
  devtools(
    (set, get) => ({
  ...createFreshBiteSeed(),
  ...emptyOverlay,
  route: { service: "home", page: "home", selectedId: null },
  actionLog: [],
  gradingLog: [],
  clickedTrail: [],
  flash: null,
    interactive: false,
  consoleMode: "work" as ConsoleMode,
  visualMode: loadVisualMode(),
  vpcProvision: null,
  actionDrafts: { ...emptyDrafts },

  setConsoleMode: (mode) => set({ consoleMode: mode }),
  setVisualMode: (mode) => {
    persistVisualMode(mode);
    set({ visualMode: mode });
  },
  toggleFavorite: (id) => {
    set((s) => {
      const has = s.favorites.includes(id);
      const favorites = has
        ? s.favorites.filter((x) => x !== id)
        : [...s.favorites, id];
      persistFavorites(favorites);
      return { favorites };
    });
  },
  setFavorites: (favorites) => {
    persistFavorites(favorites);
    set({ favorites });
  },
  setHomeLayout: (patch) => {
    set((s) => {
      const homeLayout = { ...s.homeLayout, ...patch };
      persistHomeLayout(homeLayout);
      return { homeLayout };
    });
  },
  resetHomeLayout: () => {
    const homeLayout = {
      ...DEFAULT_HOME_LAYOUT,
      widgets: [...DEFAULT_HOME_LAYOUT.widgets] as HomeWidgetId[],
    };
    persistHomeLayout(homeLayout);
    set({ homeLayout });
  },
  setFlash: (flash) => set({ flash }),
  setActionDraft: (patch) =>
    set((s) => ({ actionDrafts: { ...s.actionDrafts, ...patch } })),

  hydrate: ({
    accountId,
    accountName,
    region,
    iamSeed,
    initialService,
    initialPage,
    fresh,
    preset,
    iamUsername,
  }) => {
    const base =
      preset === "finova"
        ? readFinovaDesk() ?? createFinovaDeskSeed()
        : preset === "empty" || fresh
          ? createEmptyAccountSeed(accountId, accountName, iamUsername || "root")
          : createFreshBiteSeed(accountId, accountName);
    if (region && preset !== "finova") base.identity.region = region;
    if (iamSeed?.users?.length) {
      base.users = usersFromIamSeed(iamSeed);
      if (iamSeed.groups?.length) {
        base.groups = iamSeed.groups.map((g) => ({
          name: g.name,
          policies: [...(g.policies || [])],
          members: [],
        }));
      }
      if (iamSeed.available_policies?.length) {
        base.available_policies = iamSeed.available_policies;
      }
    }
    const service = initialService || "home";
    const page =
      initialPage ||
      (service === "iam"
        ? "users"
        : service === "ec2"
          ? "instances"
          : service === "s3"
            ? "buckets"
            : service === "cloudwatch"
              ? "dashboards"
            : "home");
    set({
      ...base,
      ...(fresh
        ? { ...emptyOverlay, recentlyVisited: [] }
        : emptyOverlay),
      route: { service, page, selectedId: null },
      actionLog: [],
      gradingLog: [],
      clickedTrail: [],
      flash: null,
      vpcProvision: null,
      actionDrafts: { ...emptyDrafts },
    });
    cancelAllEc2Transitions();
    rememberGoodResources(useAccountStore.getState());
  },

  log: (action_type, resource_type, resource_id, params = {}) => {
    const entry: ActionLogEntry = {
      timestamp: now(),
      action_type,
      resource_type,
      resource_id,
      params,
      result: "success",
    };
    const grade = toGrading(entry);
    set((s) => ({
      actionLog: [...s.actionLog, entry],
      gradingLog: grade ? [...s.gradingLog, grade] : s.gradingLog,
    }));
  },

  markClick: (targetId) =>
    set((s) => ({ clickedTrail: [...s.clickedTrail, targetId] })),

  clearTrail: () => set({ clickedTrail: [] }),

  navigate: (service, page, selectedId = null) => {
    const resolved =
      page ||
      (service === "home"
        ? "home"
        : service === "iam"
          ? "dashboard"
          : service === "ec2"
            ? "dashboard"
            : service === "s3"
              ? "buckets"
              : service === "vpc"
                ? "dashboard"
                : service === "cloudwatch"
                  ? "dashboards"
                  : service === "billing"
                    ? "dashboard"
                  : "cost-explorer");
    const current = get().route;
    if (
      current.service === service &&
      current.page === resolved &&
      (current.selectedId ?? null) === selectedId
    ) {
      return;
    }
    get().log("navigate", "console", `${service}/${resolved}`, {
      path: `/${service}/${resolved}`,
    });
    set((s) => ({
      route: { service, page: resolved, selectedId },
      services_open: false,
      search_open: false,
      region_open: false,
      account_open: false,
      search_query: "",
      flash: null,
      recentlyVisited:
        service === "home"
          ? s.recentlyVisited
          : [service, ...s.recentlyVisited.filter((x) => x !== service)].slice(0, 6),
    }));
  },

  setOverlay: (patch) => {
    const s = get();
    const keys = Object.keys(patch) as (keyof OverlayState)[];
    if (keys.every((k) => (s as OverlayState)[k] === patch[k])) return;
    set(patch);
  },

  setRegion: (region) => {
    const current = get().identity.region;
    if (current === region) {
      if (get().region_open) set({ region_open: false });
      return;
    }
    get().log("set_region", "account", region, { region });
    set({ region_open: false, identity: { ...get().identity, region } });
  },

  setSearch: (q) => set({ search_query: q, search_open: true, services_open: false }),

  attachPolicy: (username, policy) => {
    set((s) => ({
      users: s.users.map((u) =>
        u.username === username && !u.policies.includes(policy)
          ? { ...u, policies: [...u.policies, policy] }
          : u
      ),
      flash: okFlash(`Policy ${policy} attached to ${username}.`),
    }));
    get().log("attach_policy", "iam_user", username, { policy });
  },

  createUser: async (user) => {
    const username = validateIamUsername(user?.username);
    if (!username) {
      set({ flash: errFlash("Enter a valid IAM user name before creating the user.") });
      return;
    }
    if (get().users.some((u) => u.username === username)) {
      set({ flash: errFlash(`User ${username} already exists.`) });
      return;
    }
    const policies = Array.isArray(user.policies)
      ? user.policies.filter((p): p is string => typeof p === "string" && p.length > 0)
      : [];
    const groups = Array.isArray(user.groups)
      ? user.groups.filter((g): g is string => typeof g === "string" && g.length > 0)
      : [];
    await simulateOperation({
      durationMs: scaledMs("iamCreateUser", get().consoleMode),
    });
    const created: IamUser = {
      username,
      created: new Date().toISOString().slice(0, 10),
      mfa: false,
      console_access: Boolean(user.console_access),
      policies,
      groups,
      last_activity: "None",
      password_age: user.console_access ? "0 days" : "None",
      access_keys: [],
      password: user.console_access
        ? user.password || "Temp-Passw0rd!"
        : null,
    };
    set((s) => ({
      users: [...s.users, created],
      groups: s.groups.map((g) =>
        groups.includes(g.name)
          ? { ...g, members: [...new Set([...g.members, username])] }
          : g
      ),
      route: {
        service: "iam",
        page: "create-user-success",
        selectedId: username,
      },
      flash: okFlash(`Successfully created IAM user ${username}.`),
    }));
    get().log("create_user", "iam_user", username, {
      console_access: Boolean(user.console_access),
    });
    for (const policy of policies) {
      get().log("attach_policy", "iam_user", username, { policy });
    }
    for (const group of groups) {
      get().log("add_to_group", "iam_user", username, { group });
    }
  },

  deleteUsers: (usernames) => {
    set((s) => ({
      users: s.users.filter((u) => !usernames.includes(u.username)),
      groups: s.groups.map((g) => ({
        ...g,
        members: g.members.filter((m) => !usernames.includes(m)),
      })),
      flash: okFlash(`Successfully deleted ${usernames.length} user(s).`),
    }));
    usernames.forEach((u) => get().log("delete_user", "iam_user", u, {}));
  },

  createAccessKey: (username) => {
    const key = {
      id: awsId("akia"),
      status: "Active" as const,
      created: new Date().toISOString().slice(0, 10),
    };
    set((s) => ({
      users: s.users.map((u) =>
        u.username === username
          ? { ...u, access_keys: [...u.access_keys, key] }
          : u
      ),
      flash: okFlash(
        `Access key ${key.id} created. Retrieve the secret access key now — it is shown only once.`
      ),
    }));
    get().log("create_access_key", "iam_user", username, { key_id: key.id });
  },

  deleteAccessKey: (username, keyId) => {
    set((s) => ({
      users: s.users.map((u) =>
        u.username === username
          ? { ...u, access_keys: u.access_keys.filter((k) => k.id !== keyId) }
          : u
      ),
      flash: okFlash(`Access key ${keyId} deleted.`),
    }));
    get().log("delete_access_key", "iam_user", username, { key_id: keyId });
  },

  setUserMfa: (username, enabled) => {
    set((s) => ({
      users: s.users.map((u) => (u.username === username ? { ...u, mfa: enabled } : u)),
      flash: okFlash(
        enabled
          ? `MFA device assigned to ${username}.`
          : `MFA removed from ${username}.`
      ),
    }));
    get().log(enabled ? "enable_mfa" : "disable_mfa", "iam_user", username, {});
  },

  setUserConsoleAccess: (username, enabled) => {
    set((s) => ({
      users: s.users.map((u) =>
        u.username === username
          ? {
              ...u,
              console_access: enabled,
              password: enabled ? u.password || "Temp-Passw0rd!" : null,
              password_age: enabled ? u.password_age || "0 days" : "None",
            }
          : u
      ),
      flash: okFlash(
        enabled
          ? `Console access enabled for ${username}.`
          : `Console access disabled for ${username}.`
      ),
    }));
    get().log(
      enabled ? "enable_console_access" : "disable_console_access",
      "iam_user",
      username,
      {}
    );
  },

  addUserToGroup: (username, group) => {
    set((s) => ({
      users: s.users.map((u) =>
        u.username === username && !u.groups.includes(group)
          ? { ...u, groups: [...u.groups, group] }
          : u
      ),
      groups: s.groups.map((g) =>
        g.name === group && !g.members.includes(username)
          ? { ...g, members: [...g.members, username] }
          : g
      ),
      flash: okFlash(`Added ${username} to ${group}.`),
    }));
    get().log("add_to_group", "iam_user", username, { group });
  },

  detachPolicy: (username, policy) => {
    set((s) => ({
      users: s.users.map((u) =>
        u.username === username
          ? { ...u, policies: u.policies.filter((p) => p !== policy) }
          : u
      ),
      flash: okFlash(`Detached ${policy} from ${username}.`),
    }));
    get().log("detach_policy", "iam_user", username, { policy });
  },

  createGroup: (name, policies = []) => {
    set((s) => ({
      groups: [...s.groups, { name, policies, members: [] }],
      flash: okFlash(`Group ${name} created.`),
    }));
    get().log("create_group", "iam", name, {});
  },

  deleteGroups: (names) => {
    set((s) => ({
      groups: s.groups.filter((g) => !names.includes(g.name)),
      users: s.users.map((u) => ({
        ...u,
        groups: u.groups.filter((g) => !names.includes(g)),
      })),
      flash: okFlash(`Successfully deleted ${names.length} group(s).`),
    }));
    names.forEach((n) => get().log("delete_group", "iam", n, {}));
  },

  attachPolicyToGroup: (group, policy) => {
    set((s) => ({
      groups: s.groups.map((g) =>
        g.name === group && !g.policies.includes(policy)
          ? { ...g, policies: [...g.policies, policy] }
          : g
      ),
      flash: okFlash(`Policy ${policy} attached to group ${group}.`),
    }));
    get().log("attach_policy", "iam_group", group, { policy });
  },

  createRole: async (name, trusted, policies = [], opts = {}) => {
    await simulateOperation({
      durationMs: scaledMs("iamCreateRole", get().consoleMode),
    });
    set((s) => ({
      roles: [
        ...s.roles,
        {
          name,
          trusted,
          last_activity: "Never",
          policies: [...policies],
          description: opts.description || "",
          max_session_duration: opts.max_session_duration || "1 hour",
        },
      ],
      flash: okFlash(`Success: Role ${name} created.`),
      route: { service: "iam", page: "roles", selectedId: null },
    }));
    get().log("create_role", "iam", name, { trusted });
  },

  deleteRoles: (names) => {
    set((s) => ({
      roles: s.roles.filter((r) => !names.includes(r.name)),
      flash: okFlash(`Successfully deleted ${names.length} role(s).`),
    }));
    names.forEach((n) => get().log("delete_role", "iam", n, {}));
  },

  attachPolicyToRole: (role, policy) => {
    set((s) => ({
      roles: s.roles.map((r) =>
        r.name === role && !r.policies.includes(policy)
          ? { ...r, policies: [...r.policies, policy] }
          : r
      ),
      flash: okFlash(`Policy ${policy} attached to role ${role}.`),
    }));
    get().log("attach_policy", "iam_role", role, { policy });
  },

  createPolicy: (name) => {
    set((s) => ({
      policies: [
        ...s.policies,
        {
          name,
          type: "Customer managed" as const,
          attached: 0,
          created: new Date().toISOString().slice(0, 10),
        },
      ],
      available_policies: s.available_policies.includes(name)
        ? s.available_policies
        : [...s.available_policies, name],
      flash: okFlash(`Successfully created policy ${name}.`),
    }));
    get().log("create_policy", "iam", name, {});
  },

  deletePolicies: (names) => {
    set((s) => ({
      policies: s.policies.filter((p) => !names.includes(p.name)),
      available_policies: s.available_policies.filter((p) => !names.includes(p)),
      flash: okFlash(`Successfully deleted ${names.length} policy(ies).`),
    }));
    names.forEach((n) => get().log("delete_policy", "iam", n, {}));
  },

  setInstanceState: (id, target) => {
    const mode = get().consoleMode;
    const current = get().instances.find((i) => i.id === id);
    if (!current) return;
    const signal = beginEc2Transition(id);

    if (target === "reboot") {
      set((s) => ({
        instances: s.instances.map((i) =>
          i.id === id
            ? { ...i, state: "pending" as Ec2InstanceState, status_check: "initializing" }
            : i
        ),
        flash: okFlash(`Successfully initiated reboot of instance ${id}`),
      }));
      get().log("reboot_instance", "ec2", id, { state: "pending" });
      void simulateOperation({ durationMs: scaledMs("ec2Reboot", mode), signal })
        .then(() => {
          set((s) => ({
            instances: s.instances.map((i) =>
              i.id === id
                ? { ...i, state: "running", status_check: "ok", alarm_status: i.alarm_status || "No alarms" }
                : i
            ),
          }));
        })
        .catch((err) => {
          if (!isAbortError(err)) {
            set({
              flash: errFlash(
                err instanceof Error ? err.message : "Unexpected console error"
              ),
            });
          }
        });
      return;
    }

    if (target === "stopped") {
      set((s) => ({
        instances: s.instances.map((i) =>
          i.id === id ? { ...i, state: "stopping" as Ec2InstanceState } : i
        ),
        flash: okFlash(`Successfully initiated stop of instance ${id}`),
      }));
      get().log("stop_instance", "ec2", id, { state: "stopping" });
      void simulateOperation({ durationMs: scaledMs("ec2Stop", mode), signal })
        .then(() => {
          set((s) => ({
            instances: s.instances.map((i) =>
              i.id === id
                ? {
                    ...i,
                    state: "stopped",
                    status_check: "ok",
                    public_ip: null,
                    public_dns: null,
                  }
                : i
            ),
          }));
        })
        .catch((err) => {
          if (!isAbortError(err)) {
            set({
              flash: errFlash(
                err instanceof Error ? err.message : "Unexpected console error"
              ),
            });
          }
        });
      return;
    }

    if (target === "terminated") {
      set((s) => ({
        instances: s.instances.map((i) =>
          i.id === id ? { ...i, state: "shutting-down" as Ec2InstanceState } : i
        ),
        flash: okFlash(`Successfully initiated terminate of instance ${id}`),
      }));
      get().log("terminate_instance", "ec2", id, { state: "shutting-down" });
      void simulateOperation({ durationMs: scaledMs("ec2Terminate", mode), signal })
        .then(() => {
          set((s) => ({
            instances: s.instances.map((i) =>
              i.id === id
                ? {
                    ...i,
                    state: "terminated" as Ec2InstanceState,
                    public_ip: null,
                    public_dns: null,
                  }
                : i
            ),
          }));
        })
        .catch((err) => {
          if (!isAbortError(err)) {
            set({
              flash: errFlash(
                err instanceof Error ? err.message : "Unexpected console error"
              ),
            });
          }
        });
      return;
    }

    // start → pending → running
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id
          ? { ...i, state: "pending", status_check: "initializing" }
          : i
      ),
      flash: okFlash(`Successfully initiated start of instance ${id}`),
    }));
    get().log("start_instance", "ec2", id, { state: "pending" });
    void simulateOperation({ durationMs: scaledMs("ec2Start", mode), signal })
      .then(() => {
        const ip = `13.233.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
        const region = get().identity.region;
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === id
              ? {
                  ...i,
                  state: "running",
                  status_check: "initializing",
                  public_ip: i.public_ip || ip,
                  public_dns:
                    i.public_dns ||
                    `ec2-${(i.public_ip || ip).replace(/\./g, "-")}.${region}.compute.amazonaws.com`,
                }
              : i
          ),
        }));
        return simulateOperation({
          durationMs: scaledMs("ec2StatusChecks", mode),
          signal,
        });
      })
      .then(() => {
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === id ? { ...i, status_check: "ok" } : i
          ),
        }));
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          set({
            flash: errFlash(
              err instanceof Error ? err.message : "Unexpected console error"
            ),
          });
        }
      });
  },

  launchInstance: (name, type, subnet) => {
    const validated = validateEc2LaunchInput(name, type);
    if (!validated) {
      set({
        flash: errFlash("Enter a valid instance name and type before launching."),
      });
      return;
    }
    const region = get().identity.region;
    const mode = get().consoleMode;
    const inst = {
      id: awsId("i"),
      name: validated.name,
      state: "pending" as Ec2InstanceState,
      type: validated.type,
      status_check: "initializing" as const,
      alarm_status: "No alarms" as const,
      az: `${region}a`,
      region,
      public_ip: null as string | null,
      public_dns: null as string | null,
      private_ip: "10.0.1." + Math.floor(20 + Math.random() * 200),
    };
    set((s) => ({
      instances: [...s.instances, inst],
      route: { service: "ec2", page: "instances", selectedId: null },
      flash: okFlash(
        `Success: Successfully initiated launch of instance (${inst.id})`
      ),
    }));
    get().log("launch_instance", "ec2", inst.id, {
      name: validated.name,
      type: validated.type,
      subnet: typeof subnet === "string" ? subnet : "",
    });
    const signal = beginEc2Transition(inst.id);
    void simulateOperation({
      durationMs: scaledMs("ec2PendingToRunning", mode),
      signal,
    })
      .then(() => {
        const ip = `13.233.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === inst.id
              ? {
                  ...i,
                  state: "running",
                  status_check: "initializing",
                  public_ip: ip,
                  public_dns: `ec2-${ip.replace(/\./g, "-")}.${region}.compute.amazonaws.com`,
                }
              : i
          ),
        }));
        return simulateOperation({
          durationMs: scaledMs("ec2StatusChecks", mode),
          signal,
        });
      })
      .then(() => {
        set((s) => ({
          instances: s.instances.map((i) =>
            i.id === inst.id ? { ...i, status_check: "ok" } : i
          ),
        }));
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          set({
            flash: errFlash(
              err instanceof Error ? err.message : "Unexpected console error"
            ),
          });
        }
      });
  },

  createKeyPair: async (name, type = "rsa") => {
    const trimmed = String(name || "").trim();
    if (!/^[A-Za-z0-9._-]{1,255}$/.test(trimmed)) {
      set({
        flash: errFlash(
          "Key pair name must be 1–255 characters (letters, numbers, . _ -)."
        ),
      });
      return;
    }
    if (get().key_pairs.some((k) => k.name === trimmed)) {
      set({ flash: errFlash(`Key pair ${trimmed} already exists.`) });
      return;
    }
    await simulateOperation({
      durationMs: scaledMs("ec2CreateKeyPair", get().consoleMode),
    });
    const fingerprint = `sha1:${Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0")
    ).join(":")}`;
    set((s) => ({
      key_pairs: [
        ...s.key_pairs,
        {
          name: trimmed,
          fingerprint,
          type,
          created: new Date().toISOString().slice(0, 10),
        },
      ],
      flash: okFlash(
        `Successfully created key pair ${trimmed}. Private key download is simulated in this lab.`
      ),
    }));
    get().log("create_key_pair", "ec2", trimmed, { type });
  },

  deleteKeyPairs: (names) => {
    const setNames = new Set(names);
    set((s) => ({
      key_pairs: s.key_pairs.filter((k) => !setNames.has(k.name)),
      flash: okFlash(
        names.length === 1
          ? `Deleted key pair ${names[0]}.`
          : `Deleted ${names.length} key pairs.`
      ),
    }));
    for (const n of names) get().log("delete_key_pair", "ec2", n);
  },

  createNatGateway: async ({ name, subnet_id, connectivity = "public" }) => {
    const trimmed = String(name || "").trim() || "nat-gateway";
    const subnet = get().subnets.find((s) => s.id === subnet_id);
    if (!subnet) {
      set({ flash: errFlash("Select a valid subnet for the NAT gateway.") });
      return;
    }
    const id = awsId("nat");
    set((s) => ({
      nat_gateways: [
        ...s.nat_gateways,
        {
          id,
          name: trimmed,
          subnet_id,
          vpc_id: subnet.vpc,
          state: "pending",
          connectivity,
          created: new Date().toISOString().slice(0, 10),
        },
      ],
      flash: okFlash(`Creating NAT gateway ${id}…`),
    }));
    get().log("create_nat_gateway", "vpc", id, {
      name: trimmed,
      subnet_id,
      connectivity,
    });
    await simulateOperation({
      durationMs: scaledMs("vpcCreateNat", get().consoleMode),
      ticks: 4,
    });
    set((s) => ({
      nat_gateways: s.nat_gateways.map((n) =>
        n.id === id ? { ...n, state: "available" } : n
      ),
      flash: okFlash(`NAT gateway ${id} is available.`),
      route: { service: "vpc", page: "nat-gateways", selectedId: id },
    }));
  },

  setAccountBpa: (settings) => {
    set({
      account_bpa: { ...settings },
      flash: okFlash("Account block public access settings updated."),
    });
    get().log("set_account_bpa", "s3", "account", {
      block_acls: settings.block_acls,
      ignore_acls: settings.ignore_acls,
      block_policy: settings.block_policy,
      restrict_buckets: settings.restrict_buckets,
    });
  },

  addIdentityProvider: ({ name, type, provider_url, audience }) => {
    const trimmed = name.trim();
    if (!trimmed) {
      set({ flash: errFlash("Provider name is required.") });
      return;
    }
    if (get().identity_providers.some((p) => p.name === trimmed)) {
      set({ flash: errFlash(`Provider ${trimmed} already exists.`) });
      return;
    }
    set((s) => ({
      identity_providers: [
        ...s.identity_providers,
        {
          name: trimmed,
          type,
          created: new Date().toISOString().slice(0, 10),
          provider_url,
          audience,
        },
      ],
      flash: okFlash(`Identity provider ${trimmed} added.`),
    }));
    get().log("add_identity_provider", "iam", trimmed, { type });
  },

  deleteIdentityProvider: (name) => {
    set((s) => ({
      identity_providers: s.identity_providers.filter((p) => p.name !== name),
      flash: okFlash(`Identity provider ${name} deleted.`),
    }));
    get().log("delete_identity_provider", "iam", name);
  },

  createTargetGroup: ({ name, protocol, port, vpc, target_type }) => {
    const trimmed = name.trim();
    if (!trimmed) {
      set({ flash: errFlash("Target group name is required.") });
      return;
    }
    const account = get().identity.account_id;
    const region = get().identity.region;
    const arn = `arn:aws:elasticloadbalancing:${region}:${account}:targetgroup/${trimmed}/${awsId("i").slice(2, 18)}`;
    set((s) => ({
      target_groups: [
        ...s.target_groups,
        {
          arn,
          name: trimmed,
          target_type,
          protocol,
          port,
          vpc,
          health_check_path: "/",
          targets: [],
          load_balancer_arns: [],
        },
      ],
      flash: okFlash(`Target group ${trimmed} created.`),
      route: { service: "ec2", page: "target-groups", selectedId: arn },
    }));
    get().log("create_target_group", "ec2", trimmed, { protocol, port });
  },

  setCostAllocationTagStatus: (key, status) => {
    set((s) => ({
      cost_allocation_tags: s.cost_allocation_tags.map((t) =>
        t.key === key
          ? {
              ...t,
              status,
              last_updated: new Date().toISOString().slice(0, 10),
            }
          : t
      ),
      flash: okFlash(
        status === "Active"
          ? `Activated cost allocation tag ${key}.`
          : `Deactivated cost allocation tag ${key}.`
      ),
    }));
    get().log("set_cost_allocation_tag", "billing", key, { status });
  },

  createBucket: async ({ name, region, versioning, block_public_access }) => {
    const bucketName = validateBucketName(name);
    if (!bucketName) {
      set({
        flash: errFlash(
          "Enter a valid S3 bucket name (3–63 chars, lowercase letters, numbers, dots, hyphens)."
        ),
      });
      return;
    }
    if (get().buckets.some((b) => b.name === bucketName)) {
      set({ flash: errFlash(`Bucket ${bucketName} already exists.`) });
      return;
    }
    const resolvedRegion =
      typeof region === "string" && region.trim()
        ? region.trim()
        : get().identity.region || "ap-south-1";
    await simulateOperation({
      durationMs: scaledMs("s3CreateBucket", get().consoleMode),
    });
    const created = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const bpa = Boolean(block_public_access);
    set((s) => ({
      buckets: [
        ...s.buckets,
        {
          name: bucketName,
          region: resolvedRegion,
          public: !bpa,
          objects: 0,
          created: `${created} (UTC+05:30)`,
          encryption: "SSE-S3",
          versioning: versioning ? ("Enabled" as const) : ("Disabled" as const),
          block_public_access: {
            block_acls: bpa,
            ignore_acls: bpa,
            block_policy: bpa,
            restrict_buckets: bpa,
          },
          policy: "",
          object_keys: [],
          object_items: [],
          lifecycle_rules: [],
        },
      ],
      route: { service: "s3", page: "buckets", selectedId: null },
      flash: okFlash(`Successfully created bucket: ${bucketName}`),
    }));
    get().log("create_bucket", "s3", bucketName, {
      region: resolvedRegion,
      versioning: Boolean(versioning),
      block_public_access: bpa,
    });
  },

  createS3Bucket: (opts) => get().createBucket(opts),

  toggleBucketBpa: (name, allOn) => {
    set((s) => ({
      buckets: s.buckets.map((b) =>
        b.name === name
          ? {
              ...b,
              public: !allOn,
              block_public_access: {
                block_acls: allOn,
                ignore_acls: allOn,
                block_policy: allOn,
                restrict_buckets: allOn,
              },
            }
          : b
      ),
      flash: okFlash(
        allOn
          ? `Successfully edited Block Public Access settings for bucket "${name}".`
          : `Successfully edited Block Public Access settings for bucket "${name}".`
      ),
    }));
    get().log("set_block_public_access", "s3", name, { allOn });
  },

  setBucketVersioning: (name, enabled) => {
    set((s) => ({
      buckets: s.buckets.map((b) =>
        b.name === name
          ? {
              ...b,
              versioning: enabled ? ("Enabled" as const) : ("Suspended" as const),
            }
          : b
      ),
      flash: okFlash(
        enabled
          ? `Bucket Versioning enabled for ${name}.`
          : `Bucket Versioning suspended for ${name}.`
      ),
    }));
    get().log("set_bucket_versioning", "s3", name, { enabled });
  },

  uploadObject: (bucket, key, meta) => {
    const bucketName = typeof bucket === "string" ? bucket.trim() : "";
    const objectKey = typeof key === "string" ? key.trim() : "";
    if (!bucketName) {
      set({ flash: errFlash("Choose a bucket before uploading an object.") });
      return;
    }
    if (!objectKey || objectKey.includes("//") || objectKey.startsWith("/")) {
      set({
        flash: errFlash(
          "Enter a valid object key (no leading slash or empty path segments)."
        ),
      });
      return;
    }
    if (!get().buckets.some((b) => b.name === bucketName)) {
      set({ flash: errFlash(`Bucket ${bucketName} was not found.`) });
      return;
    }
    const existing = get().buckets.find((b) => b.name === bucketName);
    if (
      existing?.object_keys?.includes(objectKey) ||
      existing?.object_items?.some((o) => o.key === objectKey)
    ) {
      set({
        flash: errFlash(
          `Object ${objectKey} already exists in ${bucketName}. Choose a different key.`
        ),
      });
      return;
    }
    const size =
      typeof meta?.size === "number" && Number.isFinite(meta.size) && meta.size >= 0
        ? meta.size
        : Math.floor(Math.random() * 40_000) + 2_048;
    const type =
      (typeof meta?.type === "string" && meta.type) ||
      (objectKey.includes(".") ? objectKey.split(".").pop() || "bin" : "folder");
    const item: S3ObjectItem = {
      key: objectKey,
      size,
      type,
      lastModified:
        (typeof meta?.lastModified === "string" && meta.lastModified) ||
        `${new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })} (UTC+05:30)`,
      storageClass:
        (typeof meta?.storageClass === "string" && meta.storageClass) || "Standard",
    };
    set((s) => ({
      buckets: s.buckets.map((b) =>
        b.name === bucketName
          ? {
              ...b,
              object_keys: [...(b.object_keys || []), objectKey],
              object_items: [...(b.object_items || []), item],
              objects: (b.objects || 0) + 1,
            }
          : b
      ),
      flash: okFlash(`Successfully uploaded ${objectKey} to ${bucketName}.`),
    }));
    get().log("upload_object", "s3", bucketName, { key: objectKey });
  },

  uploadS3Object: (bucket, key, meta) => get().uploadObject(bucket, key, meta),

  deleteObject: (bucket, key) => {
    set((s) => ({
      buckets: s.buckets.map((b) =>
        b.name === bucket
          ? {
              ...b,
              object_keys: (b.object_keys || []).filter((k) => k !== key),
              object_items: (b.object_items || []).filter((o) => o.key !== key),
              objects: Math.max(0, (b.objects || 0) - 1),
            }
          : b
      ),
      flash: okFlash(`Deleted ${key} from ${bucket}.`),
    }));
    get().log("delete_object", "s3", bucket, { key });
  },

  deleteS3Object: (bucket, key) => get().deleteObject(bucket, key),

  emptyBucket: (name) => {
    set((s) => ({
      buckets: s.buckets.map((b) =>
        b.name === name
          ? { ...b, object_keys: [], object_items: [], objects: 0 }
          : b
      ),
      flash: okFlash(`Successfully emptied bucket: ${name}`),
    }));
    get().log("empty_bucket", "s3", name, {});
  },

  saveBucketPolicy: (bucket, policy) => {
    set((s) => ({
      buckets: s.buckets.map((b) => (b.name === bucket ? { ...b, policy } : b)),
      flash: okFlash(`Bucket policy saved for ${bucket}.`),
    }));
    get().log("put_bucket_policy", "s3", bucket, {});
  },

  addLifecycleRule: (bucket, name, prefix) => {
    set((s) => ({
      buckets: s.buckets.map((b) =>
        b.name === bucket
          ? {
              ...b,
              lifecycle_rules: [
                ...(b.lifecycle_rules || []),
                {
                  name,
                  status: "Enabled",
                  prefix: prefix || "/",
                  actions: "Expire current versions after 365 days",
                },
              ],
            }
          : b
      ),
      flash: okFlash(`Lifecycle rule ${name} created.`),
    }));
    get().log("create_lifecycle_rule", "s3", bucket, { name, prefix });
  },

  deleteBucket: (name) => {
    set((s) => ({
      buckets: s.buckets.filter((b) => b.name !== name),
      flash: okFlash(`Deleted bucket ${name}.`),
      route: { service: "s3", page: "buckets", selectedId: null },
    }));
    get().log("delete_bucket", "s3", name, {});
  },

  updateAsgDesired: (name, desired) => {
    set((s) => ({
      asgs: s.asgs.map((a) =>
        a.name === name
          ? {
              ...a,
              desired,
              instances: Math.min(Math.max(desired, a.min), a.max),
            }
          : a
      ),
      flash: okFlash(`Updated desired capacity for ${name} to ${desired}.`),
    }));
    get().log("update_asg", "ec2", name, { desired });
  },

  createAsg: (name, desired, min, max) => {
    set((s) => ({
      asgs: [
        ...s.asgs,
        {
          name,
          instances: desired,
          min,
          max,
          desired,
          status: "Healthy",
          health_check: "EC2" as const,
        },
      ],
      flash: okFlash(`Auto Scaling group ${name} created.`),
    }));
    get().log("create_asg", "ec2", name, { desired, min, max });
  },

  createLoadBalancer: (name, type) => {
    const region = get().identity.region;
    const tg = get().target_groups[0];
    const tgArn = tg?.arn;
    set((s) => ({
      load_balancers: [
        ...s.load_balancers,
        {
          name,
          dns: `${name}-${awsId("i").slice(2, 10)}.${region}.elb.amazonaws.com`,
          state: "active" as const,
          type,
          vpc: s.vpcs[0]?.id || "vpc-default",
          scheme: "internet-facing" as const,
          target_group_arns: tgArn ? [tgArn] : [],
          listeners: tgArn
            ? [{ protocol: "HTTP", port: 80, target_group_arn: tgArn }]
            : [{ protocol: "HTTP", port: 80 }],
        },
      ],
      target_groups: tgArn
        ? s.target_groups.map((g) =>
            g.arn === tgArn
              ? {
                  ...g,
                  load_balancer_arns: [
                    ...g.load_balancer_arns,
                    `arn:aws:elasticloadbalancing:${region}:${s.identity.account_id}:loadbalancer/app/${name}/new`,
                  ],
                  targets: g.targets.map((t) =>
                    t.health === "unused" ? { ...t, health: "initial" as const } : t
                  ),
                }
              : g
          )
        : s.target_groups,
      flash: okFlash(`Load balancer ${name} created.`),
    }));
    get().log("create_lb", "ec2", name, { type, target_group: tgArn });
  },

  addSgRule: (sgId, direction, rule) => {
    set((s) => ({
      security_groups: s.security_groups.map((g) =>
        g.id === sgId
          ? {
              ...g,
              inbound: direction === "inbound" ? [...g.inbound, rule] : g.inbound,
              outbound: direction === "outbound" ? [...g.outbound, rule] : g.outbound,
            }
          : g
      ),
    }));
    get().log("add_sg_rule", "vpc", sgId, { direction, port: rule.port });
  },

  setSgInboundRules: (sgId, rules) => {
    set((s) => ({
      security_groups: s.security_groups.map((g) =>
        g.id === sgId ? { ...g, inbound: [...rules] } : g
      ),
      flash: okFlash(`Successfully modified inbound rules for ${sgId}.`),
    }));
    get().log("set_sg_inbound", "ec2", sgId, { count: rules.length });
  },

  createVpc: async (opts) => {
    const name = typeof opts?.name === "string" ? opts.name.trim() : "";
    const cidr = typeof opts?.cidr === "string" ? opts.cidr.trim() : "";
    const cidrOk = /^(\d{1,3}\.){3}\d{1,3}\/(8|16|20|24|28)$/.test(cidr);
    const octets = cidr.split("/")[0]?.split(".").map(Number) ?? [];
    const octetsOk =
      octets.length === 4 &&
      octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
    if (!name) {
      set({ flash: errFlash("Enter a VPC name tag before creating the VPC.") });
      return;
    }
    if (!cidrOk || !octetsOk) {
      set({
        flash: errFlash(
          "Enter a valid IPv4 CIDR (e.g. 10.0.0.0/16). Supported masks: /8, /16, /20, /24, /28."
        ),
      });
      return;
    }
    const azCount = opts.azCount;
    if (azCount !== 1 && azCount !== 2 && azCount !== 3) {
      set({ flash: errFlash("Availability Zone count must be 1, 2, or 3.") });
      return;
    }
    const nat = opts.nat;
    if (nat !== "none" && nat !== "one" && nat !== "per-az") {
      set({ flash: errFlash("Choose a valid NAT gateway option.") });
      return;
    }
    const publicPerAz =
      typeof opts.publicPerAz === "number" && opts.publicPerAz >= 0
        ? opts.publicPerAz
        : 0;
    const privatePerAz =
      typeof opts.privatePerAz === "number" && opts.privatePerAz >= 0
        ? opts.privatePerAz
        : 0;
    if (get().vpcProvision) {
      set({
        flash: errFlash(
          "A VPC is already being provisioned. Wait for it to finish."
        ),
      });
      return;
    }

    const region = get().identity.region;
    const mode = get().consoleMode;
    const azLetters = ["a", "b", "c"].slice(0, azCount);
    const vpcId = awsId("vpc");
    const mainRtId = awsId("rtb");
    const dhcp = awsId("dopt");
    const withMore =
      (opts.publicSubnets ?? azCount * publicPerAz) > 0 ||
      (opts.privateSubnets ?? azCount * privatePerAz) > 0 ||
      nat !== "none";
    const wantEndpoint = withMore && opts.s3Endpoint !== false;
    const publicTarget = opts.publicSubnets ?? azCount * publicPerAz;
    const privateTarget = opts.privateSubnets ?? azCount * privatePerAz;
    const igwId = withMore ? awsId("igw") : null;
    const privateRtId = withMore && privateTarget > 0 ? awsId("rtb") : null;
    const endpointId = wantEndpoint ? awsId("vpce") : null;

    type TimedStep = { id: string; label: string; delayKey: keyof typeof SIM_MS | null };
    const timed: TimedStep[] = withMore
      ? [
          { id: "vpc", label: `Creating VPC ${vpcId}`, delayKey: null },
          {
            id: "subnets",
            label: `Creating subnets (${publicTarget + privateTarget} subnets across ${azCount} AZs)`,
            delayKey: "vpcStepSubnet",
          },
          {
            id: "igw",
            label: `Creating Internet Gateway ${igwId}`,
            delayKey: "vpcStepIgw",
          },
          {
            id: "attach",
            label: "Attaching Internet Gateway to VPC",
            delayKey: "vpcStepAttach",
          },
          {
            id: "rtb",
            label: "Creating route tables and subnet associations",
            delayKey: "vpcStepRoute",
          },
          ...(nat !== "none"
            ? [{ id: "nat", label: "Creating NAT gateways…", delayKey: "vpcStepEndpoint" as const }]
            : []),
          ...(wantEndpoint && endpointId
            ? [
                {
                  id: "endpoint",
                  label: `Creating S3 Gateway Endpoint ${endpointId}`,
                  delayKey: "vpcStepEndpoint" as const,
                },
              ]
            : []),
          { id: "dns", label: "Applying DNS settings…", delayKey: null },
        ]
      : [{ id: "vpc", label: `Creating VPC ${vpcId}`, delayKey: null }];

    set({
      vpcProvision: timed.map((st) => ({ id: st.id, label: st.label, done: false })),
    });

    for (let i = 0; i < timed.length; i++) {
      const delay = timed[i].delayKey
        ? scaledMs(timed[i].delayKey!, mode)
        : i === 0
          ? 40
          : 200;
      await simulateOperation({ durationMs: delay });
      set((st) => ({
        vpcProvision: (st.vpcProvision || []).map((step, idx) =>
          idx <= i ? { ...step, done: true } : step
        ),
      }));
    }

    const naclId = `acl-${vpcId.replace("vpc-", "").slice(0, 17)}`;
    const publicCidrOffsets = [0, 16, 32];
    const privateCidrOffsets = [128, 144, 160];
    const [a, b] = cidr
      .split("/")[0]
      .split(".")
      .map(Number);
    const newSubnets: AccountSnapshot["subnets"] = [];
    for (let i = 0; i < publicTarget; i++) {
      const az = azLetters[i % azCount];
      const off = publicCidrOffsets[Math.min(i, publicCidrOffsets.length - 1)];
      newSubnets.push({
        id: awsId("subnet"),
        name: `${name}-subnet-public${i + 1}-${region}${az}`,
        state: "available",
        vpc: vpcId,
        cidr: `${a}.${b}.${off}.0/20`,
        az: `${region}${az}`,
        public_ip_on_launch: true,
        available_ips: 4091,
        subnet_type: "public",
      });
    }
    for (let i = 0; i < privateTarget; i++) {
      const az = azLetters[i % azCount];
      const off = privateCidrOffsets[Math.min(i, privateCidrOffsets.length - 1)];
      newSubnets.push({
        id: awsId("subnet"),
        name: `${name}-subnet-private${i + 1}-${region}${az}`,
        state: "available",
        vpc: vpcId,
        cidr: `${a}.${b}.${off}.0/20`,
        az: `${region}${az}`,
        public_ip_on_launch: false,
        available_ips: 4091,
        subnet_type: "private",
      });
    }

    const publicSubnetIds = newSubnets
      .filter((s) => s.subnet_type === "public")
      .map((s) => s.id);
    const privateSubnetIds = newSubnets
      .filter((s) => s.subnet_type === "private")
      .map((s) => s.id);

    const mainRoutes = [
      {
        destination: cidr,
        target: "local",
        status: "active",
        propagated: false,
      },
      ...(igwId
        ? [
            {
              destination: "0.0.0.0/0",
              target: igwId,
              status: "active",
              propagated: false,
            },
          ]
        : []),
    ];
    const privateRoutes = [
      {
        destination: cidr,
        target: "local",
        status: "active",
        propagated: false,
      },
      ...(nat !== "none"
        ? [
            {
              destination: "0.0.0.0/0",
              target: awsId("nat"),
              status: "active",
              propagated: false,
            },
          ]
        : []),
    ];

    set((st) => ({
      vpcProvision: [
        ...(st.vpcProvision || []).map((s) => ({ ...s, done: true })),
        {
          id: "success",
          label: "VPC workflow completed successfully",
          done: true,
        },
      ],
      vpcs: [
        ...st.vpcs,
        {
          id: vpcId,
          name,
          state: "available" as const,
          cidr,
          ipv6: null,
          dhcp,
          main_route_table: mainRtId,
          main_network_acl: naclId,
        },
      ],
      subnets: [...st.subnets, ...newSubnets],
      igws: igwId
        ? [
            ...st.igws,
            {
              id: igwId,
              name: `${name}-igw`,
              state: "attached" as const,
              vpc: vpcId,
            },
          ]
        : st.igws,
      route_tables: [
        ...st.route_tables,
        {
          id: mainRtId,
          name: withMore ? `${name}-rtb-public` : `${name}-rtb-main`,
          vpc: vpcId,
          main: true,
          routes: mainRoutes,
          associated_subnet_ids: publicSubnetIds,
        },
        ...(privateRtId
          ? [
              {
                id: privateRtId,
                name: `${name}-rtb-private`,
                vpc: vpcId,
                main: false,
                routes: privateRoutes,
                associated_subnet_ids: privateSubnetIds,
              },
            ]
          : []),
      ],
      flash: okFlash(
        withMore
          ? `Successfully created VPC ${vpcId} with ${newSubnets.length} subnet(s).`
          : `Successfully created VPC ${vpcId}.`
      ),
    }));
    get().log("create_vpc", "vpc", vpcId, {
      name,
      cidr,
      azCount,
      nat,
      tenancy: opts.tenancy === "dedicated" ? "dedicated" : "default",
      s3Endpoint: wantEndpoint,
    });
  },

  createVpcWorkflow: (opts) => get().createVpc(opts),

  clearVpcProvision: () => {
    set({
      vpcProvision: null,
      route: { service: "vpc", page: "vpcs", selectedId: null },
    });
  },

  updateSubnetSettings: (subnetId, settings) => {
    set((s) => ({
      subnets: s.subnets.map((sub) =>
        sub.id === subnetId
          ? { ...sub, public_ip_on_launch: settings.public_ip_on_launch }
          : sub
      ),
      flash: okFlash(
        `Success: Successfully modified subnet settings for ${subnetId}.`
      ),
    }));
    get().log("update_subnet", "vpc", subnetId, {
      public_ip_on_launch: settings.public_ip_on_launch,
    });
  },

  setRoutes: (rtId, routes) => {
    set((s) => ({
      route_tables: s.route_tables.map((rt) =>
        rt.id === rtId ? { ...rt, routes: [...routes] } : rt
      ),
      flash: okFlash(`Successfully updated routes for ${rtId}.`),
    }));
    get().log("set_routes", "vpc", rtId, { count: routes.length });
  },

  editRoutes: (rtId, routes) => get().setRoutes(rtId, routes),

  createAlarm: async (opts) => {
    const name =
      typeof opts?.name === "string" ? opts.name.trim() : "";
    const condition =
      typeof opts?.condition === "string" ? opts.condition.trim() : "";
    if (!name || name.length > 255) {
      set({
        flash: errFlash("Enter a valid CloudWatch alarm name (1–255 characters)."),
      });
      return;
    }
    if (!condition) {
      set({ flash: errFlash("Set an alarm condition before creating the alarm.") });
      return;
    }
    if (get().alarms.some((a) => a.name === name)) {
      set({ flash: errFlash(`Alarm ${name} already exists.`) });
      return;
    }
    const threshold =
      typeof opts.threshold === "number" && Number.isFinite(opts.threshold)
        ? opts.threshold
        : undefined;
    await simulateOperation({
      durationMs: scaledMs("cwCreateAlarm", get().consoleMode),
    });
    const id = `alarm-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()
      .toString(36)
      .slice(-4)}`;
    set((s) => ({
      alarms: [
        ...s.alarms,
        {
          id,
          name,
          description:
            typeof opts.description === "string" ? opts.description : "",
          state: "INSUFFICIENT_DATA" as const,
          condition,
          metric:
            (typeof opts.metric === "string" && opts.metric) ||
            condition.split(" ")[0],
          namespace:
            (typeof opts.namespace === "string" && opts.namespace) || "AWS/EC2",
          statistic: opts.statistic || "Average",
          threshold,
          comparisonOperator: opts.comparisonOperator,
          actions: 1,
          actionTarget:
            (typeof opts.actionTarget === "string" && opts.actionTarget) ||
            "SNS: rebon-dev-alerts",
          period:
            (typeof opts.period === "string" && opts.period) || "5 minutes",
        },
      ],
      route: { service: "cloudwatch", page: "alarms", selectedId: null },
      flash: okFlash(`Successfully created alarm: ${name}`),
    }));
    get().log("create_alarm", "cloudwatch", name, {
      condition,
      metric: (typeof opts.metric === "string" && opts.metric) || "",
    });
  },

  createCloudWatchAlarm: (opts) => get().createAlarm(opts),

  deleteAlarm: (nameOrId) => {
    set((s) => ({
      alarms: s.alarms.filter((a) => a.name !== nameOrId && a.id !== nameOrId),
      flash: okFlash(`Alarm ${nameOrId} deleted.`),
    }));
    get().log("delete_alarm", "cloudwatch", nameOrId, {});
  },

  deleteCloudWatchAlarm: (nameOrId) => get().deleteAlarm(nameOrId),

  createDashboard: (name) => {
    const lastModified = `${new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })} (UTC+05:30)`;
    set((s) => ({
      dashboards: [...s.dashboards, { name, widgets: [], lastModified }],
      route: { service: "cloudwatch", page: "dashboard-view", selectedId: name },
      flash: okFlash(`Successfully created dashboard: ${name}`),
    }));
    get().log("create_dashboard", "cloudwatch", name, {});
  },

  addDashboardWidget: (name, widget) => {
    const id = widget?.id || `w-${Date.now().toString(36)}`;
    const next = {
      id,
      type: (widget?.type || "line") as
        | "line"
        | "number"
        | "stacked"
        | "bar"
        | "pie"
        | "text",
      metricName: widget?.metricName || "CPUUtilization",
      title: widget?.title || widget?.metricName || "CPUUtilization",
      x: widget?.x ?? 0,
      y: widget?.y ?? 0,
      width: widget?.width ?? 6,
      height: widget?.height ?? 4,
    };
    set((s) => ({
      dashboards: s.dashboards.map((d) =>
        d.name === name
          ? {
              ...d,
              widgets: [...(Array.isArray(d.widgets) ? d.widgets : []), next],
              lastModified: `${new Date().toLocaleString("en-US", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })} (UTC+05:30)`,
            }
          : d
      ),
      flash: okFlash(`Widget added to ${name}.`),
    }));
    get().log("add_widget", "cloudwatch", name, { id });
  },

  addWidgetToDashboard: (name, widget) => get().addDashboardWidget(name, widget),

  deleteDashboard: (name) => {
    set((s) => ({
      dashboards: s.dashboards.filter((d) => d.name !== name),
      flash: okFlash(`Deleted dashboard ${name}.`),
      route: { service: "cloudwatch", page: "dashboards", selectedId: null },
    }));
    get().log("delete_dashboard", "cloudwatch", name, {});
  },

  createLogGroup: (name) => {
    set((s) => ({
      log_groups: [
        ...s.log_groups,
        { name, retention: "Never expire", metric_filters: 0, subscriptions: 0 },
      ],
      flash: okFlash(`Log group ${name} created.`),
    }));
    get().log("create_log_group", "cloudwatch", name, {});
  },

  createBudget: async (opts) => {
    const name = typeof opts?.name === "string" ? opts.name.trim() : "";
    if (!name || name.length > 100) {
      set({
        flash: errFlash("Enter a valid budget name (1–100 characters)."),
      });
      return;
    }
    if (get().budgets.some((b) => b.name === name)) {
      set({ flash: errFlash(`Budget ${name} already exists.`) });
      return;
    }
    const amount =
      typeof opts.amount === "number" && Number.isFinite(opts.amount) && opts.amount > 0
        ? opts.amount
        : NaN;
    if (!Number.isFinite(amount)) {
      set({ flash: errFlash("Enter a budget amount greater than 0.") });
      return;
    }
    const threshold =
      typeof opts.threshold === "number" &&
      Number.isFinite(opts.threshold) &&
      opts.threshold > 0 &&
      opts.threshold <= 1000
        ? opts.threshold
        : NaN;
    if (!Number.isFinite(threshold)) {
      set({
        flash: errFlash("Enter a valid alert threshold percentage (greater than 0)."),
      });
      return;
    }
    const email = typeof opts.email === "string" ? opts.email.trim() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      set({ flash: errFlash("Enter a valid email address for budget alerts.") });
      return;
    }
    const period =
      opts.period === "Daily" ||
      opts.period === "Quarterly" ||
      opts.period === "Annually"
        ? opts.period
        : "Monthly";
    const thresholdType =
      opts.thresholdType === "Actual" ? "Actual" : "Forecasted";

    await simulateOperation({
      durationMs: scaledMs("billingCreateBudget", get().consoleMode),
    });
    const id = `budget-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()
      .toString(36)
      .slice(-4)}`;
    set((s) => ({
      budgets: [
        ...s.budgets,
        {
          id,
          name,
          period,
          budgeted: amount,
          current: Math.round(amount * 0.35 * 100) / 100,
          forecasted: Math.round(amount * 0.92 * 100) / 100,
          alert_threshold: threshold,
          threshold_type: thresholdType,
          email,
        },
      ],
      route: { service: "billing", page: "budgets", selectedId: null },
      flash: okFlash(`Successfully created budget: ${name}`),
    }));
    get().log("create_budget", "billing", name, {
      amount,
      threshold,
      email,
    });
  },

  deleteBudget: (nameOrId) => {
    set((s) => ({
      budgets: s.budgets.filter((b) => b.name !== nameOrId && b.id !== nameOrId),
      flash: okFlash(`Budget ${nameOrId} deleted.`),
    }));
    get().log("delete_budget", "billing", nameOrId, {});
  },

  getCostExplorerData: (granularity, dateRange) => {
    const rows = get().cost_rows;
    const months =
      dateRange === "6m"
        ? ["October 2025", "November 2025", "December 2025", "January 2026", "February 2026", "March 2026"]
        : dateRange === "3m"
          ? ["January 2026", "February 2026", "March 2026"]
          : granularity === "Daily"
            ? ["Aug 1", "Aug 8", "Aug 15", "Aug 22", "Aug 26"]
            : ["January 2026", "February 2026", "March 2026"];
    const factors =
      dateRange === "6m"
        ? [0.85, 0.9, 0.95, 0.98, 1.0, 1.05]
        : dateRange === "3m"
          ? [0.92, 0.98, 1.05]
          : granularity === "Daily"
            ? [0.2, 0.22, 0.25, 0.28, 0.3]
            : [0.92, 0.98, 1.05];
    return months.map((month, mi) => {
      const services: Record<string, number> = {};
      let total = 0;
      for (const r of rows) {
        const val =
          Math.round(r.this_month * (factors[mi] || 1) * (0.85 + (mi % 3) * 0.05) * 100) /
          100;
        services[r.service] = val;
        total += val;
      }
      return { month, services, total: Math.round(total * 100) / 100 };
    });
  },

  createSubnet: (opts) => {
    const id = awsId("subnet");
    set((s) => ({
      subnets: [
        ...s.subnets,
        {
          id,
          name: opts.name,
          state: "available",
          vpc: opts.vpc,
          cidr: opts.cidr,
          az: opts.az,
          public_ip_on_launch: opts.public_ip_on_launch,
          available_ips: 251,
          subnet_type: opts.public_ip_on_launch ? "public" : "private",
        },
      ],
      flash: okFlash(`Subnet ${id} created.`),
    }));
    get().log("create_subnet", "vpc", id, { ...opts });
  },

  createSecurityGroup: (name, vpc, description, opts = {}) => {
    const id = awsId("sg");
    set((s) => ({
      security_groups: [
        ...s.security_groups,
        {
          id,
          name,
          vpc,
          description,
          inbound: [],
          outbound: [
            {
              type: "All traffic",
              protocol: "All",
              port: "All",
              source: "0.0.0.0/0",
              description: "Allow all outbound",
            },
          ],
        },
      ],
      ...(opts.stayOnPage
        ? {}
        : { route: { service: "vpc" as const, page: "sg-detail", selectedId: id } }),
      flash: okFlash(`Security group ${name} created.`),
    }));
    get().log("create_sg", "vpc", id, { name, vpc });
  },

  createIgw: (name, vpc = null) => {
    const id = awsId("igw");
    set((s) => ({
      igws: [
        ...s.igws,
        {
          id,
          name,
          state: vpc ? ("attached" as const) : ("detached" as const),
          vpc,
        },
      ],
      flash: okFlash(`Internet gateway ${id} created.`),
    }));
    get().log("create_igw", "vpc", id, { name, vpc: vpc || "" });
  },

  attachIgw: (igwId, vpcId) => {
    set((s) => ({
      igws: s.igws.map((g) =>
        g.id === igwId ? { ...g, state: "attached" as const, vpc: vpcId } : g
      ),
      flash: okFlash(`Attached ${igwId} to ${vpcId}.`),
    }));
    get().log("attach_igw", "vpc", igwId, { vpc: vpcId });
  },

  addRoute: (rtId, destination, target) => {
    set((s) => ({
      route_tables: s.route_tables.map((rt) =>
        rt.id === rtId
          ? {
              ...rt,
              routes: [
                ...rt.routes,
                { destination, target, status: "active" },
              ],
            }
          : rt
      ),
      flash: okFlash(`Route ${destination} → ${target} added.`),
    }));
    get().log("add_route", "vpc", rtId, { destination, target });
  },

  addLogInsightQuery: (query) => {
    get().log("run_logs_insights", "cloudwatch", "query", { query });
  },

  patchInstanceType: (id, type) => {
    const trimmed = type.trim();
    if (!trimmed) {
      set({ flash: errFlash("Instance type is required.") });
      return;
    }
    const inst = get().instances.find((i) => i.id === id);
    if (!inst) {
      set({ flash: errFlash(`Instance ${id} not found.`) });
      return;
    }
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id ? { ...i, type: trimmed } : i
      ),
      flash: okFlash(`Successfully changed instance type of ${id} to ${trimmed}.`),
    }));
    get().log("change_instance_type", "ec2", id, { type: trimmed });
  },

  allocateElasticIp: async (opts = {}) => {
    const allocation_id = awsId("eip");
    const public_ip = `${Math.floor(Math.random() * 200) + 13}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    set((s) => ({
      elastic_ips: [
        ...s.elastic_ips,
        {
          allocation_id,
          public_ip,
          association_id: null,
          instance_id: null,
          private_ip: null,
          network_interface_id: null,
          domain: "vpc" as const,
          name: opts.name?.trim() || "",
        },
      ],
      flash: okFlash(`Allocating Elastic IP address…`),
    }));
    get().log("allocate_eip", "ec2", allocation_id, { public_ip });
    await simulateOperation({
      durationMs: scaledMs("ec2AllocateEip", get().consoleMode),
    });
    set({
      flash: okFlash(`Elastic IP address ${public_ip} allocated (${allocation_id}).`),
    });
  },

  createNetworkInterface: async ({ description, subnet_id }) => {
    const subnet = get().subnets.find((s) => s.id === subnet_id);
    if (!subnet) {
      set({ flash: errFlash("Choose a valid subnet.") });
      return;
    }
    const id = awsId("eni");
    const private_ip = subnet.cidr
      ? subnet.cidr.replace(/\/\d+$/, "").replace(/\.\d+$/, `.${20 + Math.floor(Math.random() * 200)}`)
      : "10.0.0.50";
    set((s) => ({
      network_interfaces: [
        ...s.network_interfaces,
        {
          id,
          description: description?.trim() || "",
          subnet_id,
          vpc_id: subnet.vpc,
          status: "available" as const,
          private_ip,
          public_ip: null,
          attachment_instance_id: null,
          security_groups: [],
          type: "interface" as const,
        },
      ],
      flash: okFlash(`Creating network interface ${id}…`),
    }));
    get().log("create_eni", "ec2", id, { subnet_id });
    await simulateOperation({
      durationMs: scaledMs("ec2CreateNetworkInterface", get().consoleMode),
    });
    set({ flash: okFlash(`Network interface ${id} created.`) });
  },

  createLaunchTemplate: async ({ name }) => {
    const trimmed = name.trim();
    if (!trimmed) {
      set({ flash: errFlash("Launch template name is required.") });
      return;
    }
    if (get().launch_templates.some((t) => t.name === trimmed)) {
      set({ flash: errFlash(`Launch template ${trimmed} already exists.`) });
      return;
    }
    const id = awsId("lt");
    const created = new Date().toISOString().slice(0, 10);
    set((s) => ({
      launch_templates: [
        ...s.launch_templates,
        {
          id,
          name: trimmed,
          default_version: 1,
          latest_version: 1,
          created,
        },
      ],
      flash: okFlash(`Creating launch template ${trimmed}…`),
    }));
    get().log("create_launch_template", "ec2", id, { name: trimmed });
    await simulateOperation({
      durationMs: scaledMs("ec2CreateLaunchTemplate", get().consoleMode),
    });
    set({ flash: okFlash(`Launch template ${trimmed} (${id}) created.`) });
  },

  createPlacementGroup: async ({ name, strategy = "cluster" }) => {
    const trimmed = name.trim();
    if (!trimmed) {
      set({ flash: errFlash("Placement group name is required.") });
      return;
    }
    const id = awsId("pg");
    set((s) => ({
      placement_groups: [
        ...s.placement_groups,
        { id, name: trimmed, strategy, state: "available" as const },
      ],
      flash: okFlash(`Placement group ${trimmed} created.`),
    }));
    get().log("create_placement_group", "ec2", id, { name: trimmed, strategy });
  },

  requestSpotInstances: async ({ instance_type, spot_price = "0.05" }) => {
    const id = awsId("sir");
    const created = new Date().toISOString().slice(0, 10);
    set((s) => ({
      spot_requests: [
        ...s.spot_requests,
        {
          id,
          state: "open" as const,
          instance_type,
          spot_price,
          created,
        },
      ],
      flash: okFlash(`Spot Instance request ${id} submitted.`),
    }));
    get().log("request_spot", "ec2", id, { instance_type, spot_price });
  },

  purchaseReservedInstances: async ({
    instance_type,
    offering_class = "standard",
  }) => {
    const id = awsId("ri");
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    set((s) => ({
      reserved_instances: [
        ...s.reserved_instances,
        {
          id,
          instance_type,
          state: "active" as const,
          scope: "Region" as const,
          offering_class,
          end: end.toISOString().slice(0, 10),
        },
      ],
      flash: okFlash(`Reserved Instance ${id} purchased.`),
    }));
    get().log("purchase_ri", "ec2", id, { instance_type, offering_class });
  },

  createLaunchConfiguration: async ({
    name,
    instance_type = "t3.micro",
    image_id = "ami-0abcdef1234567890",
  }) => {
    const trimmed = name.trim();
    if (!trimmed) {
      set({ flash: errFlash("Launch configuration name is required.") });
      return;
    }
    const created = new Date().toISOString().slice(0, 10);
    set((s) => ({
      launch_configurations: [
        ...s.launch_configurations,
        { name: trimmed, image_id, instance_type, created },
      ],
      flash: okFlash(`Launch configuration ${trimmed} created.`),
    }));
    get().log("create_launch_config", "ec2", trimmed, { instance_type });
  },

  createVpcNamedResource: async (slice, opts) => {
    const name = opts.name.trim();
    if (!name) {
      set({ flash: errFlash("Name is required.") });
      return;
    }
    const idPrefixes: Record<typeof slice, () => string> = {
      vpc_endpoints: () => awsId("vpce"),
      endpoint_services: () => `vpce-svc-0${awsId("i").slice(2)}`,
      peering_connections: () => awsId("pcx"),
      customer_gateways: () => awsId("cgw"),
      virtual_private_gateways: () => awsId("vgw"),
      vpn_connections: () => awsId("vpn"),
      prefix_lists: () => awsId("pl"),
      egress_igws: () => awsId("eigw"),
      carrier_gateways: () => awsId("cagw"),
      dhcp_option_sets: () => awsId("dopt"),
    };
    const id = idPrefixes[slice]();
    const created = new Date().toISOString().slice(0, 10);
    const vpc_id = opts.vpc_id || get().vpcs[0]?.id;
    set((s) => ({
      [slice]: [
        ...s[slice],
        {
          id,
          name,
          state: "available",
          vpc_id,
          created,
          detail: opts.detail,
        },
      ],
      flash: okFlash(`Created ${name} (${id}).`),
    }));
    get().log(`create_${slice}`, "vpc", id, { name });
  },

  deleteVpc: (ids) => {
    const idSet = new Set(ids);
    if (!idSet.size) return;
    set((s) => ({
      vpcs: s.vpcs.filter((v) => !idSet.has(v.id)),
      subnets: s.subnets.filter((sub) => !idSet.has(sub.vpc)),
      flash: okFlash(
        ids.length === 1
          ? `Successfully deleted VPC ${ids[0]}.`
          : `Successfully deleted ${ids.length} VPCs.`
      ),
    }));
    ids.forEach((id) => get().log("delete_vpc", "vpc", id));
  },

  updateNetworkAclRules: (aclId, direction, rules) => {
    set((s) => ({
      network_acls: s.network_acls.map((a) =>
        a.id === aclId
          ? {
              ...a,
              inbound: direction === "inbound" ? [...rules] : a.inbound,
              outbound: direction === "outbound" ? [...rules] : a.outbound,
            }
          : a
      ),
      flash: okFlash(
        `Successfully modified ${direction} rules for network ACL ${aclId}.`
      ),
    }));
    get().log("update_nacl_rules", "vpc", aclId, {
      direction,
      count: rules.length,
    });
  },
    }),
    {
      name: "RebonAwsConsole",
      enabled: Boolean(import.meta.env?.DEV),
    }
  )
);

/** Post-action integrity: repair dangling refs; never crash the console. */
let integrityRepairing = false;
rememberGoodResources(useAccountStore.getState());
useAccountStore.subscribe((state) => {
  if (integrityRepairing) return;
  const patch = repairAccountResources(state);
  if (!patch) return;
  integrityRepairing = true;
  useAccountStore.setState(patch);
  integrityRepairing = false;
});

import type { IamConsoleAction } from "../iamActions";

export type ServiceId =
  | "home"
  | "iam"
  | "ec2"
  | "s3"
  | "vpc"
  | "cloudwatch"
  | "billing"
  | "catalog";

export type ConsoleMode = "learn" | "work";

export type IamPage =
  | "dashboard"
  | "users"
  | "create-user"
  | "create-user-success"
  | "user-detail"
  | "groups"
  | "roles"
  | "policies"
  | "identity-providers"
  | "account-settings"
  | "security-credentials"
  | "organizations";

export type Ec2Page =
  | "dashboard"
  | "instances"
  | "launch"
  | "asg"
  | "load-balancers"
  | "key-pairs"
  | "elastic-ips"
  | "placement-groups"
  | "network-interfaces"
  | "launch-templates"
  | "spot-requests"
  | "reserved-instances"
  | "target-groups"
  | "target-group-detail"
  | "launch-configurations"
  | "security-groups"
  | "instance-detail";

export type S3Page =
  | "buckets"
  | "create-bucket"
  | "bucket-detail"
  | "access-points"
  | "object-lambda"
  | "mrap"
  | "batch"
  | "access-analyzer"
  | "account-bpa";

export type S3ObjectItem = {
  key: string;
  size: number;
  type: string;
  lastModified: string;
  storageClass: string;
};

export type VpcPage =
  | "dashboard"
  | "vpcs"
  | "create-vpc"
  | "subnets"
  | "security-groups"
  | "sg-detail"
  | "igws"
  | "route-tables"
  | "rt-detail"
  | "rt-edit"
  | "nat-gateways"
  | "endpoints"
  | "endpoint-services"
  | "peering-connections"
  | "customer-gateways"
  | "virtual-private-gateways"
  | "vpn-connections"
  | "prefix-lists"
  | "egress-igws"
  | "carrier-gateways"
  | "dhcp-options"
  | "elastic-ips"
  | "network-acls"
  | "nacl-detail"
  | "ram"
  | "ipam";

export type NaclRule = {
  rule_number: number | "*";
  type: string;
  protocol: string;
  port_range: string;
  cidr: string;
  action: "Allow" | "Deny";
};

export type NetworkAcl = {
  id: string;
  name: string;
  vpc: string;
  is_default: boolean;
  associated_subnet_ids: string[];
  inbound: NaclRule[];
  outbound: NaclRule[];
};

export type IdentityProvider = {
  name: string;
  type: "SAML" | "OpenID Connect";
  created: string;
  audience?: string;
  provider_url?: string;
};

export type TargetGroup = {
  arn: string;
  name: string;
  target_type: "instance" | "ip" | "lambda" | "alb";
  protocol: string;
  port: number;
  vpc: string;
  health_check_path: string;
  targets: { id: string; port: number; health: "healthy" | "unhealthy" | "initial" | "unused" }[];
  load_balancer_arns: string[];
};

export type CostAllocationTag = {
  key: string;
  status: "Active" | "Inactive";
  last_updated: string;
  source: "User-defined" | "AWS-generated";
};

export type KeyPair = {
  name: string;
  fingerprint: string;
  type: "rsa" | "ed25519";
  created: string;
};

export type NatGateway = {
  id: string;
  name: string;
  subnet_id: string;
  vpc_id: string;
  state: "pending" | "available" | "deleting" | "deleted" | "failed";
  connectivity: "public" | "private";
  created: string;
};

export type AccountBlockPublicAccess = {
  block_acls: boolean;
  ignore_acls: boolean;
  block_policy: boolean;
  restrict_buckets: boolean;
};

export type InsightLogRow = {
  ts: string;
  msg: string;
  log_group: string;
};
export type CwPage =
  | "overview"
  | "dashboards"
  | "dashboard-view"
  | "alarms"
  | "alarms-in-alarm"
  | "alarms-billing"
  | "create-alarm"
  | "log-groups"
  | "logs-insights"
  | "metrics-all"
  | "metrics-explorer"
  | "events-rules";

export type BillingPage =
  | "dashboard"
  | "bills"
  | "cost-explorer"
  | "budgets"
  | "create-budget"
  | "cost-allocation-tags"
  | "savings-plans"
  | "billing-preferences"
  | "payment-methods";

export type MonthlyCostData = {
  month: string;
  services: Record<string, number>;
  total: number;
};

export type IamUser = {
  username: string;
  created: string;
  mfa: boolean;
  console_access: boolean;
  policies: string[];
  groups: string[];
  last_activity: string;
  password_age: string;
  access_keys: { id: string; status: "Active" | "Inactive"; created: string }[];
  password: string | null;
};

export type IamGroup = {
  name: string;
  policies: string[];
  members: string[];
};

export type IamRole = {
  name: string;
  trusted: string;
  last_activity: string;
  policies: string[];
  description?: string;
  max_session_duration?: string;
};

export type IamPolicy = {
  name: string;
  type: "AWS managed" | "Customer managed" | "Job function";
  attached: number;
  created: string;
};

export type Ec2InstanceState =
  | "pending"
  | "running"
  | "stopping"
  | "stopped"
  | "shutting-down"
  | "terminated";

export type Ec2Instance = {
  id: string;
  name: string;
  state: Ec2InstanceState;
  type: string;
  status_check: "ok" | "impaired" | "initializing";
  alarm_status: "No alarms" | "In alarm" | "Insufficient data";
  az: string;
  region: string;
  public_ip: string | null;
  private_ip: string;
  public_dns?: string | null;
  security_groups?: string[];
  vpc_id?: string;
  subnet_id?: string;
  key_name?: string;
  platform?: string;
};

export type ElasticIp = {
  allocation_id: string;
  public_ip: string;
  association_id: string | null;
  instance_id: string | null;
  private_ip: string | null;
  network_interface_id: string | null;
  domain: "vpc" | "standard";
  name: string;
};

export type NetworkInterface = {
  id: string;
  description: string;
  subnet_id: string;
  vpc_id: string;
  status: "available" | "in-use";
  private_ip: string;
  public_ip: string | null;
  attachment_instance_id: string | null;
  security_groups: string[];
  type: "interface" | "efa" | "trunk";
};

export type LaunchTemplate = {
  id: string;
  name: string;
  default_version: number;
  latest_version: number;
  created: string;
};

export type PlacementGroup = {
  id: string;
  name: string;
  strategy: "cluster" | "spread" | "partition";
  state: "available" | "pending" | "deleting" | "deleted";
};

export type SpotRequest = {
  id: string;
  state: "open" | "active" | "closed" | "cancelled" | "failed";
  instance_type: string;
  spot_price: string;
  created: string;
};

export type ReservedInstance = {
  id: string;
  instance_type: string;
  state: "active" | "retired" | "payment-pending";
  scope: "Region" | "Availability Zone";
  offering_class: "standard" | "convertible";
  end: string;
};

export type LaunchConfiguration = {
  name: string;
  image_id: string;
  instance_type: string;
  created: string;
};

/** Generic VPC console secondary resource row. */
export type VpcNamedResource = {
  id: string;
  name: string;
  state: string;
  vpc_id?: string;
  created: string;
  detail?: string;
};

export type FlashMessage = {
  type: "success" | "error" | "info" | "warning";
  content: string;
};

export type AutoScalingGroup = {
  name: string;
  instances: number;
  min: number;
  max: number;
  desired: number;
  status: string;
  health_check: "EC2" | "ELB";
};

export type LoadBalancer = {
  name: string;
  dns: string;
  state: "active" | "provisioning";
  type: "application" | "network";
  vpc: string;
  scheme?: "internet-facing" | "internal";
  target_group_arns?: string[];
  listeners?: { protocol: string; port: number; target_group_arn?: string }[];
};

export type S3Bucket = {
  name: string;
  region: string;
  public: boolean;
  objects: number;
  /** Legacy key list; prefer object_items when present. */
  object_keys: string[];
  object_items?: S3ObjectItem[];
  created: string;
  encryption: string;
  versioning: "Enabled" | "Suspended" | "Disabled";
  block_public_access: {
    block_acls: boolean;
    ignore_acls: boolean;
    block_policy: boolean;
    restrict_buckets: boolean;
  };
  policy: string;
  lifecycle_rules: { name: string; status: string; prefix: string; actions: string }[];
};

export type Vpc = {
  id: string;
  name: string;
  state: "available";
  cidr: string;
  ipv6: string | null;
  dhcp: string;
  main_route_table: string;
  main_network_acl?: string;
};

export type Subnet = {
  id: string;
  name: string;
  state: "available";
  vpc: string;
  cidr: string;
  az: string;
  public_ip_on_launch: boolean;
  available_ips?: number;
  subnet_type?: "public" | "private";
};

export type SecurityGroup = {
  id: string;
  name: string;
  vpc: string;
  description: string;
  inbound: SgRule[];
  outbound: SgRule[];
};

export type SgRule = {
  type: string;
  protocol: string;
  port: string;
  source: string;
  description: string;
};

export type InternetGateway = {
  id: string;
  name: string;
  state: "attached" | "detached";
  vpc: string | null;
};

export type RouteTable = {
  id: string;
  name: string;
  vpc: string;
  main: boolean;
  routes: { destination: string; target: string; status: string; propagated?: boolean }[];
  associated_subnet_ids?: string[];
};

export type CwWidget = {
  id: string;
  type: "line" | "number" | "stacked" | "bar" | "pie" | "text";
  metricName?: string;
  title?: string;
  /** Shown on number and text widgets when the company data has a real reading. */
  value?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CwDashboard = {
  name: string;
  widgets: CwWidget[];
  lastModified: string;
};

export type CwAlarm = {
  id: string;
  name: string;
  description?: string;
  state: "OK" | "ALARM" | "INSUFFICIENT_DATA";
  condition: string;
  metric?: string;
  namespace?: string;
  statistic?: "Average" | "Sum" | "Minimum" | "Maximum";
  threshold?: number;
  comparisonOperator?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanOrEqualToThreshold"
    | "LessThanThreshold";
  actions: number;
  actionTarget?: string;
  period: string;
};

export type LogGroup = {
  name: string;
  retention: string;
  metric_filters: number;
  subscriptions: number;
};

export type Budget = {
  id: string;
  name: string;
  period: "Daily" | "Monthly" | "Quarterly" | "Annually";
  budgeted: number;
  current: number;
  forecasted: number;
  alert_threshold: number;
  threshold_type: "Actual" | "Forecasted";
  email: string;
};

export type CostRow = {
  service: string;
  this_month: number;
  last_month: number;
  region?: string;
  tags?: Record<string, string>;
};

export type ActionLogEntry = {
  timestamp: number;
  action_type: string;
  resource_type: string;
  resource_id: string;
  params: Record<string, string | number | boolean | null>;
  result: "success" | "denied" | "error";
};

export type AccountIdentity = {
  account_id: string;
  account_name: string;
  iam_username: string;
  region: string;
};

export type ConsoleRoute = {
  service: ServiceId;
  page: string;
  selectedId: string | null;
};

export type AccountSnapshot = {
  identity: AccountIdentity;
  users: IamUser[];
  groups: IamGroup[];
  roles: IamRole[];
  policies: IamPolicy[];
  available_policies: string[];
  instances: Ec2Instance[];
  asgs: AutoScalingGroup[];
  load_balancers: LoadBalancer[];
  key_pairs: KeyPair[];
  elastic_ips: ElasticIp[];
  network_interfaces: NetworkInterface[];
  launch_templates: LaunchTemplate[];
  placement_groups: PlacementGroup[];
  spot_requests: SpotRequest[];
  reserved_instances: ReservedInstance[];
  launch_configurations: LaunchConfiguration[];
  buckets: S3Bucket[];
  account_bpa: AccountBlockPublicAccess;
  vpcs: Vpc[];
  subnets: Subnet[];
  security_groups: SecurityGroup[];
  igws: InternetGateway[];
  route_tables: RouteTable[];
  nat_gateways: NatGateway[];
  network_acls: NetworkAcl[];
  vpc_endpoints: VpcNamedResource[];
  endpoint_services: VpcNamedResource[];
  peering_connections: VpcNamedResource[];
  customer_gateways: VpcNamedResource[];
  virtual_private_gateways: VpcNamedResource[];
  vpn_connections: VpcNamedResource[];
  prefix_lists: VpcNamedResource[];
  egress_igws: VpcNamedResource[];
  carrier_gateways: VpcNamedResource[];
  dhcp_option_sets: VpcNamedResource[];
  identity_providers: IdentityProvider[];
  target_groups: TargetGroup[];
  cost_allocation_tags: CostAllocationTag[];
  dashboards: CwDashboard[];
  alarms: CwAlarm[];
  log_groups: LogGroup[];
  insight_logs: InsightLogRow[];
  budgets: Budget[];
  cost_rows: CostRow[];
};

export type VisualMode = "light" | "dark" | "system";

export type HomeWidgetId =
  | "welcome"
  | "cost"
  | "recent"
  | "health"
  | "favorites"
  | "trusted"
  | "explore";

export type HomeLayoutState = {
  widgets: HomeWidgetId[];
  showFavIcon: boolean;
  showFavName: boolean;
};

export type OverlayState = {
  services_open: boolean;
  search_open: boolean;
  search_query: string;
  region_open: boolean;
  account_open: boolean;
  notifications_open: boolean;
  settings_open: boolean;
  support_open: boolean;
  cloudshell_open: boolean;
  recentlyVisited: ServiceId[];
  favorites: ServiceId[];
  homeLayout: HomeLayoutState;
};

export type GradingAction = IamConsoleAction;

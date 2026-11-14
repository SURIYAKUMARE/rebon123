import type {
  AccountSnapshot,
  ElasticIp,
  LaunchConfiguration,
  LaunchTemplate,
  NetworkInterface,
  PlacementGroup,
  ReservedInstance,
  S3Bucket,
  S3ObjectItem,
  SpotRequest,
  VpcNamedResource,
} from "./types";

const bpaOn = {
  block_acls: true,
  ignore_acls: true,
  block_policy: true,
  restrict_buckets: true,
};

function emptyNetworkingSlices() {
  return {
    elastic_ips: [] as ElasticIp[],
    network_interfaces: [] as NetworkInterface[],
    launch_templates: [] as LaunchTemplate[],
    placement_groups: [] as PlacementGroup[],
    spot_requests: [] as SpotRequest[],
    reserved_instances: [] as ReservedInstance[],
    launch_configurations: [] as LaunchConfiguration[],
    vpc_endpoints: [] as VpcNamedResource[],
    endpoint_services: [] as VpcNamedResource[],
    peering_connections: [] as VpcNamedResource[],
    customer_gateways: [] as VpcNamedResource[],
    virtual_private_gateways: [] as VpcNamedResource[],
    vpn_connections: [] as VpcNamedResource[],
    prefix_lists: [] as VpcNamedResource[],
    egress_igws: [] as VpcNamedResource[],
    carrier_gateways: [] as VpcNamedResource[],
    dhcp_option_sets: [] as VpcNamedResource[],
  };
}

function objectItem(key: string, size = 12_288): S3ObjectItem {
  const type = key.includes(".") ? key.split(".").pop() || "bin" : "folder";
  return {
    key,
    size,
    type,
    lastModified: "August 26, 2026, 14:30:00 (UTC+05:30)",
    storageClass: "Standard",
  };
}

function bucket(
  name: string,
  extra?: Partial<S3Bucket>
): S3Bucket {
  const keys =
    extra?.object_items?.map((o) => o.key) ??
    extra?.object_keys ??
    ["index.html", "assets/logo.png", "data/menu.json"];
  const object_items =
    extra?.object_items ??
    keys.map((k, i) => objectItem(k, [46285, 18432, 9021][i] ?? 4096));
  const { object_keys: _k, object_items: _i, objects: _o, ...rest } = extra || {};
  return {
    name,
    region: "ap-south-1",
    public: false,
    created: "August 26, 2026, 14:30:00 (UTC+05:30)",
    encryption: "SSE-S3",
    versioning: "Enabled",
    block_public_access: { ...bpaOn },
    policy: "",
    lifecycle_rules: [],
    ...rest,
    object_keys: object_items.map((o) => o.key),
    object_items,
    objects: _o ?? object_items.length,
  };
}

export const AWS_MANAGED_POLICIES = [
  "AdministratorAccess",
  "AmazonS3ReadOnlyAccess",
  "AmazonS3FullAccess",
  "AmazonEC2FullAccess",
  "AmazonEC2ReadOnlyAccess",
  "CloudWatchReadOnlyAccess",
  "CloudWatchFullAccess",
  "IAMUserChangePassword",
  "ReadOnlyAccess",
  "AmazonVPCFullAccess",
  "AWSBillingReadOnlyAccess",
];

export function createEmptyAccountSeed(
  accountId: string,
  accountName: string,
  iamUsername = "root"
): AccountSnapshot {
  return {
    identity: {
      account_id: accountId,
      account_name: accountName,
      iam_username: iamUsername,
      region: "us-east-1",
    },
    users: [],
    groups: [],
    roles: [],
    policies: AWS_MANAGED_POLICIES.map((name) => ({
      name,
      type: "AWS managed" as const,
      attached: 0,
      created: "2015-02-06",
    })),
    available_policies: [...AWS_MANAGED_POLICIES],
    instances: [],
    asgs: [],
    load_balancers: [],
    key_pairs: [],
    ...emptyNetworkingSlices(),
    buckets: [],
    account_bpa: { ...bpaOn },
    vpcs: [],
    subnets: [],
    security_groups: [],
    igws: [],
    route_tables: [],
    nat_gateways: [],
    network_acls: [],
    identity_providers: [],
    target_groups: [],
    cost_allocation_tags: [],
    dashboards: [],
    alarms: [],
    log_groups: [],
    insight_logs: [],
    budgets: [],
    cost_rows: [],
  };
}

export function createFreshBiteSeed(
  accountId = "847291635028",
  accountName = "FreshBite-Prod"
): AccountSnapshot {
  return {
    identity: {
      account_id: accountId,
      account_name: accountName,
      iam_username: "arjun.mehta",
      region: "ap-south-1",
    },
    users: [
      {
        username: "priya.dev",
        created: "2024-01-15",
        mfa: true,
        console_access: true,
        policies: ["AmazonS3ReadOnlyAccess"],
        groups: ["developers"],
        last_activity: "2 hours ago",
        password_age: "90 days",
        access_keys: [
          { id: "AKIAIOSFODNN7EXAMPLE", status: "Active", created: "2024-01-16" },
        ],
        password: null,
      },
      {
        username: "karthik.ops",
        created: "2024-02-03",
        mfa: false,
        console_access: true,
        policies: ["AmazonEC2FullAccess"],
        groups: ["ops"],
        last_activity: "Yesterday",
        password_age: "45 days",
        access_keys: [],
        password: null,
      },
      {
        username: "ananya.data",
        created: "2024-03-20",
        mfa: true,
        console_access: false,
        policies: ["AmazonS3ReadOnlyAccess", "CloudWatchReadOnlyAccess"],
        groups: ["data"],
        last_activity: "5 days ago",
        password_age: "None",
        access_keys: [
          { id: "AKIAI44QH8DHBEXAMPLE", status: "Active", created: "2024-03-21" },
          { id: "AKIAIOSFODEX2AMPLE", status: "Inactive", created: "2024-11-02" },
        ],
        password: null,
      },
    ],
    groups: [
      { name: "developers", policies: ["AmazonS3ReadOnlyAccess"], members: ["priya.dev"] },
      { name: "ops", policies: ["AmazonEC2FullAccess"], members: ["karthik.ops"] },
      { name: "data", policies: ["CloudWatchReadOnlyAccess"], members: ["ananya.data"] },
    ],
    roles: [
      {
        name: "FreshBiteEc2AppRole",
        trusted: "ec2.amazonaws.com",
        last_activity: "18 minutes ago",
        policies: ["AmazonS3ReadOnlyAccess", "CloudWatchAgentServerPolicy"],
        description: "EC2 app role for S3 read + CloudWatch agent",
        max_session_duration: "1 hour",
      },
      {
        name: "FreshBiteLambdaIngest",
        trusted: "lambda.amazonaws.com",
        last_activity: "3 hours ago",
        policies: ["AWSLambdaBasicExecutionRole"],
        description: "Lambda ingest execution role",
        max_session_duration: "1 hour",
      },
    ],
    policies: [
      ...AWS_MANAGED_POLICIES.map((name) => ({
        name,
        type: "AWS managed" as const,
        attached: name.includes("S3") ? 2 : name.includes("EC2") ? 1 : 0,
        created: "2015-02-06",
      })),
      {
        name: "FreshBiteMenuRead",
        type: "Customer managed" as const,
        attached: 1,
        created: "2024-08-11",
      },
    ],
    available_policies: [...AWS_MANAGED_POLICIES, "FreshBiteMenuRead"],
    instances: [
      {
        id: "i-0a8f31c2e91b44d17",
        name: "freshbite-prod-api-01",
        state: "running",
        type: "t3.medium",
        status_check: "ok",
        alarm_status: "No alarms",
        az: "ap-south-1a",
        region: "ap-south-1",
        public_ip: "13.232.41.90",
        public_dns: "ec2-13-232-41-90.ap-south-1.compute.amazonaws.com",
        private_ip: "10.0.1.24",
        security_groups: ["sg-0aa11bb22cc33dd44"],
        vpc_id: "vpc-0f1a2b3c4d5e6f789",
        subnet_id: "subnet-0a11b22c33d44e55f",
        key_name: "freshbite-prod-bastion",
        platform: "Linux/UNIX",
      },
      {
        id: "i-0c22ab91d7e10f882",
        name: "freshbite-prod-worker-01",
        state: "running",
        type: "t3.small",
        status_check: "ok",
        alarm_status: "No alarms",
        az: "ap-south-1b",
        region: "ap-south-1",
        public_ip: null,
        public_dns: null,
        private_ip: "10.0.2.18",
        security_groups: ["sg-0aa11bb22cc33dd44"],
        vpc_id: "vpc-0f1a2b3c4d5e6f789",
        subnet_id: "subnet-0b22c33d44e55f66a",
        key_name: "freshbite-prod-bastion",
        platform: "Linux/UNIX",
      },
      {
        id: "i-09bb7710aa0012c3f",
        name: "freshbite-prod-bastion",
        state: "stopped",
        type: "t3.micro",
        status_check: "ok",
        alarm_status: "No alarms",
        az: "ap-south-1a",
        region: "ap-south-1",
        public_ip: null,
        public_dns: null,
        private_ip: "10.0.1.10",
        security_groups: ["sg-0bb22cc33dd44ee55"],
        vpc_id: "vpc-0f1a2b3c4d5e6f789",
        subnet_id: "subnet-0a11b22c33d44e55f",
        key_name: "freshbite-prod-bastion",
        platform: "Linux/UNIX",
      },
    ],
    asgs: [
      {
        name: "freshbite-prod-api-asg",
        instances: 2,
        min: 2,
        max: 6,
        desired: 2,
        status: "Healthy",
        health_check: "ELB",
      },
    ],
    load_balancers: [
      {
        name: "freshbite-prod-alb",
        dns: "freshbite-prod-alb-1840291.ap-south-1.elb.amazonaws.com",
        state: "active",
        type: "application",
        vpc: "vpc-0f1a2b3c4d5e6f789",
        scheme: "internet-facing",
        target_group_arns: [
          "arn:aws:elasticloadbalancing:ap-south-1:847291635028:targetgroup/freshbite-prod-tg/50dc6c495c0c9188",
        ],
        listeners: [
          {
            protocol: "HTTP",
            port: 80,
            target_group_arn:
              "arn:aws:elasticloadbalancing:ap-south-1:847291635028:targetgroup/freshbite-prod-tg/50dc6c495c0c9188",
          },
        ],
      },
    ],
    buckets: [
      bucket("freshbite-prod-menu-assets", { objects: 1842, created: "2024-01-20" }),
      bucket("freshbite-prod-app-logs", {
        objects: 90211,
        created: "2024-02-04",
        versioning: "Disabled",
      }),
      bucket("freshbite-prod-backups", {
        objects: 64,
        created: "2024-03-01",
        encryption: "SSE-KMS",
      }),
    ],
    vpcs: [
      {
        id: "vpc-0f1a2b3c4d5e6f789",
        name: "freshbite-prod-vpc",
        state: "available",
        cidr: "10.0.0.0/16",
        ipv6: null,
        dhcp: "dopt-0aa11bb22cc33dd44",
        main_route_table: "rtb-0aa11bb22cc33dd01",
        main_network_acl: "acl-0aa11bb22cc33dd01",
      },
    ],
    subnets: [
      {
        id: "subnet-0a11b22c33d44e55f",
        name: "freshbite-prod-public-1a",
        state: "available",
        vpc: "vpc-0f1a2b3c4d5e6f789",
        cidr: "10.0.1.0/24",
        az: "ap-south-1a",
        public_ip_on_launch: true,
        available_ips: 251,
        subnet_type: "public",
      },
      {
        id: "subnet-0b22c33d44e55f66a",
        name: "freshbite-prod-private-1b",
        state: "available",
        vpc: "vpc-0f1a2b3c4d5e6f789",
        cidr: "10.0.2.0/24",
        az: "ap-south-1b",
        public_ip_on_launch: false,
        available_ips: 251,
        subnet_type: "private",
      },
    ],
    security_groups: [
      {
        id: "sg-0aa11bb22cc33dd44",
        name: "freshbite-prod-alb-sg",
        vpc: "vpc-0f1a2b3c4d5e6f789",
        description: "ALB ingress 80/443",
        inbound: [
          { type: "HTTP", protocol: "TCP", port: "80", source: "0.0.0.0/0", description: "web" },
          { type: "HTTPS", protocol: "TCP", port: "443", source: "0.0.0.0/0", description: "web tls" },
        ],
        outbound: [
          { type: "All traffic", protocol: "All", port: "All", source: "0.0.0.0/0", description: "" },
        ],
      },
      {
        id: "sg-0bb22cc33dd44ee55",
        name: "freshbite-prod-api-sg",
        vpc: "vpc-0f1a2b3c4d5e6f789",
        description: "API instances from ALB only",
        inbound: [
          {
            type: "Custom TCP",
            protocol: "TCP",
            port: "8080",
            source: "sg-0aa11bb22cc33dd44",
            description: "from alb",
          },
        ],
        outbound: [
          { type: "All traffic", protocol: "All", port: "All", source: "0.0.0.0/0", description: "" },
        ],
      },
    ],
    igws: [
      {
        id: "igw-0cc33dd44ee55ff66",
        name: "freshbite-prod-igw",
        state: "attached",
        vpc: "vpc-0f1a2b3c4d5e6f789",
      },
    ],
    route_tables: [
      {
        id: "rtb-0aa11bb22cc33dd01",
        name: "freshbite-prod-public-rt",
        vpc: "vpc-0f1a2b3c4d5e6f789",
        main: true,
        associated_subnet_ids: ["subnet-0a11b22c33d44e55f"],
        routes: [
          {
            destination: "10.0.0.0/16",
            target: "local",
            status: "active",
            propagated: false,
          },
          {
            destination: "0.0.0.0/0",
            target: "igw-0cc33dd44ee55ff66",
            status: "active",
            propagated: false,
          },
        ],
      },
      {
        id: "rtb-0bb22cc33dd44ee02",
        name: "freshbite-prod-private-rt",
        vpc: "vpc-0f1a2b3c4d5e6f789",
        main: false,
        associated_subnet_ids: ["subnet-0b22c33d44e55f66a"],
        routes: [
          {
            destination: "10.0.0.0/16",
            target: "local",
            status: "active",
            propagated: false,
          },
        ],
      },
    ],
    dashboards: [
      {
        name: "FreshBite-Prod-API",
        lastModified: "August 20, 2026, 11:12:00 (UTC+05:30)",
        widgets: [
          {
            id: "w1",
            type: "line",
            metricName: "CPUUtilization",
            title: "CPUUtilization",
            x: 0,
            y: 0,
            width: 6,
            height: 4,
          },
          {
            id: "w2",
            type: "number",
            metricName: "HTTPCode_Target_5XX_Count",
            title: "5XX count",
            x: 6,
            y: 0,
            width: 3,
            height: 2,
          },
        ],
      },
      {
        name: "FreshBite-Infra",
        lastModified: "August 18, 2026, 09:40:00 (UTC+05:30)",
        widgets: [
          {
            id: "w1",
            type: "line",
            metricName: "NetworkIn",
            title: "NetworkIn",
            x: 0,
            y: 0,
            width: 6,
            height: 4,
          },
        ],
      },
    ],
    alarms: [
      {
        id: "alarm-freshbite-api-5xx",
        name: "freshbite-api-5xx",
        description: "ALB 5xx spike",
        state: "ALARM",
        condition: "HTTPCode_Target_5XX_Count >= 10 for 1 datapoints within 5 minutes",
        metric: "HTTPCode_Target_5XX_Count",
        namespace: "AWS/ApplicationELB",
        statistic: "Sum",
        threshold: 10,
        comparisonOperator: "GreaterThanOrEqualToThreshold",
        actions: 1,
        actionTarget: "SNS: rebon-alerts",
        period: "5 minutes",
      },
      {
        id: "alarm-freshbite-cpu-high",
        name: "freshbite-cpu-high",
        description: "EC2 CPU high",
        state: "OK",
        condition: "CPUUtilization >= 80 for 1 datapoints within 5 minutes",
        metric: "CPUUtilization",
        namespace: "AWS/EC2",
        statistic: "Average",
        threshold: 80,
        comparisonOperator: "GreaterThanOrEqualToThreshold",
        actions: 1,
        actionTarget: "SNS: rebon-dev-alerts",
        period: "5 minutes",
      },
    ],
    log_groups: [
      { name: "/aws/ec2/freshbite-prod-api", retention: "14 days", metric_filters: 2, subscriptions: 0 },
      { name: "/aws/lambda/freshbite-ingest", retention: "7 days", metric_filters: 0, subscriptions: 1 },
    ],
    budgets: [
      {
        id: "budget-freshbite-monthly-prod",
        name: "freshbite-monthly-prod",
        period: "Monthly",
        budgeted: 2400,
        current: 1875.4,
        forecasted: 2510,
        alert_threshold: 80,
        threshold_type: "Forecasted",
        email: "finops@freshbite.example",
      },
      {
        id: "budget-freshbite-s3-monthly",
        name: "freshbite-s3-monthly",
        period: "Monthly",
        budgeted: 180,
        current: 92.1,
        forecasted: 110,
        alert_threshold: 90,
        threshold_type: "Actual",
        email: "finops@freshbite.example",
      },
    ],
    cost_rows: [
      {
        service: "EC2-Instances",
        this_month: 842.1,
        last_month: 791.4,
        region: "ap-south-1",
        tags: { Environment: "prod", Project: "freshbite-api" },
      },
      {
        service: "Amazon S3",
        this_month: 96.2,
        last_month: 88.0,
        region: "ap-south-1",
        tags: { Environment: "prod", Project: "freshbite-web" },
      },
      {
        service: "Amazon RDS",
        this_month: 410.0,
        last_month: 402.5,
        region: "ap-south-1",
        tags: { Environment: "prod", Project: "freshbite-api" },
      },
      {
        service: "AmazonCloudWatch",
        this_month: 38.4,
        last_month: 31.2,
        region: "ap-south-1",
        tags: { Environment: "staging", Project: "freshbite-api" },
      },
      {
        service: "VPC",
        this_month: 22.0,
        last_month: 22.0,
        region: "ap-south-1",
        tags: { Environment: "prod", Project: "freshbite-web" },
      },
      {
        service: "AWS Data Transfer",
        this_month: 64.8,
        last_month: 58.1,
        region: "ap-south-1",
        tags: { Environment: "prod", Project: "freshbite-web" },
      },
    ],
    cost_allocation_tags: [
      {
        key: "Environment",
        status: "Active",
        last_updated: "2025-11-02",
        source: "User-defined",
      },
      {
        key: "Project",
        status: "Active",
        last_updated: "2025-11-02",
        source: "User-defined",
      },
      {
        key: "aws:createdBy",
        status: "Inactive",
        last_updated: "—",
        source: "AWS-generated",
      },
    ],
    network_acls: [
      {
        id: "acl-0aa11bb22cc33dd01",
        name: "freshbite-prod-nacl",
        vpc: "vpc-0f1a2b3c4d5e6f789",
        is_default: true,
        associated_subnet_ids: [
          "subnet-0a11b22c33d44e55f",
          "subnet-0b22c33d44e55f66a",
        ],
        inbound: [
          {
            rule_number: 100,
            type: "All traffic",
            protocol: "All",
            port_range: "All",
            cidr: "0.0.0.0/0",
            action: "Allow",
          },
          {
            rule_number: "*",
            type: "All traffic",
            protocol: "All",
            port_range: "All",
            cidr: "0.0.0.0/0",
            action: "Deny",
          },
        ],
        outbound: [
          {
            rule_number: 100,
            type: "All traffic",
            protocol: "All",
            port_range: "All",
            cidr: "0.0.0.0/0",
            action: "Allow",
          },
          {
            rule_number: "*",
            type: "All traffic",
            protocol: "All",
            port_range: "All",
            cidr: "0.0.0.0/0",
            action: "Deny",
          },
        ],
      },
    ],
    identity_providers: [],
    target_groups: [
      {
        arn: "arn:aws:elasticloadbalancing:ap-south-1:847291635028:targetgroup/freshbite-prod-tg/50dc6c495c0c9188",
        name: "freshbite-prod-tg",
        target_type: "instance",
        protocol: "HTTP",
        port: 80,
        vpc: "vpc-0f1a2b3c4d5e6f789",
        health_check_path: "/health",
        targets: [
          { id: "i-0a8f31c2e91b44d17", port: 80, health: "healthy" },
          { id: "i-0c22ab91d7e10f882", port: 80, health: "healthy" },
        ],
        load_balancer_arns: [
          "arn:aws:elasticloadbalancing:ap-south-1:847291635028:loadbalancer/app/freshbite-prod-alb/50dc6c495c0c9188",
        ],
      },
    ],
    key_pairs: [
      {
        name: "freshbite-prod-bastion",
        fingerprint: "a1:b2:c3:d4:e5:f6:07:18:29:3a:4b:5c:6d:7e:8f:90",
        type: "rsa",
        created: "2024-06-12",
      },
      {
        name: "my-key-pair",
        fingerprint: "11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff:00",
        type: "rsa",
        created: "2025-01-08",
      },
    ],
    ...emptyNetworkingSlices(),
    elastic_ips: [
      {
        allocation_id: "eipalloc-0a1b2c3d4e5f67890",
        public_ip: "13.232.41.90",
        association_id: "eipassoc-0aabbccddeeff0011",
        instance_id: "i-0a8f31c2e91b44d17",
        private_ip: "10.0.1.24",
        network_interface_id: "eni-0aa11bb22cc33dd44",
        domain: "vpc",
        name: "freshbite-prod-api-eip",
      },
    ],
    network_interfaces: [
      {
        id: "eni-0aa11bb22cc33dd44",
        description: "Primary network interface",
        subnet_id: "subnet-0a11b22c33d44e55f",
        vpc_id: "vpc-0f1a2b3c4d5e6f789",
        status: "in-use",
        private_ip: "10.0.1.24",
        public_ip: "13.232.41.90",
        attachment_instance_id: "i-0a8f31c2e91b44d17",
        security_groups: ["sg-0aa11bb22cc33dd44"],
        type: "interface",
      },
    ],
    launch_templates: [
      {
        id: "lt-0freshbiteapi01",
        name: "freshbite-prod-api-lt",
        default_version: 1,
        latest_version: 1,
        created: "2024-08-01",
      },
    ],
    account_bpa: { ...bpaOn },
    nat_gateways: [
      {
        id: "nat-0a1b2c3d4e5f67890",
        name: "freshbite-prod-nat",
        subnet_id: "subnet-0a11b22c33d44e55f",
        vpc_id: "vpc-0f1a2b3c4d5e6f789",
        state: "available",
        connectivity: "public",
        created: "2024-08-01",
      },
    ],
    insight_logs: [
      {
        ts: "2026-08-18T03:11:02Z",
        msg: "ERROR upstream 5xx from target i-0a8f31c2e91b44d17",
        log_group: "/aws/ec2/freshbite-prod-api",
      },
      {
        ts: "2026-08-18T03:10:44Z",
        msg: "ERROR payment timeout merchant=4421",
        log_group: "/aws/ec2/freshbite-prod-api",
      },
      {
        ts: "2026-08-18T03:09:18Z",
        msg: "ERROR redis connection reset",
        log_group: "/aws/lambda/freshbite-ingest",
      },
      {
        ts: "2026-08-18T03:08:01Z",
        msg: "WARN retrying checkout session sess_9182",
        log_group: "/aws/ec2/freshbite-prod-api",
      },
    ],
  };
}

/**
 * Finova L1 desk. Company records the student must read or change.
 * Console opens in us-east-1 on purpose — Mumbai workloads are ap-south-1.
 * Alarms the student is asked to create are not pre-built.
 */
export function createFinovaDeskSeed(): AccountSnapshot {
  const base = createEmptyAccountSeed("847291635028", "finova-dev", "cloud-support");
  base.identity.region = "us-east-1";
  base.users = [
    {
      username: "rahul.dev",
      created: "2025-11-02",
      mfa: true,
      console_access: true,
      policies: ["AmazonS3ReadOnlyAccess"],
      groups: ["Developers"],
      last_activity: "Today",
      password_age: "40 days",
      access_keys: [],
      password: null,
    },
    {
      username: "kavya.analyst",
      created: "2026-09-27",
      mfa: false,
      console_access: true,
      policies: ["AnalystReadOnly"],
      groups: ["Analysts"],
      last_activity: "Never",
      password_age: "Never signed in",
      access_keys: [],
      password: null,
    },
    {
      username: "lea.analyst",
      created: "2025-06-12",
      mfa: true,
      console_access: true,
      policies: ["AnalystReadOnly"],
      groups: ["Analysts"],
      last_activity: "Yesterday",
      password_age: "20 days",
      access_keys: [
        { id: "AKIAIOSFODNN7LEA01", status: "Active", created: "2025-06-13" },
      ],
      password: null,
    },
    {
      username: "deploy.bot",
      created: "2025-04-01",
      mfa: false,
      console_access: false,
      policies: [],
      groups: [],
      last_activity: "3 days ago",
      password_age: "None",
      access_keys: [
        { id: "AKIAFINOVADEPLOY01", status: "Active", created: "2026-01-08" },
      ],
      password: null,
    },
  ];
  base.groups = [
    {
      name: "Developers",
      policies: ["AmazonS3ReadOnlyAccess"],
      members: ["rahul.dev"],
    },
    {
      name: "Analysts",
      policies: ["AnalystReadOnly"],
      members: ["kavya.analyst", "lea.analyst"],
    },
  ];
  base.roles = [
    {
      name: "finova-lambda-payments",
      trusted: "lambda.amazonaws.com",
      last_activity: "12 minutes ago",
      policies: ["AmazonDynamoDBReadOnlyAccess"],
      description: "Payments Lambda execution role. Do not paste user access keys into env vars.",
      max_session_duration: "1 hour",
    },
  ];
  base.policies = [
    ...base.policies,
    {
      name: "AnalystReadOnly",
      type: "Customer managed",
      attached: 2,
      created: "2025-06-01",
    },
    {
      name: "AmazonDynamoDBReadOnlyAccess",
      type: "AWS managed",
      attached: 1,
      created: "2015-02-06",
    },
  ];
  base.available_policies = [
    ...base.available_policies,
    "AnalystReadOnly",
    "AmazonDynamoDBReadOnlyAccess",
  ];
  base.instances = [
    {
      id: "i-0finovaapi000001",
      name: "payments-api-01",
      state: "running",
      type: "t3.medium",
      status_check: "ok",
      alarm_status: "In alarm",
      az: "ap-south-1a",
      region: "ap-south-1",
      public_ip: "13.232.18.44",
      public_dns: "ec2-13-232-18-44.ap-south-1.compute.amazonaws.com",
      private_ip: "10.10.1.21",
      security_groups: ["sg-0finovaapi"],
      vpc_id: "vpc-0finovapayments",
      subnet_id: "subnet-0finovapub1a",
      key_name: "finova-dev-bastion",
      platform: "Linux/UNIX",
    },
    {
      id: "i-0finovaworker0001",
      name: "payments-worker-01",
      state: "running",
      type: "t3.small",
      status_check: "ok",
      alarm_status: "No alarms",
      az: "ap-south-1b",
      region: "ap-south-1",
      public_ip: null,
      public_dns: null,
      private_ip: "10.10.2.14",
      security_groups: ["sg-0finovaapi"],
      vpc_id: "vpc-0finovapayments",
      subnet_id: "subnet-0finovapriv1b",
      key_name: "finova-dev-bastion",
      platform: "Linux/UNIX",
    },
  ];
  base.buckets = [
    bucket("finova-reports", {
      region: "ap-south-1",
      objects: 42,
      object_keys: ["daily/payments.csv", "daily/settlements.csv"],
    }),
  ];
  base.vpcs = [
    {
      id: "vpc-0finovapayments",
      name: "finova-payments-vpc",
      state: "available",
      cidr: "10.10.0.0/16",
      ipv6: null,
      dhcp: "dopt-0finova",
      main_route_table: "rtb-0finova",
      main_network_acl: "acl-0finova",
    },
  ];
  base.dashboards = [
    {
      name: "payments-api",
      lastModified: "September 27, 2026, 10:42:00 (UTC+05:30)",
      widgets: [
        {
          id: "cpu",
          type: "number",
          metricName: "CPUUtilization",
          title: "payments-api CPU · last 1h · peak 72% at 10:40",
          value: "72%",
          x: 0,
          y: 0,
          width: 4,
          height: 3,
        },
        {
          id: "flat",
          type: "text",
          title: "CPU graph looks flat",
          value: "Not broken. This view is a 5-minute window with one point. Widen the time range — the metric is still publishing.",
          x: 4,
          y: 0,
          width: 8,
          height: 3,
        },
      ],
    },
  ];
  base.alarms = [
    {
      id: "alarm-highcpu-payments",
      name: "HighCPU-payments",
      description: "payments-api CPU stayed high",
      state: "ALARM",
      condition: "CPUUtilization >= 80 for 5 minutes",
      metric: "CPUUtilization",
      namespace: "AWS/EC2",
      statistic: "Average",
      threshold: 80,
      comparisonOperator: "GreaterThanOrEqualToThreshold",
      actions: 1,
      actionTarget: "SNS: finova-ops-alerts",
      period: "5 minutes",
    },
    {
      id: "alarm-payments-gap",
      name: "payments-metric-gap",
      description: "No datapoints for 1 hour. The instance may have stopped publishing. This is not proof of an outage.",
      state: "INSUFFICIENT_DATA",
      condition: "CPUUtilization missing for 1 hour",
      metric: "CPUUtilization",
      namespace: "AWS/EC2",
      statistic: "Average",
      threshold: 80,
      comparisonOperator: "GreaterThanOrEqualToThreshold",
      actions: 0,
      period: "5 minutes",
    },
  ];
  base.log_groups = [
    {
      name: "/finova/payments",
      retention: "14 days",
      metric_filters: 1,
      subscriptions: 0,
    },
  ];
  const timeoutLine = (min: string, n: number) => ({
    ts: `2026-09-27T05:${min}:00Z`,
    msg: n % 2 === 0 ? "timeout payments-api upstream" : "ERROR timeout payments-api",
    log_group: "/finova/payments",
  });
  base.insight_logs = [
    timeoutLine("10", 1),
    { ts: "2026-09-27T05:12:00Z", msg: "ok 200 payments-api", log_group: "/finova/payments" },
    timeoutLine("14", 2),
    timeoutLine("18", 3),
    { ts: "2026-09-27T05:20:00Z", msg: "ok health", log_group: "/finova/payments" },
    timeoutLine("22", 4),
    timeoutLine("26", 5),
    timeoutLine("30", 6),
    { ts: "2026-09-27T05:33:00Z", msg: "ERROR HTTP 5xx payments-api spike", log_group: "/finova/payments" },
    timeoutLine("36", 7),
  ];
  return base;
}

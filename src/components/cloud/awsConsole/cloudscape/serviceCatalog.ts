/**
 * Full AWS Services mega-menu catalog.
 * Launched six map to live console routes; others open a real-style landing page.
 */
import type { ServiceId } from "./types";

export type CatalogEntry = {
  /** Stable slug (also used as catalog page id) */
  slug: string;
  name: string;
  blurb: string;
  category: string;
  color: string;
  aliases?: string[];
  /** When set, opens the live clone console for that service */
  launchId?: Exclude<ServiceId, "home" | "catalog">;
};

export const SERVICE_CATEGORIES = [
  "Favorites",
  "All services",
  "Recently visited",
  "Compute",
  "Containers",
  "Storage",
  "Database",
  "Networking & Content Delivery",
  "Security, Identity, & Compliance",
  "Management & Governance",
  "Cloud Financial Management",
  "Analytics",
  "Application Integration",
  "Developer Tools",
  "Machine Learning",
  "Front-end Web & Mobile",
] as const;

export const SERVICE_CATALOG: CatalogEntry[] = [
  // —— Launch six ——
  {
    slug: "iam",
    name: "IAM",
    blurb: "Manage users, groups, roles, and permissions",
    category: "Security, Identity, & Compliance",
    color: "#dd344c",
    aliases: ["identity", "users", "roles"],
    launchId: "iam",
  },
  {
    slug: "ec2",
    name: "EC2",
    blurb: "Virtual servers in the cloud",
    category: "Compute",
    color: "#ed7100",
    aliases: ["instances", "compute"],
    launchId: "ec2",
  },
  {
    slug: "s3",
    name: "S3",
    blurb: "Scalable object storage in the cloud",
    category: "Storage",
    color: "#3f8624",
    aliases: ["bucket", "buckets", "storage"],
    launchId: "s3",
  },
  {
    slug: "vpc",
    name: "VPC",
    blurb: "Isolated cloud resources",
    category: "Networking & Content Delivery",
    color: "#8c4fff",
    aliases: ["network", "networking", "subnet"],
    launchId: "vpc",
  },
  {
    slug: "cloudwatch",
    name: "CloudWatch",
    blurb: "Monitoring and observability",
    category: "Management & Governance",
    color: "#e7157b",
    aliases: ["cw", "alarms", "metrics", "logs"],
    launchId: "cloudwatch",
  },
  {
    slug: "billing",
    name: "Billing and Cost Management",
    blurb: "Bills, Cost Explorer, Budgets, and payment preferences",
    category: "Cloud Financial Management",
    color: "#ff9900",
    aliases: ["billing", "cost", "ce", "cost explorer", "budgets", "bills"],
    launchId: "billing",
  },
  // —— Compute ——
  {
    slug: "lambda",
    name: "Lambda",
    blurb: "Run code without thinking about servers",
    category: "Compute",
    color: "#ed7100",
    aliases: ["functions", "serverless"],
  },
  {
    slug: "lightsail",
    name: "Lightsail",
    blurb: "Easy-to-use cloud platform for VPS, containers, and databases",
    category: "Compute",
    color: "#ed7100",
  },
  {
    slug: "batch",
    name: "Batch",
    blurb: "Fully managed batch processing at any scale",
    category: "Compute",
    color: "#ed7100",
  },
  {
    slug: "elastic-beanstalk",
    name: "Elastic Beanstalk",
    blurb: "Run and manage web apps",
    category: "Compute",
    color: "#ed7100",
    aliases: ["beanstalk"],
  },
  // —— Containers ——
  {
    slug: "ecs",
    name: "Elastic Container Service",
    blurb: "Highly secure, reliable, and scalable container service",
    category: "Containers",
    color: "#ed7100",
    aliases: ["ecs", "containers"],
  },
  {
    slug: "eks",
    name: "Elastic Kubernetes Service",
    blurb: "The most trusted way to run Kubernetes",
    category: "Containers",
    color: "#ed7100",
    aliases: ["eks", "kubernetes", "k8s"],
  },
  {
    slug: "ecr",
    name: "Elastic Container Registry",
    blurb: "Easily store, share, and deploy container software",
    category: "Containers",
    color: "#ed7100",
    aliases: ["ecr", "registry"],
  },
  // —— Storage ——
  {
    slug: "ebs",
    name: "EBS",
    blurb: "Easy-to-use, high-performance block storage",
    category: "Storage",
    color: "#3f8624",
    aliases: ["volumes", "block"],
  },
  {
    slug: "efs",
    name: "EFS",
    blurb: "Simple, serverless, set-and-forget elastic file system",
    category: "Storage",
    color: "#3f8624",
  },
  {
    slug: "fsx",
    name: "FSx",
    blurb: "Launch and run feature-rich, high-performance file systems",
    category: "Storage",
    color: "#3f8624",
  },
  {
    slug: "glacier",
    name: "S3 Glacier",
    blurb: "Long-term, secure, durable object storage for archive",
    category: "Storage",
    color: "#3f8624",
    aliases: ["archive", "glacier"],
  },
  // —— Database ——
  {
    slug: "rds",
    name: "RDS",
    blurb: "Managed relational database service",
    category: "Database",
    color: "#3b48cc",
    aliases: ["mysql", "postgres", "aurora"],
  },
  {
    slug: "dynamodb",
    name: "DynamoDB",
    blurb: "Fast, flexible NoSQL database",
    category: "Database",
    color: "#3b48cc",
    aliases: ["dynamo", "nosql"],
  },
  {
    slug: "elasticache",
    name: "ElastiCache",
    blurb: "In-memory caching service",
    category: "Database",
    color: "#3b48cc",
    aliases: ["redis", "memcached"],
  },
  {
    slug: "redshift",
    name: "Redshift",
    blurb: "Fast, simple, cost-effective data warehousing",
    category: "Database",
    color: "#3b48cc",
  },
  {
    slug: "documentdb",
    name: "DocumentDB",
    blurb: "Fully managed MongoDB-compatible database",
    category: "Database",
    color: "#3b48cc",
  },
  // —— Networking ——
  {
    slug: "route53",
    name: "Route 53",
    blurb: "Scalable DNS and domain name registration",
    category: "Networking & Content Delivery",
    color: "#8c4fff",
    aliases: ["dns", "route 53"],
  },
  {
    slug: "cloudfront",
    name: "CloudFront",
    blurb: "Fast, highly secure CDN",
    category: "Networking & Content Delivery",
    color: "#8c4fff",
    aliases: ["cdn"],
  },
  {
    slug: "api-gateway",
    name: "API Gateway",
    blurb: "Create, maintain, and secure APIs at any scale",
    category: "Networking & Content Delivery",
    color: "#8c4fff",
    aliases: ["apigw", "api"],
  },
  {
    slug: "elb",
    name: "Elastic Load Balancing",
    blurb: "Distribute incoming traffic across targets",
    category: "Networking & Content Delivery",
    color: "#8c4fff",
    aliases: ["alb", "nlb", "load balancer"],
    launchId: "ec2",
  },
  // —— Security ——
  {
    slug: "kms",
    name: "KMS",
    blurb: "Create and control keys used to encrypt data",
    category: "Security, Identity, & Compliance",
    color: "#dd344c",
    aliases: ["encryption", "keys"],
  },
  {
    slug: "secrets-manager",
    name: "Secrets Manager",
    blurb: "Rotate, manage, and retrieve secrets",
    category: "Security, Identity, & Compliance",
    color: "#dd344c",
  },
  {
    slug: "guardduty",
    name: "GuardDuty",
    blurb: "Intelligent threat detection",
    category: "Security, Identity, & Compliance",
    color: "#dd344c",
  },
  {
    slug: "waf",
    name: "WAF",
    blurb: "Protect web applications from common exploits",
    category: "Security, Identity, & Compliance",
    color: "#dd344c",
  },
  {
    slug: "cognito",
    name: "Cognito",
    blurb: "Simple and secure user sign-up and sign-in",
    category: "Security, Identity, & Compliance",
    color: "#dd344c",
  },
  {
    slug: "organizations",
    name: "Organizations",
    blurb: "Centrally manage and govern your environment",
    category: "Security, Identity, & Compliance",
    color: "#dd344c",
    launchId: "iam",
  },
  // —— Management ——
  {
    slug: "cloudtrail",
    name: "CloudTrail",
    blurb: "Track user activity and API usage",
    category: "Management & Governance",
    color: "#e7157b",
  },
  {
    slug: "config",
    name: "Config",
    blurb: "Record and evaluate configurations of your resources",
    category: "Management & Governance",
    color: "#e7157b",
  },
  {
    slug: "systems-manager",
    name: "Systems Manager",
    blurb: "Gain operational insights and take action on AWS resources",
    category: "Management & Governance",
    color: "#e7157b",
    aliases: ["ssm"],
  },
  {
    slug: "trusted-advisor",
    name: "Trusted Advisor",
    blurb: "Optimize cost, performance, security, and fault tolerance",
    category: "Management & Governance",
    color: "#e7157b",
  },
  // —— Analytics ——
  {
    slug: "athena",
    name: "Athena",
    blurb: "Query data in S3 using SQL",
    category: "Analytics",
    color: "#8c4fff",
  },
  {
    slug: "emr",
    name: "EMR",
    blurb: "Easily run and scale Apache Spark, Hive, and more",
    category: "Analytics",
    color: "#8c4fff",
  },
  {
    slug: "kinesis",
    name: "Kinesis",
    blurb: "Collect, process, and analyze streaming data",
    category: "Analytics",
    color: "#8c4fff",
  },
  // —— Application Integration ——
  {
    slug: "sns",
    name: "SNS",
    blurb: "Fully managed pub/sub messaging",
    category: "Application Integration",
    color: "#ed7100",
    aliases: ["notifications"],
  },
  {
    slug: "sqs",
    name: "SQS",
    blurb: "Fully managed message queues",
    category: "Application Integration",
    color: "#ed7100",
    aliases: ["queue"],
  },
  {
    slug: "eventbridge",
    name: "EventBridge",
    blurb: "Serverless event bus for SaaS and AWS services",
    category: "Application Integration",
    color: "#ed7100",
    aliases: ["events", "bus"],
  },
  {
    slug: "step-functions",
    name: "Step Functions",
    blurb: "Visual workflows for distributed applications",
    category: "Application Integration",
    color: "#ed7100",
  },
  // —— Developer Tools ——
  {
    slug: "codecommit",
    name: "CodeCommit",
    blurb: "Securely host private Git repositories",
    category: "Developer Tools",
    color: "#3b48cc",
  },
  {
    slug: "codebuild",
    name: "CodeBuild",
    blurb: "Build and test code with continuous scaling",
    category: "Developer Tools",
    color: "#3b48cc",
  },
  {
    slug: "codedeploy",
    name: "CodeDeploy",
    blurb: "Automate code deployments",
    category: "Developer Tools",
    color: "#3b48cc",
  },
  {
    slug: "codepipeline",
    name: "CodePipeline",
    blurb: "Release software using continuous delivery",
    category: "Developer Tools",
    color: "#3b48cc",
  },
  // —— ML ——
  {
    slug: "sagemaker",
    name: "SageMaker",
    blurb: "Build, train, and deploy machine learning models",
    category: "Machine Learning",
    color: "#01a88d",
  },
  {
    slug: "bedrock",
    name: "Bedrock",
    blurb: "Build and scale generative AI applications",
    category: "Machine Learning",
    color: "#01a88d",
  },
  {
    slug: "rekognition",
    name: "Rekognition",
    blurb: "Automate image and video analysis with ML",
    category: "Machine Learning",
    color: "#01a88d",
  },
  // —— Front-end ——
  {
    slug: "amplify",
    name: "Amplify",
    blurb: "Build full-stack web and mobile apps",
    category: "Front-end Web & Mobile",
    color: "#ed7100",
  },
  {
    slug: "appsync",
    name: "AppSync",
    blurb: "Accelerate app development with scalable GraphQL APIs",
    category: "Front-end Web & Mobile",
    color: "#ed7100",
  },
];

/** Back-compat shape used by TopNav / search for the six launch services. */
export type LaunchedService = {
  id: Exclude<ServiceId, "home" | "catalog">;
  name: string;
  blurb: string;
  target: string;
  category: string;
  color: string;
  aliases?: string[];
};

export const SERVICES: LaunchedService[] = SERVICE_CATALOG.filter((c) => c.launchId).map(
  (c) => ({
    id: c.launchId!,
    name: c.name,
    blurb: c.blurb,
    target: `service-${c.launchId}`,
    category: c.category,
    color: c.color,
    aliases: c.aliases,
  })
);

export function findCatalogEntry(slugOrId: string): CatalogEntry | undefined {
  return SERVICE_CATALOG.find(
    (c) => c.slug === slugOrId || c.launchId === slugOrId || c.name.toLowerCase() === slugOrId.toLowerCase()
  );
}

export function catalogMatchesQuery(c: CatalogEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (c.slug.toLowerCase().includes(q)) return true;
  if (c.name.toLowerCase().includes(q)) return true;
  if (c.blurb.toLowerCase().includes(q)) return true;
  if (c.category.toLowerCase().includes(q)) return true;
  return (c.aliases || []).some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()));
}

export function serviceMatchesQuery(
  s: LaunchedService,
  query: string
): boolean {
  const entry = findCatalogEntry(s.id);
  if (entry) return catalogMatchesQuery(entry, query);
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    s.id.includes(q) ||
    s.name.toLowerCase().includes(q) ||
    s.blurb.toLowerCase().includes(q) ||
    s.category.toLowerCase().includes(q) ||
    (s.aliases || []).some((a) => a.toLowerCase().includes(q))
  );
}

export function emptyResourceNoun(slug: string): string {
  const map: Record<string, string> = {
    lambda: "functions",
    rds: "DB instances",
    dynamodb: "tables",
    ecs: "clusters",
    eks: "clusters",
    ecr: "repositories",
    sns: "topics",
    sqs: "queues",
    eventbridge: "event buses",
    kinesis: "data streams",
    sagemaker: "notebook instances",
    bedrock: "model access configurations",
    route53: "hosted zones",
    cloudfront: "distributions",
    "api-gateway": "APIs",
    kms: "customer managed keys",
    "secrets-manager": "secrets",
    cloudtrail: "trails",
    athena: "query results locations",
  };
  return map[slug] || "resources";
}

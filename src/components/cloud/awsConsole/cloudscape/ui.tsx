import type { ReactNode } from "react";

export {
  SERVICE_CATEGORIES,
  SERVICES,
  SERVICE_CATALOG,
  serviceMatchesQuery,
  catalogMatchesQuery,
  findCatalogEntry,
} from "./serviceCatalog";

/** Hit target for Ren's cursor. Avoid display:contents — getBoundingClientRect must work. */
export function Target({
  id,
  children,
  block,
}: {
  id: string;
  children: ReactNode;
  block?: boolean;
}) {
  return (
    <span
      data-console-target={id}
      style={{ display: block ? "block" : "inline-block" }}
    >
      {children}
    </span>
  );
}

export const WIZARD_I18N = {
  stepNumberLabel: (n: number) => `Step ${n}`,
  collapsedStepsLabel: (n: number, t: number) => `Step ${n} of ${t}`,
  navigationAriaLabel: "Steps",
  cancelButton: "Cancel",
  previousButton: "Previous",
  nextButton: "Next",
  optional: "optional",
  nextButtonLoadingAnnouncement: "Loading next step",
  submitButtonLoadingAnnouncement: "Submitting",
};

type ServiceIdLike = "iam" | "ec2" | "s3" | "vpc" | "cloudwatch" | "billing";

export const REGIONS: { id: string; label: string; group?: string }[] = [
  { id: "us-east-1", label: "US East (N. Virginia)", group: "US" },
  { id: "us-east-2", label: "US East (Ohio)", group: "US" },
  { id: "us-west-2", label: "US West (Oregon)", group: "US" },
  { id: "ap-south-1", label: "Asia Pacific (Mumbai)", group: "Asia Pacific" },
  { id: "ap-south-2", label: "Asia Pacific (Hyderabad)", group: "Asia Pacific" },
  { id: "ap-southeast-2", label: "Asia Pacific (Sydney)", group: "Asia Pacific" },
  { id: "eu-west-1", label: "Europe (Ireland)", group: "Europe" },
  { id: "eu-central-1", label: "Europe (Frankfurt)", group: "Europe" },
  { id: "eu-north-1", label: "Europe (Stockholm)", group: "Europe" },
];

export const SERVICE_FEATURES: { name: string; blurb: string; service: ServiceIdLike }[] = [
  { name: "EC2 Security Groups", blurb: "Virtual firewall for your instances", service: "ec2" },
  { name: "EC2 Launch Templates", blurb: "Reusable instance configuration", service: "ec2" },
  { name: "S3 Block Public Access", blurb: "Account and bucket public access settings", service: "s3" },
  { name: "CloudWatch Alarms", blurb: "Metric thresholds and notifications", service: "cloudwatch" },
  { name: "IAM Users", blurb: "Long-term credentials for people and apps", service: "iam" },
  { name: "VPC Subnets", blurb: "Segment your VPC address space", service: "vpc" },
  { name: "Bills", blurb: "View charges by service for the current period", service: "billing" },
  { name: "Cost Explorer", blurb: "Analyze your AWS costs and usage", service: "billing" },
];

export const SERVICE_DOCS: { name: string; blurb: string; service?: ServiceIdLike }[] = [
  {
    name: "Amazon EC2 User Guide for Linux Instances",
    blurb: "Documentation & Blogs",
    service: "ec2",
  },
  {
    name: "Amazon S3 User Guide",
    blurb: "Documentation & Blogs",
    service: "s3",
  },
  {
    name: "Amazon VPC User Guide",
    blurb: "Documentation & Blogs",
    service: "vpc",
  },
  {
    name: "Amazon CloudWatch User Guide",
    blurb: "Documentation & Blogs",
    service: "cloudwatch",
  },
  {
    name: "AWS Identity and Access Management User Guide",
    blurb: "Documentation & Blogs",
    service: "iam",
  },
  {
    name: "AWS Billing and Cost Management User Guide",
    blurb: "Documentation & Blogs",
    service: "billing",
  },
];

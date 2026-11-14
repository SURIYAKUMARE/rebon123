/**
 * Shell contract for Professional Mode ops + Building Basics workspaces.
 *
 * Backend is simulated. Surface must look like real AWS.
 * Initial launch environments: IAM, VPC, EC2, S3, CloudWatch, Billing/CE.
 */
export const OPS_SHELL_CONTRACT = {
  version: 2,
  steps: [
    "ticket",
    "account_id_gate",
    "aws_service_console",
    "execute_operation",
    "resolve_ticket",
  ] as const,
  environmentIds: {
    iam: "aws_iam_console",
    vpc: "aws_vpc_console",
    ec2: "aws_ec2_console",
    s3: "aws_s3_console",
    cloudwatch: "aws_cloudwatch_console",
    billing: "aws_billing_console",
  },
} as const;

export type OpsEnvironmentId =
  (typeof OPS_SHELL_CONTRACT.environmentIds)[keyof typeof OPS_SHELL_CONTRACT.environmentIds];

export function normalizeAccountId(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

export function formatAccountIdDisplay(id12: string): string {
  const d = normalizeAccountId(id12);
  if (d.length !== 12) return d;
  return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8, 12)}`;
}

export function accountIdsMatch(input: string, expected: string): boolean {
  return normalizeAccountId(input) === normalizeAccountId(expected);
}

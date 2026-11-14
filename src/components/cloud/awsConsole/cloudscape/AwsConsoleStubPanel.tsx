/**
 * Shared AWS-style empty / reserved panel for side-nav stubs.
 * Matches real Console empty-state tone — never says "lab" or "simulated".
 */
import Box from "@cloudscape-design/components/box";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import { useAccountStore } from "./store";
import type { ServiceId } from "./types";

type Props = {
  title: string;
  service: ServiceId;
  /** Related list page (Create / Back) */
  backPage: string;
  backLabel: string;
  /** Optional empty-state body override (AWS ops tone) */
  description?: string;
  /** Optional primary create action */
  createLabel?: string;
  onCreate?: () => void;
};

export function AwsConsoleStubPanel({
  title,
  service,
  backPage,
  backLabel,
  description,
  createLabel,
  onCreate,
}: Props) {
  const navigate = useAccountStore((s) => s.navigate);
  const region = useAccountStore((s) => s.identity.region);

  return (
    <Box padding="l" data-console-target="aws-stub-panel">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description={
            service === "iam" || service === "billing"
              ? "Global"
              : `Region · ${region}`
          }
          actions={
            createLabel && onCreate ? (
              <Button variant="primary" onClick={onCreate}>
                {createLabel}
              </Button>
            ) : undefined
          }
        >
          {title}
        </Header>
        <Box textAlign="center" color="inherit" padding={{ vertical: "xxxl" }}>
          <SpaceBetween size="s">
            <Box fontSize="heading-m" fontWeight="bold">
              You don&apos;t have any {title.toLowerCase()}
            </Box>
            <Box color="text-body-secondary">
              <div style={{ maxWidth: 480, marginInline: "auto" }}>
              {description ||
                `Get started by creating ${title.toLowerCase()} in this Region, or open ${backLabel} to continue working with related resources.`}
              </div>
            </Box>
            <SpaceBetween direction="horizontal" size="xs">
              {createLabel && onCreate ? (
                <Button variant="primary" onClick={onCreate}>
                  {createLabel}
                </Button>
              ) : null}
              <Button onClick={() => navigate(service, backPage)}>
                {backLabel}
              </Button>
            </SpaceBetween>
          </SpaceBetween>
        </Box>
      </SpaceBetween>
    </Box>
  );
}

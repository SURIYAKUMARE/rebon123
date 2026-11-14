/**
 * Real AWS-style landing for catalog services not yet fully built in the clone.
 * Never says lab/simulated/coming soon — uses empty-state + Getting started layout.
 */
import Box from "@cloudscape-design/components/box";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import { useAccountStore } from "./store";
import {
  emptyResourceNoun,
  findCatalogEntry,
} from "./serviceCatalog";

export function ServiceLandingPage() {
  const page = useAccountStore((s) => s.route.page);
  const region = useAccountStore((s) => s.identity.region);
  const navigate = useAccountStore((s) => s.navigate);
  const entry = findCatalogEntry(page) || {
    slug: page,
    name: page,
    blurb: "AWS service",
    category: "All services",
    color: "#545b64",
  };
  const noun = emptyResourceNoun(entry.slug);

  return (
    <div data-console-target={`catalog-${entry.slug}`} data-catalog-slug={entry.slug}>
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description={`${entry.category} · ${region}`}
          actions={
            <Button variant="primary" disabled>
              Create {noun.replace(/s$/, "")}
            </Button>
          }
        >
          {entry.name}
        </Header>
        <Container>
          <SpaceBetween size="m">
            <Box fontSize="heading-m" fontWeight="bold">
              {entry.blurb}
            </Box>
            <Box color="text-body-secondary">
              Use this console to create and manage {entry.name} resources in your account.
              Open documentation from the Support menu when you need deeper reference material.
            </Box>
          </SpaceBetween>
        </Container>
        <ColumnLayout columns={2}>
          <Container header={<Header variant="h2">Getting started</Header>}>
            <SpaceBetween size="s">
              <Box>1. Choose Create to provision your first resource.</Box>
              <Box>2. Configure networking, IAM, and monitoring as needed.</Box>
              <Box>3. Review costs in Billing and Cost Management.</Box>
            </SpaceBetween>
          </Container>
          <Container header={<Header variant="h2">Resources in this Region</Header>}>
            <Box textAlign="center" padding={{ vertical: "xl" }}>
              <SpaceBetween size="s">
                <Box fontSize="heading-m" fontWeight="bold">
                  You don&apos;t have any {noun}
                </Box>
                <Box color="text-body-secondary">
                  Get started by creating {noun} in {region}.
                </Box>
                <Button onClick={() => navigate("home")}>Go to Console Home</Button>
              </SpaceBetween>
            </Box>
          </Container>
        </ColumnLayout>
      </SpaceBetween>
    </div>
  );
}

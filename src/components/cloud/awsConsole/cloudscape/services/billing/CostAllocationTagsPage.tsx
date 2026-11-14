import { useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Tabs from "@cloudscape-design/components/tabs";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Alert from "@cloudscape-design/components/alert";
import { useAccountStore } from "../../store";

export function CostAllocationTagsPage() {
  const tags = useAccountStore((s) => s.cost_allocation_tags);
  const setCostAllocationTagStatus = useAccountStore(
    (s) => s.setCostAllocationTagStatus
  );
  const [selected, setSelected] = useState<typeof tags>([]);
  const userTags = tags.filter((t) => t.source === "User-defined");
  const awsTags = tags.filter((t) => t.source === "AWS-generated");

  const table = (items: typeof tags) => (
    <Table
      trackBy="key"
      selectionType="multi"
      selectedItems={selected.filter((s) => items.some((i) => i.key === s.key))}
      onSelectionChange={({ detail }) => {
        const other = selected.filter((s) => !items.some((i) => i.key === s.key));
        setSelected([...other, ...detail.selectedItems]);
      }}
      columnDefinitions={[
        { id: "key", header: "Tag key", cell: (t) => t.key },
        {
          id: "status",
          header: "Status",
          cell: (t) => (
            <StatusIndicator type={t.status === "Active" ? "success" : "stopped"}>
              {t.status}
            </StatusIndicator>
          ),
        },
        { id: "upd", header: "Last updated", cell: (t) => t.last_updated },
      ]}
      items={items}
      empty={<Box padding="l">No cost allocation tags.</Box>}
    />
  );

  return (
    <div data-console-target="billing-cost-allocation-tags">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description="Activate tags so they appear as filters and group-by dimensions in Cost Explorer."
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                disabled={!selected.length}
                onClick={() => {
                  for (const t of selected) setCostAllocationTagStatus(t.key, "Active");
                  setSelected([]);
                }}
              >
                Activate
              </Button>
              <Button
                disabled={!selected.length}
                onClick={() => {
                  for (const t of selected) setCostAllocationTagStatus(t.key, "Inactive");
                  setSelected([]);
                }}
              >
                Deactivate
              </Button>
            </SpaceBetween>
          }
        >
          Cost allocation tags
        </Header>
        <Alert type="info">
          After you activate a tag, it can take up to 24 hours for the tag to appear in Cost
          Explorer reports.
        </Alert>
        <Tabs
          tabs={[
            {
              id: "user",
              label: `User-defined cost allocation tags (${userTags.length})`,
              content: table(userTags),
            },
            {
              id: "aws",
              label: `AWS-generated cost allocation tags (${awsTags.length})`,
              content: table(awsTags),
            },
          ]}
        />
      </SpaceBetween>
    </div>
  );
}

import { useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import Tabs from "@cloudscape-design/components/tabs";
import Link from "@cloudscape-design/components/link";
import { useAccountStore } from "../../store";
import type { TargetGroup } from "../../types";

export function TargetGroupsPage() {
  const groups = useAccountStore((s) => s.target_groups);
  const navigate = useAccountStore((s) => s.navigate);
  const createTargetGroup = useAccountStore((s) => s.createTargetGroup);
  const vpcs = useAccountStore((s) => s.vpcs);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [port, setPort] = useState("80");
  const [vpc, setVpc] = useState(vpcs[0]?.id || "");
  const [selected, setSelected] = useState<TargetGroup[]>([]);

  return (
    <div data-console-target="ec2-target-groups" data-action-id="NAV:ec2-target-groups">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${groups.length})`}
          description="A target group routes requests to registered targets using the protocol and port you specify."
          actions={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Create target group
            </Button>
          }
        >
          Target Groups
        </Header>
        <Table
          trackBy="arn"
          selectionType="single"
          selectedItems={selected}
          onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
          columnDefinitions={[
            {
              id: "name",
              header: "Name",
              cell: (g) => (
                <Button
                  variant="inline-link"
                  onClick={() => navigate("ec2", "target-group-detail", g.arn)}
                >
                  {g.name}
                </Button>
              ),
            },
            { id: "arn", header: "ARN", cell: (g) => g.arn },
            { id: "proto", header: "Protocol : Port", cell: (g) => `${g.protocol}:${g.port}` },
            { id: "type", header: "Target type", cell: (g) => g.target_type },
            {
              id: "lbs",
              header: "Load balancer",
              cell: (g) =>
                g.load_balancer_arns.length
                  ? `${g.load_balancer_arns.length} load balancer(s)`
                  : "None",
            },
          ]}
          items={groups}
          empty={
            <Box textAlign="center" padding="l">
              You don&apos;t have any target groups.
            </Box>
          }
        />
      </SpaceBetween>

      <Modal
        visible={creating}
        onDismiss={() => setCreating(false)}
        header="Create target group"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setCreating(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!name.trim() || !vpc}
                onClick={() => {
                  createTargetGroup({
                    name: name.trim(),
                    protocol: "HTTP",
                    port: Number(port) || 80,
                    vpc,
                    target_type: "instance",
                  });
                  setCreating(false);
                  setName("");
                }}
              >
                Create target group
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Target type">
            <Box>Instances</Box>
          </FormField>
          <FormField label="Target group name">
            <Input value={name} onChange={({ detail }) => setName(detail.value)} />
          </FormField>
          <FormField label="Protocol : Port">
            <Input value={port} onChange={({ detail }) => setPort(detail.value)} />
          </FormField>
          <FormField label="VPC">
            <Select
              selectedOption={{ label: vpc, value: vpc }}
              options={vpcs.map((v) => ({ label: `${v.name} (${v.id})`, value: v.id }))}
              onChange={({ detail }) => setVpc(detail.selectedOption.value || vpc)}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </div>
  );
}

export function TargetGroupDetailPage() {
  const arn = useAccountStore((s) => s.route.selectedId);
  const group = useAccountStore((s) => s.target_groups.find((g) => g.arn === arn));
  const lbs = useAccountStore((s) => s.load_balancers);
  const navigate = useAccountStore((s) => s.navigate);

  if (!group) {
    return (
      <Box padding="l">
        <Header variant="h1">Target group</Header>
        <Button onClick={() => navigate("ec2", "target-groups")}>Target Groups</Button>
      </Box>
    );
  }

  const linkedLbs = lbs.filter((lb) =>
    (lb.target_group_arns || []).includes(group.arn)
  );

  return (
    <div data-console-target="ec2-target-group-detail">
      <SpaceBetween size="l">
        <Header variant="h1" description={group.arn}>
          {group.name}
        </Header>
        <Tabs
          tabs={[
            {
              id: "details",
              label: "Details",
              content: (
                <SpaceBetween size="s">
                  <Box>
                    Protocol : Port · {group.protocol}:{group.port}
                  </Box>
                  <Box>VPC · {group.vpc}</Box>
                  <Box>Health check path · {group.health_check_path}</Box>
                  <Box>
                    Load balancers ·{" "}
                    {linkedLbs.length
                      ? linkedLbs.map((lb) => (
                          <Button
                            key={lb.name}
                            variant="inline-link"
                            onClick={() => navigate("ec2", "load-balancers")}
                          >
                            {lb.name}
                          </Button>
                        ))
                      : "None"}
                  </Box>
                </SpaceBetween>
              ),
            },
            {
              id: "targets",
              label: "Targets",
              content: (
                <Table
                  trackBy={(t) => `${t.id}:${t.port}`}
                  columnDefinitions={[
                    { id: "id", header: "Instance ID", cell: (t) => t.id },
                    { id: "port", header: "Port", cell: (t) => t.port },
                    {
                      id: "health",
                      header: "Health status",
                      cell: (t) => (
                        <StatusIndicator
                          type={
                            t.health === "healthy"
                              ? "success"
                              : t.health === "initial"
                                ? "pending"
                                : t.health === "unused"
                                  ? "stopped"
                                  : "error"
                          }
                        >
                          {t.health}
                        </StatusIndicator>
                      ),
                    },
                  ]}
                  items={group.targets}
                  empty={
                    <Box padding="l" color="text-body-secondary">
                      No registered targets.{" "}
                      {!group.load_balancer_arns.length &&
                        "Target group is not configured to receive traffic from the load balancer."}
                    </Box>
                  }
                />
              ),
            },
            {
              id: "health",
              label: "Health checks",
              content: (
                <Box>
                  Protocol HTTP · Path {group.health_check_path} · Interval 30 seconds
                </Box>
              ),
            },
            {
              id: "tags",
              label: "Tags",
              content: <Box color="text-body-secondary">No tags associated with this resource.</Box>,
            },
          ]}
        />
        <Link onFollow={() => navigate("ec2", "target-groups")}>← Target Groups</Link>
      </SpaceBetween>
    </div>
  );
}

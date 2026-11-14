import { useMemo } from "react";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Tabs from "@cloudscape-design/components/tabs";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Container from "@cloudscape-design/components/container";
import { useAccountStore } from "../../store";
import type { Ec2Instance } from "../../types";

function stateIndicator(state: Ec2Instance["state"]) {
  if (state === "running")
    return <StatusIndicator type="success">Running</StatusIndicator>;
  if (state === "pending")
    return <StatusIndicator type="pending">Pending</StatusIndicator>;
  if (state === "stopping")
    return <StatusIndicator type="in-progress">Stopping</StatusIndicator>;
  if (state === "shutting-down")
    return <StatusIndicator type="in-progress">Shutting-down</StatusIndicator>;
  if (state === "stopped")
    return <StatusIndicator type="stopped">Stopped</StatusIndicator>;
  return <StatusIndicator type="stopped">Terminated</StatusIndicator>;
}

function publicDnsFor(i: Ec2Instance) {
  if (i.public_dns) return i.public_dns;
  if (!i.public_ip) return "—";
  return `ec2-${i.public_ip.replace(/\./g, "-")}.${i.region}.compute.amazonaws.com`;
}

export function InstanceDetailPage() {
  const id = useAccountStore((s) => s.route.selectedId);
  const instance = useAccountStore((s) => s.instances.find((i) => i.id === id));
  const navigate = useAccountStore((s) => s.navigate);
  const sgs = useAccountStore((s) => s.security_groups);
  const vpcs = useAccountStore((s) => s.vpcs);

  const sgNames = useMemo(() => {
    if (!instance?.security_groups?.length) return [];
    return instance.security_groups.map((sgId) => {
      const sg = sgs.find((g) => g.id === sgId);
      return sg ? `${sg.name} (${sg.id})` : sgId;
    });
  }, [instance, sgs]);

  const vpc = useMemo(
    () => vpcs.find((v) => v.id === instance?.vpc_id),
    [vpcs, instance?.vpc_id]
  );
  const vpcLabel = vpc
    ? `${vpc.name} (${vpc.id})`
    : instance?.vpc_id || "—";

  if (!instance) {
    return (
      <Box padding="l">
        <Header variant="h1">Instance</Header>
        <Box color="text-body-secondary" padding={{ bottom: "m" }}>
          Instance not found.
        </Box>
        <Button onClick={() => navigate("ec2", "instances")}>Instances</Button>
      </Box>
    );
  }

  return (
    <div data-console-target="ec2-instance-detail">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description={instance.id}
          actions={
            <Button onClick={() => navigate("ec2", "instances")}>
              Instances
            </Button>
          }
        >
          {instance.name || instance.id}
        </Header>
        <Tabs
          tabs={[
            {
              id: "details",
              label: "Details",
              content: (
                <Container>
                  <ColumnLayout columns={2} variant="text-grid">
                    <KeyValuePairs
                      columns={1}
                      items={[
                        { label: "Instance ID", value: instance.id },
                        { label: "Public IPv4 DNS", value: publicDnsFor(instance) },
                        {
                          label: "Instance state",
                          value: stateIndicator(instance.state),
                        },
                        { label: "Instance type", value: instance.type },
                        {
                          label: "Elastic IP addresses",
                          value: instance.public_ip || "—",
                        },
                        {
                          label: "Auto-assigned IP address",
                          value: instance.public_ip || "—",
                        },
                      ]}
                    />
                    <KeyValuePairs
                      columns={1}
                      items={[
                        {
                          label: "Status check",
                          value:
                            instance.status_check === "ok" ? (
                              <StatusIndicator type="success">
                                2/2 checks passed
                              </StatusIndicator>
                            ) : (
                              <StatusIndicator type="pending">Initializing</StatusIndicator>
                            ),
                        },
                        { label: "Alarm status", value: instance.alarm_status },
                        {
                          label: "Availability Zone",
                          value: instance.az,
                        },
                        {
                          label: "Security groups",
                          value: sgNames.join(", ") || "—",
                        },
                        {
                          label: "Key pair name",
                          value: instance.key_name || "—",
                        },
                        {
                          label: "Platform details",
                          value: instance.platform || "Linux/UNIX",
                        },
                      ]}
                    />
                  </ColumnLayout>
                </Container>
              ),
            },
            {
              id: "security",
              label: "Security",
              content: (
                <Container header={<Header variant="h2">Security groups</Header>}>
                  <KeyValuePairs
                    columns={1}
                    items={
                      sgNames.length
                        ? sgNames.map((label) => ({
                            label: "Security group",
                            value: (
                              <Button
                                variant="inline-link"
                                onClick={() => navigate("ec2", "security-groups")}
                              >
                                {label}
                              </Button>
                            ),
                          }))
                        : [{ label: "Security groups", value: "—" }]
                    }
                  />
                </Container>
              ),
            },
            {
              id: "networking",
              label: "Networking",
              content: (
                <Container>
                  <KeyValuePairs
                    columns={2}
                    items={[
                      { label: "VPC ID", value: vpcLabel || "—" },
                      { label: "Subnet ID", value: instance.subnet_id || "—" },
                      {
                        label: "Public IPv4 address",
                        value: instance.public_ip || "—",
                      },
                      {
                        label: "Private IPv4 addresses",
                        value: instance.private_ip,
                      },
                      {
                        label: "Public IPv4 DNS",
                        value: publicDnsFor(instance),
                      },
                      {
                        label: "Availability Zone",
                        value: instance.az,
                      },
                    ]}
                  />
                </Container>
              ),
            },
            {
              id: "monitoring",
              label: "Monitoring",
              content: (
                <Container
                  header={<Header variant="h2">CloudWatch monitoring</Header>}
                >
                  <SpaceBetween size="m">
                    <KeyValuePairs
                      columns={1}
                      items={[
                        {
                          label: "Alarm status",
                          value:
                            instance.alarm_status === "In alarm" ? (
                              <StatusIndicator type="error">In alarm</StatusIndicator>
                            ) : (
                              <StatusIndicator type="success">
                                {instance.alarm_status}
                              </StatusIndicator>
                            ),
                        },
                      ]}
                    />
                    <Button onClick={() => navigate("cloudwatch", "alarms")}>
                      View CloudWatch alarms
                    </Button>
                    <Button onClick={() => navigate("cloudwatch", "metrics-all")}>
                      View all metrics
                    </Button>
                  </SpaceBetween>
                </Container>
              ),
            },
            {
              id: "storage",
              label: "Storage",
              content: (
                <Container header={<Header variant="h2">Block devices</Header>}>
                  <KeyValuePairs
                    columns={1}
                    items={[
                      {
                        label: "Root device name",
                        value: "/dev/xvda",
                      },
                      {
                        label: "Root device type",
                        value: "EBS",
                      },
                      {
                        label: "Volume size",
                        value: "30 GiB",
                      },
                    ]}
                  />
                </Container>
              ),
            },
          ]}
        />
      </SpaceBetween>
    </div>
  );
}

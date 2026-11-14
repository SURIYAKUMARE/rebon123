import { useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Box from "@cloudscape-design/components/box";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import { useAccountStore } from "../../store";

export function ElasticIpsPage() {
  const items = useAccountStore((s) => s.elastic_ips);
  const allocateElasticIp = useAccountStore((s) => s.allocateElasticIp);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  return (
    <div data-console-target="ec2-elastic-ips">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${items.length})`}
          description="An Elastic IP address is a static IPv4 address designed for dynamic cloud computing."
          actions={
            <Button
              variant="primary"
              onClick={() => setCreating(true)}
              data-console-target="btn-allocate-eip"
            >
              Allocate Elastic IP address
            </Button>
          }
        >
          Elastic IP addresses
        </Header>
        <Table
          trackBy="allocation_id"
          columnDefinitions={[
            { id: "name", header: "Name", cell: (r) => r.name || "—" },
            { id: "ip", header: "Allocated IPv4 address", cell: (r) => r.public_ip },
            { id: "alloc", header: "Allocation ID", cell: (r) => r.allocation_id },
            {
              id: "assoc",
              header: "Association ID",
              cell: (r) => r.association_id || "—",
            },
            {
              id: "inst",
              header: "Instance ID",
              cell: (r) => r.instance_id || "—",
            },
            {
              id: "priv",
              header: "Private IP address",
              cell: (r) => r.private_ip || "—",
            },
            { id: "domain", header: "Scope", cell: (r) => r.domain },
          ]}
          items={items}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              You don&apos;t have any Elastic IP addresses in this Region.
            </Box>
          }
        />
      </SpaceBetween>
      <Modal
        visible={creating}
        onDismiss={() => !busy && setCreating(false)}
        header="Allocate Elastic IP address"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled={busy} onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await allocateElasticIp({ name });
                    setCreating(false);
                    setName("");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Allocate
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Name tag — optional">
          <Input value={name} onChange={({ detail }) => setName(detail.value)} />
        </FormField>
      </Modal>
    </div>
  );
}

export function NetworkInterfacesPage() {
  const items = useAccountStore((s) => s.network_interfaces);
  const subnets = useAccountStore((s) => s.subnets);
  const createNetworkInterface = useAccountStore((s) => s.createNetworkInterface);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("");
  const [subnetId, setSubnetId] = useState(subnets[0]?.id || "");

  return (
    <div data-console-target="ec2-network-interfaces">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${items.length})`}
          description="An elastic network interface is a logical networking component in a VPC that represents a virtual network card."
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setSubnetId(subnets[0]?.id || "");
                setCreating(true);
              }}
            >
              Create network interface
            </Button>
          }
        >
          Network interfaces
        </Header>
        <Table
          trackBy="id"
          columnDefinitions={[
            { id: "id", header: "Network interface ID", cell: (r) => r.id },
            {
              id: "desc",
              header: "Description",
              cell: (r) => r.description || "—",
            },
            {
              id: "status",
              header: "Status",
              cell: (r) => (
                <StatusIndicator
                  type={r.status === "in-use" ? "success" : "stopped"}
                >
                  {r.status}
                </StatusIndicator>
              ),
            },
            { id: "subnet", header: "Subnet ID", cell: (r) => r.subnet_id },
            { id: "vpc", header: "VPC ID", cell: (r) => r.vpc_id },
            { id: "priv", header: "Primary private IPv4", cell: (r) => r.private_ip },
            {
              id: "pub",
              header: "Public IPv4",
              cell: (r) => r.public_ip || "—",
            },
            {
              id: "att",
              header: "Instance ID",
              cell: (r) => r.attachment_instance_id || "—",
            },
          ]}
          items={items}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              You don&apos;t have any network interfaces.
            </Box>
          }
        />
      </SpaceBetween>
      <Modal
        visible={creating}
        onDismiss={() => !busy && setCreating(false)}
        header="Create network interface"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled={busy} onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                disabled={!subnetId}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await createNetworkInterface({
                      description,
                      subnet_id: subnetId,
                    });
                    setCreating(false);
                    setDescription("");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Create
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Description — optional">
            <Input
              value={description}
              onChange={({ detail }) => setDescription(detail.value)}
            />
          </FormField>
          <FormField label="Subnet">
            <Select
              selectedOption={
                subnetId
                  ? {
                      label:
                        subnets.find((s) => s.id === subnetId)?.name || subnetId,
                      value: subnetId,
                    }
                  : null
              }
              options={subnets.map((s) => ({
                label: `${s.name} (${s.id})`,
                value: s.id,
              }))}
              onChange={({ detail }) =>
                setSubnetId(detail.selectedOption.value || subnetId)
              }
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </div>
  );
}

export function LaunchTemplatesPage() {
  const items = useAccountStore((s) => s.launch_templates);
  const createLaunchTemplate = useAccountStore((s) => s.createLaunchTemplate);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  return (
    <div data-console-target="ec2-launch-templates">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${items.length})`}
          description="A launch template contains the configuration information to launch an instance."
          actions={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Create launch template
            </Button>
          }
        >
          Launch templates
        </Header>
        <Table
          trackBy="id"
          columnDefinitions={[
            { id: "name", header: "Launch template name", cell: (r) => r.name },
            { id: "id", header: "Launch template ID", cell: (r) => r.id },
            {
              id: "def",
              header: "Default version",
              cell: (r) => String(r.default_version),
            },
            {
              id: "latest",
              header: "Latest version",
              cell: (r) => String(r.latest_version),
            },
            { id: "created", header: "Created", cell: (r) => r.created },
          ]}
          items={items}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              You don&apos;t have any launch templates.
            </Box>
          }
        />
      </SpaceBetween>
      <Modal
        visible={creating}
        onDismiss={() => !busy && setCreating(false)}
        header="Create launch template"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled={busy} onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                disabled={!name.trim()}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await createLaunchTemplate({ name });
                    setCreating(false);
                    setName("");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Create launch template
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Launch template name">
          <Input value={name} onChange={({ detail }) => setName(detail.value)} />
        </FormField>
      </Modal>
    </div>
  );
}

export function PlacementGroupsPage() {
  const items = useAccountStore((s) => s.placement_groups);
  const createPlacementGroup = useAccountStore((s) => s.createPlacementGroup);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState<"cluster" | "spread" | "partition">(
    "cluster"
  );

  return (
    <div data-console-target="ec2-placement-groups">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${items.length})`}
          description="A placement group is a logical grouping of instances within a single Availability Zone."
          actions={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Create placement group
            </Button>
          }
        >
          Placement groups
        </Header>
        <Table
          trackBy="id"
          columnDefinitions={[
            { id: "name", header: "Name", cell: (r) => r.name },
            { id: "id", header: "Group ID", cell: (r) => r.id },
            { id: "strategy", header: "Strategy", cell: (r) => r.strategy },
            {
              id: "state",
              header: "State",
              cell: (r) => (
                <StatusIndicator type="success">{r.state}</StatusIndicator>
              ),
            },
          ]}
          items={items}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              You don&apos;t have any placement groups.
            </Box>
          }
        />
      </SpaceBetween>
      <Modal
        visible={creating}
        onDismiss={() => !busy && setCreating(false)}
        header="Create placement group"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled={busy} onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                disabled={!name.trim()}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await createPlacementGroup({ name, strategy });
                    setCreating(false);
                    setName("");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Create group
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Name">
            <Input value={name} onChange={({ detail }) => setName(detail.value)} />
          </FormField>
          <FormField label="Placement strategy">
            <Select
              selectedOption={{ label: strategy, value: strategy }}
              options={[
                { label: "Cluster", value: "cluster" },
                { label: "Spread", value: "spread" },
                { label: "Partition", value: "partition" },
              ]}
              onChange={({ detail }) =>
                setStrategy(
                  (detail.selectedOption.value as typeof strategy) || "cluster"
                )
              }
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </div>
  );
}

export function SpotRequestsPage() {
  const items = useAccountStore((s) => s.spot_requests);
  const requestSpotInstances = useAccountStore((s) => s.requestSpotInstances);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [instanceType, setInstanceType] = useState("t3.micro");

  return (
    <div data-console-target="ec2-spot-requests">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${items.length})`}
          description="Request Spot Instances to take advantage of unused EC2 capacity at steep discounts."
          actions={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Request Spot Instances
            </Button>
          }
        >
          Spot Requests
        </Header>
        <Table
          trackBy="id"
          columnDefinitions={[
            { id: "id", header: "Request ID", cell: (r) => r.id },
            {
              id: "state",
              header: "State",
              cell: (r) => (
                <StatusIndicator
                  type={r.state === "active" ? "success" : "pending"}
                >
                  {r.state}
                </StatusIndicator>
              ),
            },
            { id: "type", header: "Instance type", cell: (r) => r.instance_type },
            { id: "price", header: "Max price", cell: (r) => r.spot_price },
            { id: "created", header: "Created", cell: (r) => r.created },
          ]}
          items={items}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              You don&apos;t have any Spot Instance requests.
            </Box>
          }
        />
      </SpaceBetween>
      <Modal
        visible={creating}
        onDismiss={() => !busy && setCreating(false)}
        header="Request Spot Instances"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled={busy} onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await requestSpotInstances({ instance_type: instanceType });
                    setCreating(false);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Submit
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Instance type">
          <Input
            value={instanceType}
            onChange={({ detail }) => setInstanceType(detail.value)}
          />
        </FormField>
      </Modal>
    </div>
  );
}

export function ReservedInstancesPage() {
  const items = useAccountStore((s) => s.reserved_instances);
  const purchaseReservedInstances = useAccountStore(
    (s) => s.purchaseReservedInstances
  );
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [instanceType, setInstanceType] = useState("t3.micro");

  return (
    <div data-console-target="ec2-reserved-instances">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${items.length})`}
          description="Reserved Instances provide a significant discount compared to On-Demand Instance pricing."
          actions={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Purchase Reserved Instances
            </Button>
          }
        >
          Reserved Instances
        </Header>
        <Table
          trackBy="id"
          columnDefinitions={[
            { id: "id", header: "Reserved Instance ID", cell: (r) => r.id },
            { id: "type", header: "Instance type", cell: (r) => r.instance_type },
            {
              id: "state",
              header: "State",
              cell: (r) => (
                <StatusIndicator type="success">{r.state}</StatusIndicator>
              ),
            },
            { id: "scope", header: "Scope", cell: (r) => r.scope },
            {
              id: "class",
              header: "Offering class",
              cell: (r) => r.offering_class,
            },
            { id: "end", header: "End date", cell: (r) => r.end },
          ]}
          items={items}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              You don&apos;t have any Reserved Instances.
            </Box>
          }
        />
      </SpaceBetween>
      <Modal
        visible={creating}
        onDismiss={() => !busy && setCreating(false)}
        header="Purchase Reserved Instances"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled={busy} onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await purchaseReservedInstances({
                      instance_type: instanceType,
                    });
                    setCreating(false);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Purchase
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Instance type">
          <Input
            value={instanceType}
            onChange={({ detail }) => setInstanceType(detail.value)}
          />
        </FormField>
      </Modal>
    </div>
  );
}

export function LaunchConfigurationsPage() {
  const items = useAccountStore((s) => s.launch_configurations);
  const createLaunchConfiguration = useAccountStore(
    (s) => s.createLaunchConfiguration
  );
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  return (
    <div data-console-target="ec2-launch-configurations">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${items.length})`}
          description="A launch configuration is an instance configuration template that an Auto Scaling group uses to launch EC2 instances."
          actions={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Create launch configuration
            </Button>
          }
        >
          Launch configurations
        </Header>
        <Table
          trackBy="name"
          columnDefinitions={[
            { id: "name", header: "Name", cell: (r) => r.name },
            { id: "ami", header: "AMI ID", cell: (r) => r.image_id },
            { id: "type", header: "Instance type", cell: (r) => r.instance_type },
            { id: "created", header: "Created", cell: (r) => r.created },
          ]}
          items={items}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              You don&apos;t have any launch configurations.
            </Box>
          }
        />
      </SpaceBetween>
      <Modal
        visible={creating}
        onDismiss={() => !busy && setCreating(false)}
        header="Create launch configuration"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled={busy} onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                disabled={!name.trim()}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await createLaunchConfiguration({ name });
                    setCreating(false);
                    setName("");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Create launch configuration
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Name">
          <Input value={name} onChange={({ detail }) => setName(detail.value)} />
        </FormField>
      </Modal>
    </div>
  );
}

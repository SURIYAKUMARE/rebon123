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
import { useAccountStore } from "../../store";
import type { AccountSnapshot, VpcNamedResource } from "../../types";

type VpcSlice =
  | "vpc_endpoints"
  | "endpoint_services"
  | "peering_connections"
  | "customer_gateways"
  | "virtual_private_gateways"
  | "vpn_connections"
  | "prefix_lists"
  | "egress_igws"
  | "carrier_gateways"
  | "dhcp_option_sets";

type PageConfig = {
  slice: VpcSlice;
  title: string;
  description: string;
  createLabel: string;
  empty: string;
  idHeader: string;
};

const PAGE_CONFIG: Record<string, PageConfig> = {
  endpoints: {
    slice: "vpc_endpoints",
    title: "Endpoints",
    description:
      "VPC endpoints let you privately connect your VPC to supported AWS services without an internet gateway.",
    createLabel: "Create endpoint",
    empty: "You don't have any VPC endpoints.",
    idHeader: "Endpoint ID",
  },
  "endpoint-services": {
    slice: "endpoint_services",
    title: "Endpoint services",
    description:
      "Endpoint services allow you to offer a private connection from other VPCs to your service.",
    createLabel: "Create endpoint service",
    empty: "You don't have any endpoint services.",
    idHeader: "Service ID",
  },
  "peering-connections": {
    slice: "peering_connections",
    title: "Peering connections",
    description:
      "A VPC peering connection is a networking connection between two VPCs that enables you to route traffic between them.",
    createLabel: "Create peering connection",
    empty: "You don't have any VPC peering connections.",
    idHeader: "Peering connection ID",
  },
  "customer-gateways": {
    slice: "customer_gateways",
    title: "Customer gateways",
    description:
      "A customer gateway is a resource that you create in AWS that represents the customer gateway device in your on-premises network.",
    createLabel: "Create customer gateway",
    empty: "You don't have any customer gateways.",
    idHeader: "Customer gateway ID",
  },
  "virtual-private-gateways": {
    slice: "virtual_private_gateways",
    title: "Virtual private gateways",
    description:
      "A virtual private gateway is the VPN concentrator on the Amazon side of the Site-to-Site VPN connection.",
    createLabel: "Create virtual private gateway",
    empty: "You don't have any virtual private gateways.",
    idHeader: "Virtual private gateway ID",
  },
  "vpn-connections": {
    slice: "vpn_connections",
    title: "Site-to-Site VPN connections",
    description:
      "A Site-to-Site VPN connection connects your VPC to your on-premises network.",
    createLabel: "Create VPN connection",
    empty: "You don't have any Site-to-Site VPN connections.",
    idHeader: "VPN ID",
  },
  "prefix-lists": {
    slice: "prefix_lists",
    title: "Managed prefix lists",
    description:
      "A managed prefix list is a set of one or more CIDR blocks that you can reference in security group rules and route tables.",
    createLabel: "Create prefix list",
    empty: "You don't have any managed prefix lists.",
    idHeader: "Prefix list ID",
  },
  "egress-igws": {
    slice: "egress_igws",
    title: "Egress-only internet gateways",
    description:
      "An egress-only internet gateway is a horizontally scaled, redundant, and highly available VPC component that allows outbound communication over IPv6.",
    createLabel: "Create egress-only internet gateway",
    empty: "You don't have any egress-only internet gateways.",
    idHeader: "Egress-only internet gateway ID",
  },
  "carrier-gateways": {
    slice: "carrier_gateways",
    title: "Carrier gateways",
    description:
      "A carrier gateway allows connectivity between your VPC and carrier networks.",
    createLabel: "Create carrier gateway",
    empty: "You don't have any carrier gateways.",
    idHeader: "Carrier gateway ID",
  },
  "dhcp-options": {
    slice: "dhcp_option_sets",
    title: "DHCP option sets",
    description:
      "DHCP option sets control DNS servers, domain names, and other network configuration for instances in a VPC.",
    createLabel: "Create DHCP option set",
    empty: "You don't have any DHCP option sets.",
    idHeader: "DHCP options set ID",
  },
};

function VpcNamedResourcePage({ page }: { page: string }) {
  const config = PAGE_CONFIG[page];
  const items = useAccountStore(
    (s) => (config ? (s[config.slice] as VpcNamedResource[]) : [])
  );
  const createVpcNamedResource = useAccountStore((s) => s.createVpcNamedResource);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  if (!config) return null;

  return (
    <div data-console-target={`vpc-${page}`}>
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${items.length})`}
          description={config.description}
          actions={
            <Button variant="primary" onClick={() => setCreating(true)}>
              {config.createLabel}
            </Button>
          }
        >
          {config.title}
        </Header>
        <Table
          trackBy="id"
          columnDefinitions={[
            { id: "name", header: "Name", cell: (r) => r.name || "—" },
            { id: "id", header: config.idHeader, cell: (r) => r.id },
            {
              id: "state",
              header: "State",
              cell: (r) => (
                <StatusIndicator type="success">{r.state}</StatusIndicator>
              ),
            },
            {
              id: "vpc",
              header: "VPC",
              cell: (r) => r.vpc_id || "—",
            },
            { id: "created", header: "Created", cell: (r) => r.created },
          ]}
          items={items}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              {config.empty}
            </Box>
          }
        />
      </SpaceBetween>
      <Modal
        visible={creating}
        onDismiss={() => !busy && setCreating(false)}
        header={config.createLabel}
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
                    await createVpcNamedResource(config.slice, { name });
                    setCreating(false);
                    setName("");
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
        <FormField label="Name tag">
          <Input value={name} onChange={({ detail }) => setName(detail.value)} />
        </FormField>
      </Modal>
    </div>
  );
}

function VpcElasticIpsPage() {
  const items = useAccountStore((s) => s.elastic_ips);
  const allocateElasticIp = useAccountStore((s) => s.allocateElasticIp);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  return (
    <div data-console-target="vpc-elastic-ips">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${items.length})`}
          description={PAGE_CONFIG["elastic-ips"].description}
          actions={
            <Button variant="primary" onClick={() => setCreating(true)}>
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
            {
              id: "alloc",
              header: "Allocation ID",
              cell: (r) => r.allocation_id,
            },
            {
              id: "assoc",
              header: "Association ID",
              cell: (r) => r.association_id || "—",
            },
          ]}
          items={items}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              {PAGE_CONFIG["elastic-ips"].empty}
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

/** RAM / IPAM remain informational empty tables with Create disabled or flash. */
function InformationalTablePage({
  title,
  description,
  createLabel,
  empty,
}: {
  title: string;
  description: string;
  createLabel: string;
  empty: string;
}) {
  const setFlash = useAccountStore((s) => s.setFlash);
  return (
    <div>
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter="(0)"
          description={description}
          actions={
            <Button
              variant="primary"
              onClick={() =>
                setFlash({
                  type: "info",
                  content: `${createLabel} is available from the AWS console when this service is enabled for your account.`,
                })
              }
            >
              {createLabel}
            </Button>
          }
        >
          {title}
        </Header>
        <Table
          columnDefinitions={[
            { id: "name", header: "Name", cell: () => "—" },
            { id: "id", header: "ID", cell: () => "—" },
          ]}
          items={[] as AccountSnapshot["vpcs"]}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              {empty}
            </Box>
          }
        />
      </SpaceBetween>
    </div>
  );
}

export function VpcSecondaryPage({ page }: { page: string }) {
  if (page === "elastic-ips") return <VpcElasticIpsPage />;
  if (page === "ram") {
    return (
      <InformationalTablePage
        title="Resource Access Manager"
        description="Share your AWS resources with any AWS account or within your organization."
        createLabel="Create resource share"
        empty="You don't have any resource shares."
      />
    );
  }
  if (page === "ipam") {
    return (
      <InformationalTablePage
        title="IPAM"
        description="Amazon VPC IP Address Manager (IPAM) is a VPC feature that makes it easier to plan, track, and monitor IP addresses."
        createLabel="Create IPAM"
        empty="You don't have any IPAMs."
      />
    );
  }
  if (PAGE_CONFIG[page] && page !== "elastic-ips") {
    return <VpcNamedResourcePage page={page} />;
  }
  return null;
}

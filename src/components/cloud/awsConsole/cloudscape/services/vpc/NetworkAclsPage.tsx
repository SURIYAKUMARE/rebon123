import { useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Tabs from "@cloudscape-design/components/tabs";
import Button from "@cloudscape-design/components/button";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import { useAccountStore } from "../../store";
import type { NaclRule, NetworkAcl } from "../../types";

function sortRules(rules: NetworkAcl["inbound"]) {
  return [...rules].sort((a, b) => {
    if (a.rule_number === "*") return 1;
    if (b.rule_number === "*") return -1;
    return Number(a.rule_number) - Number(b.rule_number);
  });
}

export function NetworkAclsPage() {
  const acls = useAccountStore((s) => s.network_acls);
  const navigate = useAccountStore((s) => s.navigate);
  const [selected, setSelected] = useState<NetworkAcl[]>([]);

  return (
    <div data-console-target="vpc-network-acls" data-action-id="NAV:vpc-network-acls">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${acls.length})`}
          description="A network ACL allows or denies specific inbound or outbound traffic at the subnet level."
        >
          Network ACLs
        </Header>
        <Table
          trackBy="id"
          selectionType="single"
          selectedItems={selected}
          onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
          columnDefinitions={[
            {
              id: "name",
              header: "Name",
              cell: (a) => (
                <Button
                  variant="inline-link"
                  onClick={() => navigate("vpc", "nacl-detail", a.id)}
                >
                  {a.name || "—"}
                </Button>
              ),
            },
            {
              id: "id",
              header: "Network ACL ID",
              cell: (a) => (
                <Button
                  variant="inline-link"
                  onClick={() => navigate("vpc", "nacl-detail", a.id)}
                >
                  {a.id}
                </Button>
              ),
            },
            {
              id: "assoc",
              header: "Associated with",
              cell: (a) => `${a.associated_subnet_ids.length} Subnets`,
            },
            {
              id: "def",
              header: "Default",
              cell: (a) => (a.is_default ? "Yes" : "No"),
            },
            { id: "vpc", header: "VPC", cell: (a) => a.vpc },
            {
              id: "in",
              header: "Inbound rules",
              cell: (a) => a.inbound.length,
            },
            {
              id: "out",
              header: "Outbound rules",
              cell: (a) => a.outbound.length,
            },
          ]}
          items={acls}
          empty={
            <Box textAlign="center" padding="l">
              You don&apos;t have any network ACLs.
            </Box>
          }
        />
      </SpaceBetween>
    </div>
  );
}

export function NetworkAclDetailPage() {
  const id = useAccountStore((s) => s.route.selectedId);
  const acl = useAccountStore((s) => s.network_acls.find((a) => a.id === id));
  const navigate = useAccountStore((s) => s.navigate);
  const updateNetworkAclRules = useAccountStore((s) => s.updateNetworkAclRules);
  const [editing, setEditing] = useState(false);
  const [draftRules, setDraftRules] = useState<NaclRule[]>([]);
  const [newRule, setNewRule] = useState({
    rule_number: "100",
    type: "Custom TCP",
    protocol: "TCP (6)",
    port_range: "80",
    cidr: "0.0.0.0/0",
    action: "Allow" as "Allow" | "Deny",
  });

  if (!acl) {
    return (
      <Box padding="l">
        <Header variant="h1">Network ACL</Header>
        <Box color="text-body-secondary">Network ACL not found.</Box>
        <Button onClick={() => navigate("vpc", "network-acls")}>Network ACLs</Button>
      </Box>
    );
  }

  const ruleCols = [
    {
      id: "n",
      header: "Rule number",
      cell: (r: NetworkAcl["inbound"][0]) => String(r.rule_number),
    },
    { id: "t", header: "Type", cell: (r: NetworkAcl["inbound"][0]) => r.type },
    {
      id: "p",
      header: "Protocol",
      cell: (r: NetworkAcl["inbound"][0]) => r.protocol,
    },
    {
      id: "port",
      header: "Port range",
      cell: (r: NetworkAcl["inbound"][0]) => r.port_range,
    },
    { id: "cidr", header: "Source", cell: (r: NetworkAcl["inbound"][0]) => r.cidr },
    {
      id: "act",
      header: "Allow/Deny",
      cell: (r: NetworkAcl["inbound"][0]) => (
        <StatusIndicator type={r.action === "Allow" ? "success" : "error"}>
          {r.action}
        </StatusIndicator>
      ),
    },
  ];

  const openEdit = () => {
    setDraftRules(
      sortRules(acl.inbound).filter((r) => r.rule_number !== "*")
    );
    setEditing(true);
  };

  const saveEdit = () => {
    const withStar: NaclRule[] = [
      ...draftRules,
      {
        rule_number: "*",
        type: "All traffic",
        protocol: "All",
        port_range: "All",
        cidr: "0.0.0.0/0",
        action: "Deny",
      },
    ];
    updateNetworkAclRules(acl.id, "inbound", withStar);
    setEditing(false);
  };

  return (
    <div data-console-target="vpc-nacl-detail">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description={acl.id}
          actions={
            <Button onClick={openEdit}>Edit inbound rules</Button>
          }
        >
          {acl.name || acl.id}
        </Header>
        <Tabs
          tabs={[
            {
              id: "details",
              label: "Details",
              content: (
                <SpaceBetween size="s">
                  <Box>VPC · {acl.vpc}</Box>
                  <Box>Default · {acl.is_default ? "Yes" : "No"}</Box>
                  <Box>
                    Associated subnets ·{" "}
                    {acl.associated_subnet_ids.join(", ") || "None"}
                  </Box>
                </SpaceBetween>
              ),
            },
            {
              id: "inbound",
              label: "Inbound rules",
              content: (
                <SpaceBetween size="m">
                  <Button onClick={openEdit}>Edit inbound rules</Button>
                  <Table
                    trackBy={(r) => String(r.rule_number)}
                    columnDefinitions={ruleCols}
                    items={sortRules(acl.inbound)}
                  />
                </SpaceBetween>
              ),
            },
            {
              id: "outbound",
              label: "Outbound rules",
              content: (
                <Table
                  trackBy={(r) => String(r.rule_number)}
                  columnDefinitions={ruleCols.map((c) =>
                    c.id === "cidr" ? { ...c, header: "Destination" } : c
                  )}
                  items={sortRules(acl.outbound)}
                />
              ),
            },
            {
              id: "assoc",
              label: "Subnet associations",
              content: (
                <Table
                  trackBy={(s) => s}
                  columnDefinitions={[
                    { id: "s", header: "Subnet ID", cell: (s: string) => s },
                  ]}
                  items={acl.associated_subnet_ids}
                  empty={<Box padding="l">No subnet associations.</Box>}
                />
              ),
            },
            {
              id: "tags",
              label: "Tags",
              content: (
                <Box color="text-body-secondary">
                  No tags associated with this resource.
                </Box>
              ),
            },
          ]}
        />
      </SpaceBetween>

      <Modal
        visible={editing}
        onDismiss={() => setEditing(false)}
        header={`Edit inbound rules · ${acl.id}`}
        size="large"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" onClick={saveEdit}>
                Save
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="l">
          <Table
            trackBy={(r) => String(r.rule_number)}
            columnDefinitions={[
              {
                id: "n",
                header: "Rule number",
                cell: (r) => String(r.rule_number),
              },
              { id: "t", header: "Type", cell: (r) => r.type },
              { id: "p", header: "Protocol", cell: (r) => r.protocol },
              { id: "port", header: "Port range", cell: (r) => r.port_range },
              { id: "cidr", header: "Source", cell: (r) => r.cidr },
              { id: "act", header: "Allow/Deny", cell: (r) => r.action },
              {
                id: "rm",
                header: "",
                cell: (r) => (
                  <Button
                    variant="inline-link"
                    onClick={() =>
                      setDraftRules((prev) =>
                        prev.filter((x) => x.rule_number !== r.rule_number)
                      )
                    }
                  >
                    Remove
                  </Button>
                ),
              },
            ]}
            items={draftRules}
            empty={
              <Box padding="s" color="text-body-secondary">
                No custom rules. Add a rule below.
              </Box>
            }
          />
          <Header variant="h3">Add rule</Header>
          <SpaceBetween size="m">
            <FormField label="Rule number">
              <Input
                value={newRule.rule_number}
                onChange={({ detail }) =>
                  setNewRule((r) => ({ ...r, rule_number: detail.value }))
                }
              />
            </FormField>
            <FormField label="Type">
              <Input
                value={newRule.type}
                onChange={({ detail }) =>
                  setNewRule((r) => ({ ...r, type: detail.value }))
                }
              />
            </FormField>
            <FormField label="Protocol">
              <Input
                value={newRule.protocol}
                onChange={({ detail }) =>
                  setNewRule((r) => ({ ...r, protocol: detail.value }))
                }
              />
            </FormField>
            <FormField label="Port range">
              <Input
                value={newRule.port_range}
                onChange={({ detail }) =>
                  setNewRule((r) => ({ ...r, port_range: detail.value }))
                }
              />
            </FormField>
            <FormField label="Source">
              <Input
                value={newRule.cidr}
                onChange={({ detail }) =>
                  setNewRule((r) => ({ ...r, cidr: detail.value }))
                }
              />
            </FormField>
            <FormField label="Allow/Deny">
              <Select
                selectedOption={{
                  label: newRule.action,
                  value: newRule.action,
                }}
                options={[
                  { label: "Allow", value: "Allow" },
                  { label: "Deny", value: "Deny" },
                ]}
                onChange={({ detail }) =>
                  setNewRule((r) => ({
                    ...r,
                    action:
                      (detail.selectedOption.value as "Allow" | "Deny") ||
                      "Allow",
                  }))
                }
              />
            </FormField>
            <Button
              onClick={() => {
                const num = Number(newRule.rule_number);
                if (!Number.isFinite(num) || num < 1 || num > 32766) return;
                setDraftRules((prev) => [
                  ...prev.filter((r) => r.rule_number !== num),
                  {
                    rule_number: num,
                    type: newRule.type,
                    protocol: newRule.protocol,
                    port_range: newRule.port_range,
                    cidr: newRule.cidr,
                    action: newRule.action,
                  },
                ]);
              }}
            >
              Add rule
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      </Modal>
    </div>
  );
}

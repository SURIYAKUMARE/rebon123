import { memo, useState, useMemo, useCallback } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import Modal from "@cloudscape-design/components/modal";
import Alert from "@cloudscape-design/components/alert";
import Checkbox from "@cloudscape-design/components/checkbox";
import RadioGroup from "@cloudscape-design/components/radio-group";
import Tabs from "@cloudscape-design/components/tabs";
import { useAccountStore } from "../store";
import type { Ec2Instance, SgRule } from "../types";
import { TargetGroupsPage, TargetGroupDetailPage } from "./ec2/TargetGroupsPage";
import { InstanceDetailPage } from "./ec2/InstanceDetailPage";
import {
  ElasticIpsPage,
  NetworkInterfacesPage,
  LaunchTemplatesPage,
  PlacementGroupsPage,
  SpotRequestsPage,
  ReservedInstancesPage,
  LaunchConfigurationsPage,
} from "./ec2/Ec2ResourcePages";

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

export const Ec2Service = memo(function Ec2Service() {
  const page = useAccountStore((s) => s.route.page);
  if (page === "dashboard") return <Ec2Dashboard />;
  if (page === "launch") return <LaunchInstance />;
  if (page === "asg") return <AsgList />;
  if (page === "load-balancers") return <LbList />;
  if (page === "security-groups") return <Ec2SecurityGroups />;
  if (page === "key-pairs") return <KeyPairsPage />;
  if (page === "elastic-ips") return <ElasticIpsPage />;
  if (page === "placement-groups") return <PlacementGroupsPage />;
  if (page === "network-interfaces") return <NetworkInterfacesPage />;
  if (page === "launch-templates") return <LaunchTemplatesPage />;
  if (page === "spot-requests") return <SpotRequestsPage />;
  if (page === "reserved-instances") return <ReservedInstancesPage />;
  if (page === "target-groups") return <TargetGroupsPage />;
  if (page === "target-group-detail") return <TargetGroupDetailPage />;
  if (page === "launch-configurations") return <LaunchConfigurationsPage />;
  if (page === "instance-detail") return <InstanceDetailPage />;
  return <InstancesList />;
});

function KeyPairsPage() {
  const keyPairs = useAccountStore((s) => s.key_pairs);
  const createKeyPair = useAccountStore((s) => s.createKeyPair);
  const deleteKeyPairs = useAccountStore((s) => s.deleteKeyPairs);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div data-console-target="ec2-key-pairs" data-action-id="NAV:ec2-key-pairs">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${keyPairs.length})`}
          description="Amazon EC2 key pairs encrypt your login information. Download the private key file (.pem) and keep it safe — you cannot recover it later."
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                disabled={!selected.length}
                onClick={() => deleteKeyPairs(selected)}
              >
                Delete
              </Button>
              <Button
                variant="primary"
                data-console-target="btn-create-key-pair"
                onClick={() => setCreating(true)}
              >
                Create key pair
              </Button>
            </SpaceBetween>
          }
        >
          Key pairs
        </Header>
        <Table
          trackBy="name"
          selectionType="multi"
          selectedItems={keyPairs.filter((k) => selected.includes(k.name))}
          onSelectionChange={({ detail }) =>
            setSelected(detail.selectedItems.map((i) => i.name))
          }
          columnDefinitions={[
            { id: "name", header: "Name", cell: (k) => k.name },
            { id: "fp", header: "Fingerprint", cell: (k) => k.fingerprint },
            { id: "type", header: "Key pair type", cell: (k) => k.type.toUpperCase() },
            { id: "created", header: "Created", cell: (k) => k.created },
          ]}
          items={keyPairs}
          empty={
            <Box textAlign="center" padding="l" color="text-body-secondary">
              No key pairs. Create one before launching instances you need SSH access to.
            </Box>
          }
        />
      </SpaceBetween>

      <Modal
        visible={creating}
        onDismiss={() => !busy && setCreating(false)}
        header="Create key pair"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled={busy} onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                data-console-target="btn-create-key-pair-submit"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await createKeyPair(name, "rsa");
                    setCreating(false);
                    setName("");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Create key pair
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField
          label="Name"
          description="Up to 255 characters. Letters, numbers, and ._- only."
        >
          <Input
            value={name}
            onChange={({ detail }) => setName(detail.value)}
            placeholder="e.g. my-bastion-key"
            data-console-target="input-key-pair-name"
          />
        </FormField>
      </Modal>
    </div>
  );
}

function publicDnsFor(i: Ec2Instance) {
  if (i.public_dns) return i.public_dns;
  if (!i.public_ip) return "—";
  return `ec2-${i.public_ip.replace(/\./g, "-")}.${i.region}.compute.amazonaws.com`;
}

/** Lightweight EC2 list for Ren screen-share — avoids Cloudscape Table update loops. */
const LearnInstancesList = memo(function LearnInstancesList() {
  const region = useAccountStore((s) => s.identity.region);
  const allInstances = useAccountStore((s) => s.instances);
  const instances = useMemo(
    () => allInstances.filter((i) => i.region === region),
    [allInstances, region]
  );
  const total = allInstances.length;

  return (
    <div data-console-target="ec2-instances-list" className="ec2-instances-shell">
      <div className="aws-learn-ec2-header">
        <h1 className="aws-learn-ec2-title">Instances ({instances.length})</h1>
        <p className="aws-learn-ec2-desc">
          Instances · {region}. Changing Region hides instances in other Regions — they
          are not deleted.
        </p>
      </div>
      {instances.length === 0 ? (
        <div data-console-target="ec2-instances-empty" className="aws-learn-ec2-empty">
          <strong>No instances found</strong>
          <p>
            You are viewing <b>{region}</b>. {total} instance(s) exist in other Regions
            and may still be billing — they are not visible here.
          </p>
        </div>
      ) : (
        <div className="aws-learn-ec2-table-wrap">
          <table className="aws-learn-ec2-table">
            <thead>
              <tr>
                <th>Instance ID</th>
                <th>Name</th>
                <th>Instance state</th>
                <th>Instance type</th>
                <th>Availability Zone</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((inst) => (
                <tr key={inst.id}>
                  <td>{inst.id}</td>
                  <td>{inst.name}</td>
                  <td>{inst.state}</td>
                  <td>{inst.type}</td>
                  <td>{inst.az}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <span data-console-target="launch-instance" className="sr-only" />
    </div>
  );
});

function InstancesList() {
  const interactive = useAccountStore((s) => s.interactive);
  if (!interactive) return <LearnInstancesList />;
  return <InteractiveInstancesList />;
}

const InteractiveInstancesList = memo(function InteractiveInstancesList() {
  const region = useAccountStore((s) => s.identity.region);
  const all = useAccountStore((s) => s.instances);
  const instances = useMemo(
    () => all.filter((i) => i.region === region),
    [all, region]
  );
  const navigate = useAccountStore((s) => s.navigate);
  const setInstanceState = useAccountStore((s) => s.setInstanceState);
  const patchInstanceType = useAccountStore((s) => s.patchInstanceType);
  const setFlash = useAccountStore((s) => s.setFlash);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const [selected, setSelected] = useState<Ec2Instance[]>([]);
  const [filter, setFilter] = useState("");
  const [connectTarget, setConnectTarget] = useState<Ec2Instance | null>(null);
  const [changeTypeTarget, setChangeTypeTarget] = useState<Ec2Instance | null>(
    null
  );
  const [newType, setNewType] = useState("t3.micro");
  const [systemLogTarget, setSystemLogTarget] = useState<Ec2Instance | null>(
    null
  );
  const [tick, setTick] = useState(0);

  const onSelectionChange = useCallback(
    ({ detail }: { detail: { selectedItems: Ec2Instance[] } }) => {
      setSelected((prev) => {
        const next = detail.selectedItems;
        if (
          prev.length === next.length &&
          prev.every((row, i) => row.id === next[i]?.id)
        ) {
          return prev;
        }
        return next;
      });
    },
    []
  );

  const filtered = useMemo(
    () =>
      instances.filter(
        (i) =>
          !filter ||
          i.id.toLowerCase().includes(filter.toLowerCase()) ||
          i.name.toLowerCase().includes(filter.toLowerCase()) ||
          i.type.toLowerCase().includes(filter.toLowerCase())
      ),
    [instances, filter]
  );

  const oneRunning =
    selected.length === 1 && selected[0]?.state === "running";

  const emptySlot = useMemo(
    () => (
      <div data-console-target="ec2-instances-empty">
        <Box textAlign="center" padding="l">
          <Box variant="strong">No instances found</Box>
          <Box color="text-body-secondary" padding={{ top: "s" }}>
            You are viewing <b>{region}</b>. {all.length} instance(s) exist in other
            Regions and may still be billing — they are not visible here.
          </Box>
        </Box>
      </div>
    ),
    [region, all.length]
  );

  const openDetail = useCallback(
    (inst: Ec2Instance) => {
      if (!interactive) return;
      navigate("ec2", "instance-detail", inst.id);
    },
    [interactive, navigate]
  );

  const columnDefinitions = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (i: Ec2Instance) => (
          <Button
            variant="inline-link"
            disabled={!interactive}
            onClick={() => openDetail(i)}
          >
            {i.name || "—"}
          </Button>
        ),
      },
      {
        id: "id",
        header: "Instance ID",
        cell: (i: Ec2Instance) => (
          <Button
            variant="inline-link"
            disabled={!interactive}
            onClick={() => openDetail(i)}
          >
            {i.id}
          </Button>
        ),
      },
      {
        id: "state",
        header: "Instance state",
        cell: (i: Ec2Instance) => stateIndicator(i.state),
      },
      { id: "type", header: "Instance type", cell: (i: Ec2Instance) => i.type },
      {
        id: "check",
        header: "Status check",
        cell: (i: Ec2Instance) =>
          i.status_check === "ok" ? (
            <StatusIndicator type="success">2/2 checks passed</StatusIndicator>
          ) : (
            <StatusIndicator type="pending">Initial</StatusIndicator>
          ),
      },
      {
        id: "alarm",
        header: "Alarm status",
        cell: (i: Ec2Instance) => i.alarm_status || "No alarms",
      },
      { id: "az", header: "Availability Zone", cell: (i: Ec2Instance) => i.az },
      {
        id: "dns",
        header: "Public IPv4 DNS",
        cell: (i: Ec2Instance) => publicDnsFor(i),
      },
      {
        id: "pub",
        header: "Public IPv4 address",
        cell: (i: Ec2Instance) => i.public_ip || "—",
      },
    ],
    [interactive, openDetail]
  );

  return (
    <div data-console-target="ec2-instances-list" className="ec2-instances-shell">
      <Table
        variant="full-page"
        stickyHeader
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={onSelectionChange}
        filter={
          <SpaceBetween direction="horizontal" size="xs">
            <Input
              value={filter}
              onChange={({ detail }) => setFilter(detail.value)}
              placeholder="Find Instance by ID or Tags"
              type="search"
              ariaLabel="Filter instances"
            />
            <Button
              iconName="refresh"
              ariaLabel="Refresh"
              onClick={() => setTick((n) => n + 1)}
            />
          </SpaceBetween>
        }
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${instances.length})`}
            description={`Amazon EC2 · ${region}. Changing Region hides instances in other Regions — they are not deleted.`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  disabled={!interactive || !oneRunning}
                  onClick={() => {
                    if (selected[0]) setConnectTarget(selected[0]);
                  }}
                >
                  Connect
                </Button>
                <ButtonDropdown
                  data-action-id="HIGHLIGHT:ec2-instance-state-dropdown"
                  disabled={!interactive || selected.length !== 1}
                  items={[
                    { id: "start", text: "Start instance" },
                    { id: "stop", text: "Stop instance" },
                    { id: "reboot", text: "Reboot instance" },
                    { id: "hibernate", text: "Hibernate instance", disabled: true },
                    { id: "terminate", text: "Terminate instance" },
                  ]}
                  onItemClick={({ detail }) => {
                    const inst = selected[0];
                    if (!inst) return;
                    if (detail.id === "start") setInstanceState(inst.id, "running");
                    if (detail.id === "stop") setInstanceState(inst.id, "stopped");
                    if (detail.id === "reboot") setInstanceState(inst.id, "reboot");
                    if (detail.id === "terminate")
                      setInstanceState(inst.id, "terminated");
                  }}
                >
                  Instance state
                </ButtonDropdown>
                <ButtonDropdown
                  disabled={!interactive || selected.length === 0}
                  items={[
                    {
                      id: "monitor",
                      text: "Monitor and troubleshoot",
                      items: [
                        { id: "cw", text: "View monitoring charts" },
                        { id: "alarms", text: "Manage CloudWatch alarms" },
                        { id: "sys-log", text: "Get system log" },
                        { id: "screenshot", text: "Get instance screenshot" },
                      ],
                    },
                    {
                      id: "instance-settings",
                      text: "Instance settings",
                      items: [
                        { id: "change-type", text: "Change instance type" },
                        { id: "change-sg", text: "Change security groups" },
                        { id: "manage-tags", text: "Manage tags" },
                      ],
                    },
                    {
                      id: "networking",
                      text: "Networking",
                      items: [
                        { id: "change-sg-net", text: "Change security groups" },
                      ],
                    },
                    { id: "image", text: "Image and templates", disabled: true },
                  ]}
                  onItemClick={({ detail }) => {
                    const inst = selected[0];
                    if (!inst) return;
                    if (detail.id === "cw" || detail.id === "alarms") {
                      navigate(
                        "cloudwatch",
                        detail.id === "alarms" ? "alarms" : "metrics-all"
                      );
                      return;
                    }
                    if (detail.id === "sys-log") {
                      setSystemLogTarget(inst);
                      return;
                    }
                    if (detail.id === "screenshot") {
                      setFlash({
                        type: "success",
                        content: `Instance screenshot request submitted for ${inst.id}.`,
                      });
                      return;
                    }
                    if (detail.id === "change-type") {
                      setNewType(inst.type);
                      setChangeTypeTarget(inst);
                      return;
                    }
                    if (
                      detail.id === "change-sg" ||
                      detail.id === "change-sg-net"
                    ) {
                      navigate("ec2", "security-groups");
                      return;
                    }
                    if (detail.id === "manage-tags") {
                      setFlash({
                        type: "success",
                        content: `Tags updated for ${inst.id}.`,
                      });
                    }
                  }}
                >
                  Actions
                </ButtonDropdown>
                <span
                  data-console-target="launch-instance"
                  data-action-id="HIGHLIGHT:btn-launch-instance"
                >
                  <Button
                    variant="primary"
                    disabled={!interactive}
                    onClick={() => {
                      markClick("launch-instance");
                      navigate("ec2", "launch");
                    }}
                  >
                    Launch instances
                  </Button>
                </span>
              </SpaceBetween>
            }
          >
            Instances
          </Header>
        }
        columnDefinitions={columnDefinitions}
        items={filtered}
        empty={emptySlot}
      />
      <Modal
        visible={!!connectTarget}
        onDismiss={() => setConnectTarget(null)}
        header={`Connect to instance ${connectTarget?.id || ""}`}
        footer={
          <Box float="right">
            <Button variant="primary" onClick={() => setConnectTarget(null)}>
              Close
            </Button>
          </Box>
        }
      >
        {connectTarget && (
          <SpaceBetween size="m">
            <Alert type="info">
              Connection instructions for {connectTarget.name} ({connectTarget.id}).
            </Alert>
            <Box variant="h3">EC2 Instance Connect / SSH</Box>
            <Box>
              <code>
                ssh -i &quot;my-key.pem&quot; ec2-user@
                {connectTarget.public_ip || connectTarget.private_ip}
              </code>
            </Box>
            <Box variant="h3">Session Manager</Box>
            <Box color="text-body-secondary">
              Open AWS Systems Manager → Session Manager → Start session, then select{" "}
              {connectTarget.id}.
            </Box>
          </SpaceBetween>
        )}
      </Modal>
      <Modal
        visible={!!changeTypeTarget}
        onDismiss={() => setChangeTypeTarget(null)}
        header={`Change instance type · ${changeTypeTarget?.id || ""}`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setChangeTypeTarget(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (changeTypeTarget) {
                    patchInstanceType(changeTypeTarget.id, newType);
                  }
                  setChangeTypeTarget(null);
                }}
              >
                Apply
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField
          label="Instance type"
          description="Stop the instance before changing type when required by the current generation."
        >
          <Select
            selectedOption={{ label: newType, value: newType }}
            options={[
              "t3.micro",
              "t3.small",
              "t3.medium",
              "t3.large",
              "m5.large",
              "c5.large",
            ].map((t) => ({ label: t, value: t }))}
            onChange={({ detail }) =>
              setNewType(detail.selectedOption.value || newType)
            }
          />
        </FormField>
      </Modal>
      <Modal
        visible={!!systemLogTarget}
        onDismiss={() => setSystemLogTarget(null)}
        header={`System log · ${systemLogTarget?.id || ""}`}
        size="large"
        footer={
          <Box float="right">
            <Button variant="primary" onClick={() => setSystemLogTarget(null)}>
              Close
            </Button>
          </Box>
        }
      >
        <Box variant="code" fontSize="body-s">
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {`[    0.000000] Linux version 6.1.79-99.164.amzn2023.x86_64
[    0.123456] Command line: BOOT_IMAGE=/boot/vmlinuz root=UUID=…
[    1.000000] systemd[1]: Started Journal Service.
[    2.500000] cloud-init[123]: Cloud-init v. 22.2.2 finished
[    3.000000] amazon-ssm-agent[456]: Registration completed
[    4.000000] kernel: eth0: renamed from ens5
Instance ${systemLogTarget?.id || ""} (${systemLogTarget?.name || ""}) console output.`}
          </pre>
        </Box>
      </Modal>
    </div>
  );
});

function Ec2Dashboard() {
  const region = useAccountStore((s) => s.identity.region);
  const allInstances = useAccountStore((s) => s.instances);
  const asgs = useAccountStore((s) => s.asgs);
  const instances = useMemo(
    () => allInstances.filter((i) => i.region === region),
    [allInstances, region]
  );
  const running = instances.filter((i) => i.state === "running").length;
  const stopped = instances.filter((i) => i.state === "stopped").length;
  const navigate = useAccountStore((s) => s.navigate);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description={`Resources in ${region}`}>
        EC2 Dashboard
      </Header>
      <ColumnLayout columns={2}>
        <Container
          header={<Header variant="h2">Resources</Header>}
        >
          <SpaceBetween size="s">
            <Box>
              Running instances{" "}
              <Button variant="inline-link" onClick={() => navigate("ec2", "instances")}>
                {running}
              </Button>
            </Box>
            <Box>Stopped instances {stopped}</Box>
            <Box>
              Auto Scaling groups{" "}
              <Button variant="inline-link" onClick={() => navigate("ec2", "asg")}>
                {asgs.length}
              </Button>
            </Box>
          </SpaceBetween>
        </Container>
        <Container header={<Header variant="h2">Launch instance</Header>}>
          <Box padding={{ bottom: "s" }} color="text-body-secondary">
            Launch a virtual server. A key pair and security group are required to connect.
          </Box>
          <span data-console-target="launch-instance">
            <Button
              variant="primary"
              disabled={!interactive}
              onClick={() => {
                markClick("launch-instance");
                navigate("ec2", "launch");
              }}
            >
              Launch instance
            </Button>
          </span>
        </Container>
      </ColumnLayout>
    </SpaceBetween>
  );
}

function LaunchInstance() {
  const navigate = useAccountStore((s) => s.navigate);
  const launchInstance = useAccountStore((s) => s.launchInstance);
  const createSecurityGroup = useAccountStore((s) => s.createSecurityGroup);
  const createKeyPair = useAccountStore((s) => s.createKeyPair);
  const keyPairs = useAccountStore((s) => s.key_pairs);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const vpcs = useAccountStore((s) => s.vpcs);
  const subnets = useAccountStore((s) => s.subnets);
  const sgs = useAccountStore((s) => s.security_groups);
  const region = useAccountStore((s) => s.identity.region);

  const [name, setName] = useState("");
  const [ami, setAmi] = useState("Amazon Linux");
  const [type, setType] = useState("t2.micro");
  const defaultKey = keyPairs[0]?.name || "none";
  const [key, setKey] = useState(defaultKey);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [keyFormat, setKeyFormat] = useState(".pem");
  const [creatingKey, setCreatingKey] = useState(false);
  const [vpc, setVpc] = useState(vpcs[0]?.id || "");
  const [subnet, setSubnet] = useState("");
  const [sgMode, setSgMode] = useState("create");
  const [sg, setSg] = useState(sgs[0]?.id || "");
  const [allowSsh, setAllowSsh] = useState(true);
  const [allowHttps, setAllowHttps] = useState(false);
  const [allowHttp, setAllowHttp] = useState(false);
  const [autoPublicIp, setAutoPublicIp] = useState(true);
  const [networkEdit, setNetworkEdit] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [userData, setUserData] = useState("");
  const [storage, setStorage] = useState("8");
  const [count, setCount] = useState("1");
  const [launching, setLaunching] = useState(false);

  const amiOptions = ["Amazon Linux", "macOS", "Ubuntu", "Windows", "Red Hat"];
  const keyOptions = keyPairs.map((k) => k.name);
  const selectedKey =
    key !== "none" && keyOptions.includes(key)
      ? key
      : keyOptions[0] || "none";

  const doLaunch = async () => {
    if (!name.trim() || launching) return;
    markClick("launch-instance-submit");
    setLaunching(true);
    await new Promise((r) => setTimeout(r, 800));
    if (sgMode === "create") {
      const inbound = [];
      if (allowSsh)
        inbound.push({
          type: "SSH",
          protocol: "TCP",
          port: "22",
          source: "0.0.0.0/0",
          description: "SSH",
        });
      if (allowHttp)
        inbound.push({
          type: "HTTP",
          protocol: "TCP",
          port: "80",
          source: "0.0.0.0/0",
          description: "HTTP",
        });
      if (allowHttps)
        inbound.push({
          type: "HTTPS",
          protocol: "TCP",
          port: "443",
          source: "0.0.0.0/0",
          description: "HTTPS",
        });
      createSecurityGroup(
        `launch-wizard-${Math.floor(1 + Math.random() * 9)}`,
        vpc || vpcs[0]?.id || "vpc-default",
        `Security group for ${name.trim()}`,
        { stayOnPage: true }
      );
      const created = useAccountStore.getState().security_groups.slice(-1)[0];
      if (created && inbound.length) {
        useAccountStore.getState().setSgInboundRules(created.id, inbound);
      }
    }
    const n = Math.max(1, Math.min(10, Number(count) || 1));
    for (let i = 0; i < n; i += 1) {
      launchInstance(
        n > 1 ? `${name.trim()}-${i + 1}` : name.trim(),
        type,
        subnet || undefined
      );
    }
    setLaunching(false);
  };

  return (
    <div className="aws-ec2-launch-layout">
      <SpaceBetween size="l" className="aws-ec2-launch-form">
        <Header variant="h1" description={`Launch an Amazon EC2 instance in ${region}`}>
          Launch an instance
        </Header>
        <Container header={<Header variant="h2">Name and tags</Header>}>
          <FormField label="Name">
            <span data-console-target="instance-name-input" data-action-id="FILL:ec2-instance-name">
              <Input
                value={name}
                disabled={!interactive || launching}
                onChange={({ detail }) => {
                  setName(detail.value);
                  useAccountStore.getState().setActionDraft({
                    "ec2-instance-name": detail.value,
                  });
                }}
                placeholder="e.g. My Web Server"
              />
            </span>
          </FormField>
        </Container>
        <Container
          header={<Header variant="h2">Application and OS Images (Amazon Machine Image)</Header>}
        >
          <Box padding={{ bottom: "s" }} color="text-body-secondary">
            Quick Start · My AMIs · AWS Marketplace
          </Box>
          <div className="aws-ami-quickstart" data-action-id="SELECT:ec2-ami-amazon-linux">
            {amiOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`aws-ami-card${ami === opt ? " is-selected" : ""}`}
                disabled={!interactive || launching}
                onClick={() => setAmi(opt)}
              >
                <strong>{opt}</strong>
                <span>
                  {opt === "Amazon Linux"
                    ? "Amazon Linux 2023 AMI · Free tier eligible"
                    : `${opt} AMI`}
                </span>
              </button>
            ))}
          </div>
          <Box padding={{ top: "s" }}>
            AMI:{" "}
            {ami === "Amazon Linux"
              ? "Amazon Linux 2023 AMI 64-bit (x86_64) - Free tier eligible"
              : `${ami} AMI`}
          </Box>
        </Container>
        <Container header={<Header variant="h2">Instance type</Header>}>
          <span data-action-id="SELECT:ec2-instance-type-t2-micro">
            <Select
              selectedOption={{
                label:
                  type === "t2.micro"
                    ? "t2.micro (1 vCPU, 1 GiB Memory) - Free tier eligible"
                    : type === "t3.micro"
                      ? "t3.micro (2 vCPU, 1 GiB Memory)"
                      : type,
                value: type,
              }}
              options={[
                {
                  label: "t2.micro (1 vCPU, 1 GiB Memory) - Free tier eligible",
                  value: "t2.micro",
                },
                { label: "t3.micro (2 vCPU, 1 GiB Memory)", value: "t3.micro" },
                { label: "t3.small", value: "t3.small" },
                { label: "t3.medium", value: "t3.medium" },
              ]}
              onChange={({ detail }) => setType(detail.selectedOption.value || "t2.micro")}
            />
          </span>
        </Container>
        <Container header={<Header variant="h2">Key pair (login)</Header>}>
          <SpaceBetween size="s">
            <Select
              selectedOption={{
                label:
                  selectedKey === "none"
                    ? "Proceed without a key pair (Not recommended)"
                    : selectedKey,
                value: selectedKey,
              }}
              options={[
                ...keyOptions.map((k) => ({ label: k, value: k })),
                { label: "Proceed without a key pair (Not recommended)", value: "none" },
              ]}
              onChange={({ detail }) => setKey(detail.selectedOption.value || selectedKey)}
            />
            <Button variant="inline-link" onClick={() => setShowKeyModal(true)}>
              Create new key pair
            </Button>
          </SpaceBetween>
        </Container>
        <Container
          header={
            <Header
              variant="h2"
              actions={
                <Button variant="inline-link" onClick={() => setNetworkEdit((v) => !v)}>
                  {networkEdit ? "Close" : "Edit"}
                </Button>
              }
            >
              Network settings
            </Header>
          }
        >
          {!networkEdit ? (
            <Box color="text-body-secondary">
              VPC {vpc || "default"} · Auto-assign public IP {autoPublicIp ? "Enable" : "Disable"} ·{" "}
              {sgMode === "create" ? "Create security group" : "Existing SG"}
            </Box>
          ) : (
            <SpaceBetween size="m">
              <FormField label="VPC">
                <Select
                  selectedOption={{ label: vpc, value: vpc }}
                  options={
                    vpcs.length
                      ? vpcs.map((v) => ({ label: `${v.name} (${v.id})`, value: v.id }))
                      : [{ label: "vpc-default (default)", value: "vpc-default" }]
                  }
                  onChange={({ detail }) => setVpc(detail.selectedOption.value || vpc)}
                />
              </FormField>
              <FormField label="Subnet">
                <Select
                  selectedOption={{
                    label: subnet || "No preference",
                    value: subnet || "none",
                  }}
                  options={[
                    {
                      label: "No preference (default subnet in any availability zone)",
                      value: "none",
                    },
                    ...subnets.map((s) => ({
                      label: `${s.name} (${s.az})`,
                      value: s.id,
                    })),
                  ]}
                  onChange={({ detail }) =>
                    setSubnet(
                      detail.selectedOption.value === "none"
                        ? ""
                        : detail.selectedOption.value || subnet
                    )
                  }
                />
              </FormField>
              <FormField label="Auto-assign public IP">
                <Select
                  selectedOption={{
                    label: autoPublicIp ? "Enable" : "Disable",
                    value: autoPublicIp ? "enable" : "disable",
                  }}
                  options={[
                    { label: "Enable", value: "enable" },
                    { label: "Disable", value: "disable" },
                  ]}
                  onChange={({ detail }) =>
                    setAutoPublicIp(detail.selectedOption.value === "enable")
                  }
                />
              </FormField>
              <FormField label="Firewall (security groups)">
                <RadioGroup
                  value={sgMode}
                  onChange={({ detail }) => setSgMode(detail.value)}
                  items={[
                    { value: "create", label: "Create security group" },
                    { value: "existing", label: "Select existing security group" },
                  ]}
                />
              </FormField>
              {sgMode === "create" ? (
                <SpaceBetween size="xs">
                  <Checkbox
                    checked={allowSsh}
                    onChange={({ detail }) => setAllowSsh(detail.checked)}
                  >
                    Allow SSH traffic from Anywhere (0.0.0.0/0)
                  </Checkbox>
                  <Checkbox
                    checked={allowHttps}
                    onChange={({ detail }) => setAllowHttps(detail.checked)}
                  >
                    Allow HTTPS traffic from the internet
                  </Checkbox>
                  <Checkbox
                    checked={allowHttp}
                    onChange={({ detail }) => setAllowHttp(detail.checked)}
                  >
                    Allow HTTP traffic from the internet
                  </Checkbox>
                </SpaceBetween>
              ) : (
                <Select
                  selectedOption={{ label: sg, value: sg }}
                  options={sgs.map((g) => ({
                    label: `${g.name} (${g.id})`,
                    value: g.id,
                  }))}
                  onChange={({ detail }) => setSg(detail.selectedOption.value || sg)}
                />
              )}
            </SpaceBetween>
          )}
        </Container>
        <Container header={<Header variant="h2">Configure storage</Header>}>
          <FormField label="1x Root volume · gp3 · GiB">
            <Input value={storage} onChange={({ detail }) => setStorage(detail.value)} />
          </FormField>
          <Box color="text-body-secondary" padding={{ top: "xs" }}>
            AWS Launch Wizard recommends an 8 GiB gp3 root volume for this deployment.
          </Box>
        </Container>
        <Container
          header={
            <Header
              variant="h2"
              actions={
                <Button variant="inline-link" onClick={() => setAdvancedOpen((v) => !v)}>
                  {advancedOpen ? "Collapse" : "Expand"}
                </Button>
              }
            >
              Advanced details
            </Header>
          }
        >
          {advancedOpen ? (
            <FormField
              label="User data - optional"
              description="Bootstrap script runs at first boot (cloud-init)."
            >
              <textarea
                className="aws-userdata"
                value={userData}
                onChange={(e) => setUserData(e.target.value)}
                placeholder={"#!/bin/bash\nyum install httpd -y\nsystemctl start httpd"}
                rows={8}
              />
            </FormField>
          ) : (
            <Box color="text-body-secondary">
              Expand to configure IAM instance profile, user data, and metadata options.
            </Box>
          )}
        </Container>
        <Button onClick={() => navigate("ec2", "instances")} disabled={launching}>
          Cancel
        </Button>
      </SpaceBetween>

      <aside className="aws-ec2-launch-summary" data-console-target="ec2-launch-summary">
        <Header variant="h2">Summary</Header>
        <SpaceBetween size="s">
          <FormField label="Number of instances">
            <Input value={count} onChange={({ detail }) => setCount(detail.value)} />
          </FormField>
          <Box>
            Software Image (AMI):{" "}
            {ami === "Amazon Linux" ? "Amazon Linux 2023 AMI" : ami}
          </Box>
          <Box>Virtual server type (Instance type): {type}</Box>
          <Box>
            Firewall (Security group):{" "}
            {sgMode === "create" ? "New security group" : sg || "Existing"}
          </Box>
          <Box>Storage (Volumes): 1 volume(s) - {storage} GiB</Box>
          <span
            data-console-target="launch-instance-submit"
            data-action-id="CLICK:btn-launch-instance-submit"
          >
            <Button
              variant="primary"
              fullWidth
              loading={launching}
              disabled={!interactive || !name.trim() || launching}
              onClick={() => void doLaunch()}
            >
              {launching ? "Launching…" : "Launch instance"}
            </Button>
          </span>
        </SpaceBetween>
      </aside>

      <Modal
        visible={showKeyModal}
        onDismiss={() => setShowKeyModal(false)}
        header="Create key pair"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowKeyModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!newKeyName.trim() || creatingKey}
                loading={creatingKey}
                data-console-target="btn-create-key-pair-submit"
                data-action-id="CLICK:btn-create-key-pair-submit"
                onClick={() => {
                  void (async () => {
                    const k = newKeyName.trim();
                    setCreatingKey(true);
                    await createKeyPair(k, "rsa");
                    const exists = useAccountStore
                      .getState()
                      .key_pairs.some((kp) => kp.name === k);
                    if (exists) {
                      setKey(k);
                      const blob = new Blob(
                        [
                          `-----BEGIN ${keyFormat.toUpperCase()} PRIVATE KEY-----\nSIMULATED\n-----END KEY-----`,
                        ],
                        { type: "application/x-pem-file" }
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${k}${keyFormat}`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setShowKeyModal(false);
                      setNewKeyName("");
                    }
                    setCreatingKey(false);
                  })();
                }}
              >
                Create key pair
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Key pair name">
            <Input
              value={newKeyName}
              onChange={({ detail }) => setNewKeyName(detail.value)}
            />
          </FormField>
          <FormField label="Private key file format">
            <RadioGroup
              value={keyFormat}
              onChange={({ detail }) => setKeyFormat(detail.value)}
              items={[
                { value: ".pem", label: ".pem" },
                { value: ".ppk", label: ".ppk (for use with PuTTY)" },
              ]}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </div>
  );
}

function Ec2SecurityGroups() {
  const groups = useAccountStore((s) => s.security_groups);
  const setSgInboundRules = useAccountStore((s) => s.setSgInboundRules);
  const interactive = useAccountStore((s) => s.interactive);
  const [selected, setSelected] = useState<(typeof groups)[0][]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<(SgRule & { uid: string })[]>([]);
  const [filter, setFilter] = useState("");

  const active = selected[0] || null;
  const items = groups.filter(
    (g) =>
      !filter ||
      g.name.toLowerCase().includes(filter.toLowerCase()) ||
      g.id.toLowerCase().includes(filter.toLowerCase())
  );

  const openEdit = () => {
    if (!active) return;
    setDraft(
      active.inbound.map((r) => ({
        ...r,
        uid:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `rule-${Math.random().toString(36).slice(2)}`,
      }))
    );
    setEditOpen(true);
  };

  return (
    <SpaceBetween size="l">
      <Table
        variant="full-page"
        stickyHeader
        selectionType="single"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        filter={
          <Input
            value={filter}
            onChange={({ detail }) => setFilter(detail.value)}
            placeholder="Filter security groups"
            type="search"
          />
        }
        header={
          <Header variant="awsui-h1-sticky" counter={`(${groups.length})`}>
            Security Groups
          </Header>
        }
        columnDefinitions={[
          { id: "name", header: "Security group name", cell: (g) => g.name },
          {
            id: "id",
            header: "Security group ID",
            cell: (g) => (
              <Button variant="inline-link" disabled={!interactive}>
                {g.id}
              </Button>
            ),
          },
          { id: "vpc", header: "VPC ID", cell: (g) => g.vpc },
          { id: "desc", header: "Description", cell: (g) => g.description },
        ]}
        items={items}
        empty={
          <Box textAlign="center" padding="l">
            No security groups
          </Box>
        }
      />

      {active && (
        <Container
          header={
            <Header
              variant="h2"
              description={active.id}
              actions={
                <Button disabled={!interactive} onClick={openEdit}>
                  Edit inbound rules
                </Button>
              }
            >
              {active.name}
            </Header>
          }
        >
          <Tabs
            tabs={[
              {
                id: "details",
                label: "Details",
                content: (
                  <ColumnLayout columns={2} variant="text-grid">
                    <div>
                      <Box variant="awsui-key-label">Security group name</Box>
                      <Box>{active.name}</Box>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">Security group ID</Box>
                      <Box>{active.id}</Box>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">VPC ID</Box>
                      <Box>{active.vpc}</Box>
                    </div>
                    <div>
                      <Box variant="awsui-key-label">Description</Box>
                      <Box>{active.description}</Box>
                    </div>
                  </ColumnLayout>
                ),
              },
              {
                id: "inbound",
                label: "Inbound rules",
                content: (
                  <SpaceBetween size="s">
                    <Table
                      columnDefinitions={[
                        { id: "type", header: "Type", cell: (r) => r.type },
                        { id: "proto", header: "Protocol", cell: (r) => r.protocol },
                        { id: "port", header: "Port range", cell: (r) => r.port },
                        { id: "source", header: "Source", cell: (r) => r.source },
                        {
                          id: "desc",
                          header: "Description",
                          cell: (r) => r.description || "—",
                        },
                      ]}
                      items={active.inbound}
                      empty={<Box padding="s">No inbound rules</Box>}
                    />
                    <Button variant="primary" disabled={!interactive} onClick={openEdit}>
                      Edit inbound rules
                    </Button>
                  </SpaceBetween>
                ),
              },
              {
                id: "outbound",
                label: "Outbound rules",
                content: (
                  <Table
                    columnDefinitions={[
                      { id: "type", header: "Type", cell: (r) => r.type },
                      { id: "proto", header: "Protocol", cell: (r) => r.protocol },
                      { id: "port", header: "Port range", cell: (r) => r.port },
                      { id: "source", header: "Destination", cell: (r) => r.source },
                    ]}
                    items={active.outbound}
                  />
                ),
              },
              {
                id: "tags",
                label: "Tags",
                content: (
                  <Box color="text-body-secondary">No tags associated with this resource.</Box>
                ),
              },
            ]}
          />
        </Container>
      )}

      <Modal
        visible={editOpen}
        size="large"
        onDismiss={() => setEditOpen(false)}
        header="Edit inbound rules"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!active}
                onClick={() => {
                  if (!active) return;
                  setSgInboundRules(
                    active.id,
                    draft.map(({ uid: _uid, ...rule }) => rule)
                  );
                  setEditOpen(false);
                }}
              >
                Save rules
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {draft.map((rule, idx) => (
            <SpaceBetween key={rule.uid} direction="horizontal" size="xs">
              <FormField label="Type">
                <Select
                  selectedOption={{ label: rule.type, value: rule.type }}
                  options={["SSH", "HTTP", "HTTPS", "Custom TCP", "All traffic"].map(
                    (t) => ({ label: t, value: t })
                  )}
                  onChange={({ detail }) => {
                    const t = detail.selectedOption.value || rule.type;
                    const next = [...draft];
                    next[idx] = {
                      ...rule,
                      type: t,
                      protocol: t === "All traffic" ? "All" : "TCP",
                      port:
                        t === "SSH"
                          ? "22"
                          : t === "HTTP"
                            ? "80"
                            : t === "HTTPS"
                              ? "443"
                              : rule.port,
                    };
                    setDraft(next);
                  }}
                />
              </FormField>
              <FormField label="Protocol">
                <Input
                  value={rule.protocol}
                  onChange={({ detail }) => {
                    const next = [...draft];
                    next[idx] = { ...rule, protocol: detail.value };
                    setDraft(next);
                  }}
                />
              </FormField>
              <FormField label="Port range">
                <Input
                  value={rule.port}
                  onChange={({ detail }) => {
                    const next = [...draft];
                    next[idx] = { ...rule, port: detail.value };
                    setDraft(next);
                  }}
                />
              </FormField>
              <FormField label="Source">
                <Input
                  value={rule.source}
                  onChange={({ detail }) => {
                    const next = [...draft];
                    next[idx] = { ...rule, source: detail.value };
                    setDraft(next);
                  }}
                />
              </FormField>
              <Button
                onClick={() =>
                  setDraft((d) => d.filter((r) => r.uid !== rule.uid))
                }
              >
                Delete
              </Button>
            </SpaceBetween>
          ))}
          <Button
            onClick={() =>
              setDraft((d) => [
                ...d,
                {
                  uid:
                    typeof crypto !== "undefined" && "randomUUID" in crypto
                      ? crypto.randomUUID()
                      : `rule-${Math.random().toString(36).slice(2)}`,
                  type: "Custom TCP",
                  protocol: "TCP",
                  port: "8080",
                  source: "0.0.0.0/0",
                  description: "",
                },
              ])
            }
          >
            Add rule
          </Button>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
}

function AsgList() {
  const asgs = useAccountStore((s) => s.asgs);
  const createAsg = useAccountStore((s) => s.createAsg);
  const updateAsgDesired = useAccountStore((s) => s.updateAsgDesired);
  const interactive = useAccountStore((s) => s.interactive);
  const [selected, setSelected] = useState<(typeof asgs)[0][]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desired, setDesired] = useState("2");
  const [min, setMin] = useState("1");
  const [max, setMax] = useState("4");
  const [editDesired, setEditDesired] = useState("");

  return (
    <SpaceBetween size="l">
      {showCreate && (
        <SpaceBetween size="s">
          <FormField label="Name">
            <Input
              value={name}
              disabled={!interactive}
              onChange={({ detail }) => setName(detail.value)}
              placeholder="e.g. web-asg"
            />
          </FormField>
          <SpaceBetween direction="horizontal" size="xs">
            <FormField label="Desired">
              <Input
                value={desired}
                disabled={!interactive}
                onChange={({ detail }) => setDesired(detail.value)}
              />
            </FormField>
            <FormField label="Min">
              <Input
                value={min}
                disabled={!interactive}
                onChange={({ detail }) => setMin(detail.value)}
              />
            </FormField>
            <FormField label="Max">
              <Input
                value={max}
                disabled={!interactive}
                onChange={({ detail }) => setMax(detail.value)}
              />
            </FormField>
          </SpaceBetween>
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="primary"
              disabled={!interactive || !name.trim()}
              onClick={() => {
                createAsg(
                  name.trim(),
                  Number(desired) || 1,
                  Number(min) || 0,
                  Number(max) || 1
                );
                setName("");
                setShowCreate(false);
              }}
            >
              Create Auto Scaling group
            </Button>
            <Button onClick={() => setShowCreate(false)}>Cancel</Button>
          </SpaceBetween>
        </SpaceBetween>
      )}
      {selected.length === 1 && (
        <SpaceBetween direction="horizontal" size="xs">
          <FormField label={`Edit desired capacity (${selected[0].name})`}>
            <Input
              value={editDesired}
              disabled={!interactive}
              onChange={({ detail }) => setEditDesired(detail.value)}
              placeholder={String(selected[0].desired)}
            />
          </FormField>
          <Button
            disabled={!interactive || editDesired === ""}
            onClick={() => {
              updateAsgDesired(selected[0].name, Number(editDesired) || 0);
              setEditDesired("");
            }}
          >
            Update desired
          </Button>
        </SpaceBetween>
      )}
      <Table
        variant="full-page"
        selectionType="single"
        selectedItems={selected}
        onSelectionChange={({ detail }) => {
          setSelected(detail.selectedItems);
          setEditDesired(
            detail.selectedItems[0]
              ? String(detail.selectedItems[0].desired)
              : ""
          );
        }}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${asgs.length})`}
            actions={
              <Button
                variant="primary"
                disabled={!interactive}
                onClick={() => setShowCreate(true)}
              >
                Create Auto Scaling group
              </Button>
            }
          >
            Auto Scaling groups
          </Header>
        }
        columnDefinitions={[
          { id: "name", header: "Name", cell: (a) => a.name },
          { id: "n", header: "Instances", cell: (a) => String(a.instances) },
          { id: "min", header: "Min", cell: (a) => String(a.min) },
          { id: "max", header: "Max", cell: (a) => String(a.max) },
          { id: "des", header: "Desired", cell: (a) => String(a.desired) },
          { id: "st", header: "Status", cell: (a) => a.status },
          { id: "hc", header: "Health check", cell: (a) => a.health_check },
        ]}
        items={asgs}
      />
    </SpaceBetween>
  );
}

function LbList() {
  const lbs = useAccountStore((s) => s.load_balancers);
  const createLoadBalancer = useAccountStore((s) => s.createLoadBalancer);
  const interactive = useAccountStore((s) => s.interactive);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"application" | "network">("application");

  return (
    <SpaceBetween size="l">
      {showCreate && (
        <SpaceBetween size="s">
          <FormField label="Load balancer name">
            <Input
              value={name}
              disabled={!interactive}
              onChange={({ detail }) => setName(detail.value)}
              placeholder="e.g. freshbite-alb"
            />
          </FormField>
          <FormField label="Type">
            <Select
              selectedOption={{
                label: type === "application" ? "Application" : "Network",
                value: type,
              }}
              options={[
                { label: "Application", value: "application" },
                { label: "Network", value: "network" },
              ]}
              onChange={({ detail }) =>
                setType(
                  (detail.selectedOption.value as "application" | "network") ||
                    "application"
                )
              }
            />
          </FormField>
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="primary"
              disabled={!interactive || !name.trim()}
              onClick={() => {
                createLoadBalancer(name.trim(), type);
                setName("");
                setShowCreate(false);
              }}
            >
              Create load balancer
            </Button>
            <Button onClick={() => setShowCreate(false)}>Cancel</Button>
          </SpaceBetween>
        </SpaceBetween>
      )}
      <Table
        variant="full-page"
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${lbs.length})`}
            actions={
              <Button
                variant="primary"
                disabled={!interactive}
                onClick={() => setShowCreate(true)}
              >
                Create load balancer
              </Button>
            }
          >
            Load balancers
          </Header>
        }
        columnDefinitions={[
          { id: "name", header: "Name", cell: (l) => l.name },
          { id: "dns", header: "DNS name", cell: (l) => l.dns },
          { id: "state", header: "State", cell: (l) => l.state },
          {
            id: "type",
            header: "Type",
            cell: (l) => (
              <Badge color={l.type === "application" ? "blue" : "grey"}>
                {l.type === "application" ? "ALB" : "NLB"}
              </Badge>
            ),
          },
          { id: "vpc", header: "VPC", cell: (l) => l.vpc },
        ]}
        items={lbs}
      />
    </SpaceBetween>
  );
}

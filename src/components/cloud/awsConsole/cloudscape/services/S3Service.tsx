import { memo, useCallback, useMemo, useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import Checkbox from "@cloudscape-design/components/checkbox";
import RadioGroup from "@cloudscape-design/components/radio-group";
import Tabs from "@cloudscape-design/components/tabs";
import Container from "@cloudscape-design/components/container";
import Textarea from "@cloudscape-design/components/textarea";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Modal from "@cloudscape-design/components/modal";
import ProgressBar from "@cloudscape-design/components/progress-bar";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import TokenGroup from "@cloudscape-design/components/token-group";
import { useAccountStore } from "../store";
import { REGIONS } from "../ui";
import type { S3Bucket, S3ObjectItem } from "../types";

type StubRow = { id: string; name: string; created: string };

const NAME_RE = /^(?!xn--)(?!.*\.\.)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveObjects(bucket: S3Bucket): S3ObjectItem[] {
  if (bucket.object_items?.length) return bucket.object_items;
  return (bucket.object_keys || []).map((key) => ({
    key,
    size: 4096,
    type: key.includes(".") ? key.split(".").pop() || "bin" : "folder",
    lastModified: bucket.created,
    storageClass: "Standard",
  }));
}

export const S3Service = memo(function S3Service() {
  const page = useAccountStore((s) => s.route.page);
  if (page === "create-bucket") return <CreateBucket />;
  if (page === "bucket-detail") return <BucketDetail />;
  if (
    page === "access-points" ||
    page === "object-lambda" ||
    page === "mrap" ||
    page === "batch" ||
    page === "access-analyzer"
  ) {
    return <S3Stub page={page} />;
  }
  if (page === "account-bpa") return <AccountBpaPage />;
  return <BucketsList />;
});

function S3InteractiveStub({
  title,
  createLabel,
  nameLabel,
}: {
  title: string;
  createLabel: string;
  nameLabel: string;
}) {
  const setFlash = useAccountStore((s) => s.setFlash);
  const region = useAccountStore((s) => s.identity.region);
  const [rows, setRows] = useState<StubRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");

  return (
    <SpaceBetween size="l">
      <Modal
        visible={showCreate}
        onDismiss={() => setShowCreate(false)}
        header={createLabel}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!name.trim()}
                onClick={() => {
                  const trimmed = name.trim();
                  const row: StubRow = {
                    id: `${Date.now().toString(36)}`,
                    name: trimmed,
                    created: new Date().toISOString().slice(0, 10),
                  };
                  setRows((prev) => [...prev, row]);
                  setName("");
                  setShowCreate(false);
                  setFlash({ type: "success", content: "Created" });
                }}
              >
                Create
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label={nameLabel}>
          <Input
            value={name}
            onChange={({ detail }) => setName(detail.value)}
            placeholder={`e.g. my-${title.toLowerCase().replace(/\s+/g, "-")}`}
          />
        </FormField>
      </Modal>

      <Table
        variant="full-page"
        stickyHeader
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${rows.length})`}
            description={`Amazon S3 · ${region}`}
            actions={
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                {createLabel}
              </Button>
            }
          >
            {title}
          </Header>
        }
        columnDefinitions={[
          { id: "name", header: "Name", cell: (r: StubRow) => r.name },
          { id: "created", header: "Created", cell: (r: StubRow) => r.created },
        ]}
        items={rows}
        empty={
          <Box textAlign="center" color="inherit">
            <b>No {title.toLowerCase()}</b>
            <Box variant="p" color="inherit" padding={{ top: "xxs" }}>
              Get started by creating {title.toLowerCase()} in this Region.
            </Box>
          </Box>
        }
      />
    </SpaceBetween>
  );
}

function S3Stub({ page }: { page: string }) {
  if (page === "access-points" || page === "object-lambda") {
    return (
      <S3InteractiveStub
        title={page === "object-lambda" ? "Object Lambda Access Points" : "Access Points"}
        createLabel="Create access point"
        nameLabel="Access point name"
      />
    );
  }
  if (page === "mrap") {
    return (
      <S3InteractiveStub
        title="Multi-Region Access Points"
        createLabel="Create Multi-Region Access Point"
        nameLabel="Multi-Region Access Point name"
      />
    );
  }
  if (page === "batch") {
    return (
      <S3InteractiveStub
        title="Batch Operations"
        createLabel="Create job"
        nameLabel="Job name"
      />
    );
  }
  return (
    <S3InteractiveStub
      title="Access Analyzer for S3"
      createLabel="Create analyzer"
      nameLabel="Analyzer name"
    />
  );
}

function AccountBpaPage() {
  const accountBpa = useAccountStore((s) => s.account_bpa);
  const setAccountBpa = useAccountStore((s) => s.setAccountBpa);
  const [draft, setDraft] = useState(accountBpa);

  const allOn =
    draft.block_acls &&
    draft.ignore_acls &&
    draft.block_policy &&
    draft.restrict_buckets;

  return (
    <div data-console-target="s3-account-bpa" data-action-id="NAV:s3-account-bpa">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description="Account-level Block Public Access settings apply to every bucket in this account unless a bucket overrides them."
          actions={
            <Button
              variant="primary"
              data-console-target="btn-save-account-bpa"
              data-action-id="CLICK:btn-save-account-bpa"
              onClick={() => setAccountBpa(draft)}
            >
              Save changes
            </Button>
          }
        >
          Block Public Access settings for this account
        </Header>
        <Alert type="info">
          Turning these settings On is the production-safe default. Public buckets require an
          explicit acknowledgement in the Create bucket wizard.
        </Alert>
        <Container>
          <SpaceBetween size="m">
            <Checkbox
              checked={allOn}
              onChange={({ detail }) => {
                const v = detail.checked;
                setDraft({
                  block_acls: v,
                  ignore_acls: v,
                  block_policy: v,
                  restrict_buckets: v,
                });
              }}
            >
              Block all public access
            </Checkbox>
            <Checkbox
              checked={draft.block_acls}
              onChange={({ detail }) =>
                setDraft((d) => ({ ...d, block_acls: detail.checked }))
              }
            >
              Block public access to buckets and objects granted through new access control lists
              (ACLs)
            </Checkbox>
            <Checkbox
              checked={draft.ignore_acls}
              onChange={({ detail }) =>
                setDraft((d) => ({ ...d, ignore_acls: detail.checked }))
              }
            >
              Block public access to buckets and objects granted through any access control lists
              (ACLs)
            </Checkbox>
            <Checkbox
              checked={draft.block_policy}
              onChange={({ detail }) =>
                setDraft((d) => ({ ...d, block_policy: detail.checked }))
              }
            >
              Block public access to buckets and objects granted through new public bucket or
              access point policies
            </Checkbox>
            <Checkbox
              checked={draft.restrict_buckets}
              onChange={({ detail }) =>
                setDraft((d) => ({ ...d, restrict_buckets: detail.checked }))
              }
            >
              Block public and cross-account access to buckets and objects through any public
              bucket or access point policies
            </Checkbox>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </div>
  );
}

const EMPTY_BUCKETS = (
  <Box textAlign="center" padding="l">
    <b>No buckets</b>
  </Box>
);

const BucketsList = memo(function BucketsList() {
  const buckets = useAccountStore((s) => s.buckets);
  const navigate = useAccountStore((s) => s.navigate);
  const deleteBucket = useAccountStore((s) => s.deleteBucket);
  const emptyBucket = useAccountStore((s) => s.emptyBucket);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const setFlash = useAccountStore((s) => s.setFlash);
  const [selected, setSelected] = useState<S3Bucket[]>([]);
  const [filter, setFilter] = useState("");

  const items = useMemo(
    () =>
      buckets.filter(
        (b) =>
          !filter ||
          b.name.toLowerCase().includes(filter.toLowerCase()) ||
          b.region.toLowerCase().includes(filter.toLowerCase())
      ),
    [buckets, filter]
  );

  const onSelectionChange = useCallback(
    ({ detail }: { detail: { selectedItems: S3Bucket[] } }) => {
      setSelected((prev) => {
        const next = detail.selectedItems;
        if (
          prev.length === next.length &&
          prev.every((row, i) => row.name === next[i]?.name)
        ) {
          return prev;
        }
        return next;
      });
    },
    []
  );

  const columnDefinitions = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (b: S3Bucket) => (
          <span data-console-target={`bucket-${b.name}`}>
            <Button
              variant="inline-link"
              disabled={!interactive}
              onClick={() => navigate("s3", "bucket-detail", b.name)}
            >
              {b.name}
            </Button>
          </span>
        ),
      },
      {
        id: "region",
        header: "AWS Region",
        cell: (b: S3Bucket) => b.region,
      },
      {
        id: "access",
        header: "Access",
        cell: (b: S3Bucket) =>
          b.public ? (
            <StatusIndicator type="warning">Public</StatusIndicator>
          ) : (
            <StatusIndicator type="stopped">
              Bucket and objects not public
            </StatusIndicator>
          ),
      },
      {
        id: "created",
        header: "Creation date",
        cell: (b: S3Bucket) => b.created,
      },
    ],
    [interactive, navigate]
  );

  const active = selected[0];

  return (
    <div data-action-id="NAV:s3-buckets">
      <Table
        variant="full-page"
        stickyHeader
        selectionType="single"
        selectedItems={selected}
        onSelectionChange={onSelectionChange}
        filter={
          <Input
            value={filter}
            onChange={({ detail }) => setFilter(detail.value)}
            placeholder="Find buckets by name or property"
            type="search"
          />
        }
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${buckets.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <ButtonDropdown
                  disabled={!interactive || !active}
                  items={[
                    { id: "empty", text: "Empty" },
                    { id: "delete", text: "Delete" },
                    { id: "copy-arn", text: "Copy ARN" },
                    { id: "edit-public", text: "Edit public access" },
                    { id: "management", text: "Management" },
                  ]}
                  onItemClick={({ detail }) => {
                    if (!active) return;
                    if (detail.id === "empty") {
                      emptyBucket(active.name);
                      return;
                    }
                    if (detail.id === "delete") {
                      deleteBucket(active.name);
                      setSelected([]);
                      return;
                    }
                    if (detail.id === "copy-arn") {
                      const arn = `arn:aws:s3:::${active.name}`;
                      void navigator.clipboard?.writeText(arn);
                      setFlash({ type: "success", content: `Copied ARN: ${arn}` });
                      return;
                    }
                    if (detail.id === "edit-public") {
                      navigate("s3", "bucket-detail", active.name);
                      setFlash({
                        type: "info",
                        content: "Open the Permissions tab to edit Block Public Access.",
                      });
                      return;
                    }
                    if (detail.id === "management") {
                      navigate("s3", "bucket-detail", active.name);
                      setFlash({
                        type: "info",
                        content: "Open the Management tab for lifecycle rules.",
                      });
                    }
                  }}
                >
                  Actions
                </ButtonDropdown>
                <span
                  data-console-target="create-bucket"
                  data-action-id="HIGHLIGHT:btn-create-bucket"
                >
                  <Button
                    variant="primary"
                    disabled={!interactive}
                    onClick={() => {
                      markClick("create-bucket");
                      navigate("s3", "create-bucket");
                    }}
                  >
                    Create bucket
                  </Button>
                </span>
              </SpaceBetween>
            }
          >
            Buckets
          </Header>
        }
        columnDefinitions={columnDefinitions}
        items={items}
        empty={EMPTY_BUCKETS}
      />
    </div>
  );
});

function CreateBucket() {
  const navigate = useAccountStore((s) => s.navigate);
  const createBucket = useAccountStore((s) => s.createBucket);
  const buckets = useAccountStore((s) => s.buckets);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const defaultRegion = useAccountStore((s) => s.identity.region);

  const [name, setName] = useState("");
  const [region, setRegion] = useState(defaultRegion || "ap-south-1");
  const [ownership, setOwnership] = useState("bucket-owner-enforced");
  const [bpa, setBpa] = useState({
    block_acls: true,
    ignore_acls: true,
    block_policy: true,
    restrict_buckets: true,
  });
  const [versioning, setVersioning] = useState(false);
  const [encryption, setEncryption] = useState("sse-s3");
  const [bpaAck, setBpaAck] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tagKey, setTagKey] = useState("");
  const [tagValue, setTagValue] = useState("");
  const [tags, setTags] = useState<{ key: string; value: string }[]>([]);

  const allBpaOn = Object.values(bpa).every(Boolean);

  const error = useMemo(() => {
    if (!name) return "";
    if (/[A-Z]/.test(name)) return "Bucket name must not contain uppercase characters.";
    if (buckets.some((b) => b.name === name)) return "A bucket with this name already exists.";
    if (!NAME_RE.test(name))
      return "Bucket names must be 3–63 characters, lowercase, and cannot look like IP addresses.";
    return "";
  }, [name, buckets]);

  const canCreate =
    interactive && !!name && !error && !creating && (allBpaOn || bpaAck);

  return (
    <div data-action-id="NAV:s3-create-bucket">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description="Buckets are containers for objects stored in Amazon S3."
        >
          Create bucket
        </Header>

        <Container header={<Header variant="h2">General configuration</Header>}>
          <SpaceBetween size="m">
            <FormField label="Bucket name" errorText={error || undefined}>
              <span
                data-console-target="bucket-name-input"
                data-action-id="FILL:s3-bucket-name"
              >
                <Input
                  value={name}
                  disabled={!interactive}
                  onChange={({ detail }) => {
                    setName(detail.value);
                    useAccountStore.getState().setActionDraft({
                      "s3-bucket-name": detail.value,
                    });
                  }}
                  placeholder="rebon-production-assets"
                />
              </span>
            </FormField>
            <FormField label="AWS Region">
              <Select
                selectedOption={{
                  label: REGIONS.find((r) => r.id === region)?.label || region,
                  value: region,
                }}
                options={REGIONS.map((r) => ({
                  label: `${r.label} · ${r.id}`,
                  value: r.id,
                }))}
                onChange={({ detail }) =>
                  setRegion(detail.selectedOption.value || region)
                }
              />
            </FormField>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">Object Ownership</Header>}>
          <RadioGroup
            value={ownership}
            onChange={({ detail }) => setOwnership(detail.value)}
            items={[
              {
                value: "bucket-owner-enforced",
                label: "ACLs disabled (recommended)",
                description: "Bucket owner enforced",
              },
              {
                value: "bucket-owner-preferred",
                label: "ACLs enabled",
                description: "Bucket owner preferred",
              },
            ]}
          />
        </Container>

        <Container
          header={
            <Header variant="h2">Block Public Access settings for this bucket</Header>
          }
        >
          <SpaceBetween size="s">
            <span data-action-id="HIGHLIGHT:toggle-block-public-access">
              <Checkbox
                checked={allBpaOn}
                data-action-id="TOGGLE:s3-block-all-public"
                onChange={({ detail }) => {
                  const on = detail.checked;
                  setBpa({
                    block_acls: on,
                    ignore_acls: on,
                    block_policy: on,
                    restrict_buckets: on,
                  });
                  setBpaAck(false);
                  useAccountStore.getState().setActionDraft({
                    "s3-block-public-access": on,
                  });
                }}
              >
                Block all public access
              </Checkbox>
            </span>

            {!allBpaOn && (
              <SpaceBetween size="s">
                <Alert
                  type="warning"
                  header="Turning off block all public access might result in this bucket and the objects within becoming public."
                >
                  Confirm you understand the risks before creating this bucket.
                </Alert>
                <span data-action-id="HIGHLIGHT:s3-warning-acknowledgment">
                  <Checkbox
                    checked={bpaAck}
                    data-action-id="TOGGLE:s3-public-acknowledgement"
                    onChange={({ detail }) => setBpaAck(detail.checked)}
                  >
                    I acknowledge that the current settings might result in this bucket and
                    the objects within becoming public.
                  </Checkbox>
                </span>
              </SpaceBetween>
            )}

            <Checkbox
              checked={bpa.block_acls}
              onChange={({ detail }) => {
                setBpa({ ...bpa, block_acls: detail.checked });
                setBpaAck(false);
              }}
            >
              Block public access to buckets and objects granted through new access control
              lists (ACLs)
            </Checkbox>
            <Checkbox
              checked={bpa.ignore_acls}
              onChange={({ detail }) => {
                setBpa({ ...bpa, ignore_acls: detail.checked });
                setBpaAck(false);
              }}
            >
              Block public access to buckets and objects granted through any access control
              lists (ACLs)
            </Checkbox>
            <Checkbox
              checked={bpa.block_policy}
              onChange={({ detail }) => {
                setBpa({ ...bpa, block_policy: detail.checked });
                setBpaAck(false);
              }}
            >
              Block public access to buckets and objects granted through new public bucket or
              access point policies
            </Checkbox>
            <Checkbox
              checked={bpa.restrict_buckets}
              onChange={({ detail }) => {
                setBpa({ ...bpa, restrict_buckets: detail.checked });
                setBpaAck(false);
              }}
            >
              Block public and cross-account access to buckets and objects through any public
              bucket or access point policies
            </Checkbox>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">Bucket Versioning</Header>}>
          <RadioGroup
            value={versioning ? "enable" : "disable"}
            onChange={({ detail }) => setVersioning(detail.value === "enable")}
            items={[
              { value: "disable", label: "Disable" },
              { value: "enable", label: "Enable" },
            ]}
          />
        </Container>

        <Container header={<Header variant="h2">Tags - optional</Header>}>
          <SpaceBetween size="s">
            <SpaceBetween direction="horizontal" size="xs">
              <FormField label="Key">
                <Input
                  value={tagKey}
                  onChange={({ detail }) => setTagKey(detail.value)}
                  placeholder="Environment"
                />
              </FormField>
              <FormField label="Value">
                <Input
                  value={tagValue}
                  onChange={({ detail }) => setTagValue(detail.value)}
                  placeholder="Production"
                />
              </FormField>
              <Button
                disabled={!tagKey.trim()}
                onClick={() => {
                  setTags((prev) => [
                    ...prev,
                    { key: tagKey.trim(), value: tagValue.trim() },
                  ]);
                  setTagKey("");
                  setTagValue("");
                }}
              >
                Add tag
              </Button>
            </SpaceBetween>
            <TokenGroup
              items={tags.map((t) => ({
                label: `${t.key}=${t.value}`,
                dismissLabel: `Remove ${t.key}`,
              }))}
              onDismiss={({ detail }) =>
                setTags((prev) => prev.filter((_, i) => i !== detail.itemIndex))
              }
            />
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">Default encryption</Header>}>
          <RadioGroup
            value={encryption}
            onChange={({ detail }) => setEncryption(detail.value)}
            items={[
              {
                value: "sse-s3",
                label: "Server-side encryption with Amazon S3 managed keys (SSE-S3)",
              },
              {
                value: "sse-kms",
                label: "Server-side encryption with AWS Key Management Service keys (SSE-KMS)",
              },
            ]}
          />
        </Container>

        <SpaceBetween direction="horizontal" size="xs">
          <Button onClick={() => navigate("s3", "buckets")}>Cancel</Button>
          <span
            data-console-target="create-bucket-submit"
            data-action-id="CLICK:btn-create-bucket-submit"
          >
            <Button
              variant="primary"
              loading={creating}
              disabled={!canCreate}
              onClick={() => {
                markClick("create-bucket-submit");
                setCreating(true);
                void createBucket({
                  name,
                  region,
                  versioning,
                  block_public_access: allBpaOn,
                }).finally(() => setCreating(false));
              }}
            >
              Create bucket
            </Button>
          </span>
        </SpaceBetween>
      </SpaceBetween>
    </div>
  );
}

function BucketDetail() {
  const name = useAccountStore((s) => s.route.selectedId);
  const bucket = useAccountStore((s) => s.buckets.find((b) => b.name === name));
  const toggleBucketBpa = useAccountStore((s) => s.toggleBucketBpa);
  const setBucketVersioning = useAccountStore((s) => s.setBucketVersioning);
  const uploadObject = useAccountStore((s) => s.uploadObject);
  const deleteObject = useAccountStore((s) => s.deleteObject);
  const saveBucketPolicy = useAccountStore((s) => s.saveBucketPolicy);
  const addLifecycleRule = useAccountStore((s) => s.addLifecycleRule);
  const deleteBucket = useAccountStore((s) => s.deleteBucket);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const setFlash = useAccountStore((s) => s.setFlash);
  const [policy, setPolicy] = useState(bucket?.policy || "");
  const [activeTab, setActiveTab] = useState("objects");
  const [showUpload, setShowUpload] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [staged, setStaged] = useState<S3ObjectItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showLifecycle, setShowLifecycle] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [rulePrefix, setRulePrefix] = useState("");
  const [selectedObjs, setSelectedObjs] = useState<S3ObjectItem[]>([]);
  const [bpaDraft, setBpaDraft] = useState(
    bucket?.block_public_access || {
      block_acls: true,
      ignore_acls: true,
      block_policy: true,
      restrict_buckets: true,
    }
  );

  if (!bucket) return <Alert type="error">Bucket not found.</Alert>;

  const allOn = Object.values(bucket.block_public_access).every(Boolean);
  const objectItems = resolveObjects(bucket);
  const lifecycleRules = bucket.lifecycle_rules || [];
  const selectedObj = selectedObjs[0];

  const stageFile = (fileName: string, size = 12_288) => {
    const type = fileName.includes(".") ? fileName.split(".").pop() || "bin" : "folder";
    setStaged((prev) => [
      ...prev,
      {
        key: fileName,
        size,
        type,
        lastModified: "Pending upload",
        storageClass: "Standard",
      },
    ]);
  };

  const runUpload = () => {
    if (!staged.length || uploading) return;
    setUploading(true);
    setUploadProgress(0);
    let p = 0;
    const timer = window.setInterval(() => {
      p += 10;
      setUploadProgress(p);
      if (p >= 100) {
        window.clearInterval(timer);
        for (const file of staged) {
          uploadObject(bucket.name, file.key, {
            size: file.size,
            type: file.type,
            storageClass: file.storageClass,
          });
        }
        setStaged([]);
        setUploading(false);
        setShowUpload(false);
        setUploadProgress(0);
      }
    }, 200);
  };

  return (
    <div data-action-id="NAV:s3-bucket-details">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description={`arn:aws:s3:::${bucket.name}`}
          actions={
            <Button disabled={!interactive} onClick={() => deleteBucket(bucket.name)}>
              Delete
            </Button>
          }
        >
          {bucket.name}
        </Header>
        <div aria-hidden>
          <button
            type="button"
            data-action-id="CLICK:tab-properties"
            onClick={() => setActiveTab("properties")}
          />
          <button
            type="button"
            data-action-id="CLICK:tab-permissions"
            onClick={() => setActiveTab("permissions")}
          />
        </div>
        <Tabs
          activeTabId={activeTab}
          onChange={({ detail }) => setActiveTab(detail.activeTabId)}
          tabs={[
            {
              id: "objects",
              label: "Objects",
              content: (
                <SpaceBetween size="m">
                  <Table
                    selectionType="single"
                    selectedItems={selectedObjs}
                    onSelectionChange={({ detail }) =>
                      setSelectedObjs(detail.selectedItems)
                    }
                    header={
                      <Header
                        counter={`(${objectItems.length})`}
                        actions={
                          <SpaceBetween direction="horizontal" size="xs">
                            <Button
                              disabled={!selectedObj}
                              onClick={() => {
                                if (!selectedObj) return;
                                void navigator.clipboard?.writeText(
                                  `s3://${bucket.name}/${selectedObj.key}`
                                );
                                setFlash({
                                  type: "success",
                                  content: "Copied S3 URI",
                                });
                              }}
                            >
                              Copy S3 URI
                            </Button>
                            <Button
                              disabled={!selectedObj}
                              onClick={() => {
                                if (!selectedObj) return;
                                void navigator.clipboard?.writeText(
                                  `https://${bucket.name}.s3.${bucket.region}.amazonaws.com/${selectedObj.key}`
                                );
                                setFlash({
                                  type: "success",
                                  content: "Copied URL",
                                });
                              }}
                            >
                              Copy URL
                            </Button>
                            <Button
                              disabled={!selectedObj}
                              onClick={() => {
                                if (!selectedObj) return;
                                window.open(
                                  `https://${bucket.name}.s3.${bucket.region}.amazonaws.com/${selectedObj.key}`,
                                  "_blank"
                                );
                              }}
                            >
                              Open
                            </Button>
                            <Button
                              disabled={!interactive || !selectedObj}
                              onClick={() => {
                                if (!selectedObj) return;
                                deleteObject(bucket.name, selectedObj.key);
                                setSelectedObjs([]);
                              }}
                            >
                              Delete
                            </Button>
                            <Button
                              disabled={!interactive}
                              onClick={() => {
                                setFolderName("");
                                setShowFolder(true);
                              }}
                            >
                              Create folder
                            </Button>
                            <span data-action-id="HIGHLIGHT:btn-upload">
                              <Button
                                variant="primary"
                                disabled={!interactive}
                                onClick={() => {
                                  setShowUpload(true);
                                  setUploadProgress(0);
                                  setStaged([]);
                                }}
                              >
                                Upload
                              </Button>
                            </span>
                          </SpaceBetween>
                        }
                      >
                        Objects
                      </Header>
                    }
                    columnDefinitions={[
                      {
                        id: "key",
                        header: "Name",
                        cell: (r) => r.key,
                      },
                      { id: "type", header: "Type", cell: (r) => r.type },
                      {
                        id: "modified",
                        header: "Last modified",
                        cell: (r) => r.lastModified,
                      },
                      {
                        id: "size",
                        header: "Size",
                        cell: (r) => formatSize(r.size),
                      },
                      {
                        id: "class",
                        header: "Storage class",
                        cell: (r) => r.storageClass,
                      },
                    ]}
                    items={objectItems}
                    empty="No objects in this bucket."
                  />

                  <Modal
                    visible={showFolder}
                    onDismiss={() => setShowFolder(false)}
                    header="Create folder"
                    footer={
                      <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                          <Button onClick={() => setShowFolder(false)}>Cancel</Button>
                          <Button
                            variant="primary"
                            disabled={!interactive || !folderName.trim()}
                            onClick={() => {
                              const key = folderName.trim().endsWith("/")
                                ? folderName.trim()
                                : `${folderName.trim()}/`;
                              uploadObject(bucket.name, key, {
                                size: 0,
                                type: "folder",
                              });
                              setShowFolder(false);
                              setFolderName("");
                            }}
                          >
                            Create folder
                          </Button>
                        </SpaceBetween>
                      </Box>
                    }
                  >
                    <FormField label="Folder name">
                      <Input
                        value={folderName}
                        onChange={({ detail }) => setFolderName(detail.value)}
                        placeholder="logs"
                      />
                    </FormField>
                  </Modal>

                  <Modal
                    visible={showUpload}
                    onDismiss={() => {
                      if (!uploading) setShowUpload(false);
                    }}
                    header="Upload"
                    footer={
                      <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                          <Button
                            disabled={uploading}
                            onClick={() => setShowUpload(false)}
                          >
                            Cancel
                          </Button>
                          <span data-action-id="CLICK:btn-upload-submit">
                            <Button
                              variant="primary"
                              loading={uploading}
                              disabled={!interactive || !staged.length || uploading}
                              onClick={runUpload}
                            >
                              Upload
                            </Button>
                          </span>
                        </SpaceBetween>
                      </Box>
                    }
                  >
                    <SpaceBetween size="m">
                      <Box color="text-body-secondary">
                        Drag and drop files and folders here, or add them below.
                      </Box>
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button
                          onClick={() =>
                            stageFile(`uploads/file-${Date.now().toString(36)}.txt`, 8192)
                          }
                        >
                          Add files
                        </Button>
                        <Button
                          onClick={() =>
                            stageFile(`folder-${Date.now().toString(36)}/`, 0)
                          }
                        >
                          Add folder
                        </Button>
                      </SpaceBetween>
                      <Table
                        columnDefinitions={[
                          { id: "name", header: "Name", cell: (r) => r.key },
                          {
                            id: "size",
                            header: "Size",
                            cell: (r) => formatSize(r.size),
                          },
                          { id: "type", header: "Type", cell: (r) => r.type },
                        ]}
                        items={staged}
                        empty="No files staged for upload."
                      />
                      {uploading && (
                        <ProgressBar
                          value={uploadProgress}
                          label="Upload progress"
                          description={`${uploadProgress}%`}
                        />
                      )}
                    </SpaceBetween>
                  </Modal>
                </SpaceBetween>
              ),
            },
            {
              id: "properties",
              label: "Properties",
              content: (
                <div data-action-id="CLICK:tab-properties">
                  <SpaceBetween size="l">
                    <Container header={<Header variant="h2">Bucket overview</Header>}>
                      <ColumnLayout columns={2} variant="text-grid">
                        <div>
                          <Box variant="awsui-key-label">AWS Region</Box>
                          <Box>{bucket.region}</Box>
                        </div>
                        <div>
                          <Box variant="awsui-key-label">Amazon Resource Name (ARN)</Box>
                          <Box>{`arn:aws:s3:::${bucket.name}`}</Box>
                        </div>
                        <div>
                          <Box variant="awsui-key-label">Creation date</Box>
                          <Box>{bucket.created}</Box>
                        </div>
                      </ColumnLayout>
                    </Container>
                    <Container
                      header={
                        <Header
                          variant="h2"
                          actions={
                            <Button
                              disabled={!interactive}
                              onClick={() =>
                                setBucketVersioning(
                                  bucket.name,
                                  bucket.versioning !== "Enabled"
                                )
                              }
                            >
                              Edit
                            </Button>
                          }
                        >
                          Bucket Versioning
                        </Header>
                      }
                    >
                      <RadioGroup
                        value={
                          bucket.versioning === "Enabled" ? "enable" : "suspend"
                        }
                        onChange={({ detail }) =>
                          setBucketVersioning(bucket.name, detail.value === "enable")
                        }
                        items={[
                          { value: "enable", label: "Enable" },
                          { value: "suspend", label: "Suspend" },
                        ]}
                      />
                    </Container>
                    <Container header={<Header variant="h2">Default encryption</Header>}>
                      <Box>{bucket.encryption}</Box>
                    </Container>
                  </SpaceBetween>
                </div>
              ),
            },
            {
              id: "permissions",
              label: "Permissions",
              content: (
                <div data-action-id="NAV:s3-bucket-permissions">
                  <SpaceBetween size="l">
                    <Container
                      header={
                        <Header
                          variant="h2"
                          actions={
                            <Button
                              variant="primary"
                              disabled={!interactive}
                              onClick={() => {
                                const nextAllOn = Object.values(bpaDraft).every(Boolean);
                                toggleBucketBpa(bucket.name, nextAllOn);
                              }}
                            >
                              Save changes
                            </Button>
                          }
                        >
                          Block Public Access
                        </Header>
                      }
                    >
                      <SpaceBetween size="s">
                        <Checkbox
                          checked={Object.values(bpaDraft).every(Boolean)}
                          onChange={({ detail }) => {
                            const v = detail.checked;
                            setBpaDraft({
                              block_acls: v,
                              ignore_acls: v,
                              block_policy: v,
                              restrict_buckets: v,
                            });
                          }}
                        >
                          Block all public access
                        </Checkbox>
                        <Checkbox
                          checked={bpaDraft.block_acls}
                          onChange={({ detail }) =>
                            setBpaDraft((d) => ({ ...d, block_acls: detail.checked }))
                          }
                        >
                          Block public access to buckets and objects granted through new access
                          control lists (ACLs)
                        </Checkbox>
                        <Checkbox
                          checked={bpaDraft.ignore_acls}
                          onChange={({ detail }) =>
                            setBpaDraft((d) => ({ ...d, ignore_acls: detail.checked }))
                          }
                        >
                          Block public access to buckets and objects granted through any access
                          control lists (ACLs)
                        </Checkbox>
                        <Checkbox
                          checked={bpaDraft.block_policy}
                          onChange={({ detail }) =>
                            setBpaDraft((d) => ({ ...d, block_policy: detail.checked }))
                          }
                        >
                          Block public access to buckets and objects granted through new public
                          bucket or access point policies
                        </Checkbox>
                        <Checkbox
                          checked={bpaDraft.restrict_buckets}
                          onChange={({ detail }) =>
                            setBpaDraft((d) => ({
                              ...d,
                              restrict_buckets: detail.checked,
                            }))
                          }
                        >
                          Block public and cross-account access to buckets and objects through
                          any public bucket or access point policies
                        </Checkbox>
                        <span data-console-target={`bpa-${bucket.name}`}>
                          <Button
                            disabled={!interactive}
                            onClick={() => {
                              markClick(`bpa-${bucket.name}`);
                              toggleBucketBpa(bucket.name, !allOn);
                              setBpaDraft({
                                block_acls: !allOn,
                                ignore_acls: !allOn,
                                block_policy: !allOn,
                                restrict_buckets: !allOn,
                              });
                            }}
                          >
                            {allOn
                              ? "Turn Block Public Access off"
                              : "Turn Block Public Access on"}
                          </Button>
                        </span>
                        {!allOn && (
                          <Alert type="warning" header="Public access may be allowed">
                            At least one Block Public Access setting is off. Review bucket
                            policies and ACLs before granting public access.
                          </Alert>
                        )}
                      </SpaceBetween>
                    </Container>
                    <Container
                      header={
                        <Header
                          variant="h2"
                          actions={
                            <Button
                              variant="primary"
                              disabled={!interactive}
                              onClick={() => saveBucketPolicy(bucket.name, policy)}
                            >
                              Save
                            </Button>
                          }
                        >
                          Bucket policy
                        </Header>
                      }
                    >
                      <Textarea
                        value={policy}
                        disabled={!interactive}
                        onChange={({ detail }) => setPolicy(detail.value)}
                        rows={8}
                        placeholder="{ }"
                      />
                    </Container>
                    <Container header={<Header variant="h2">Access control list (ACL)</Header>}>
                      <Box color="text-body-secondary">
                        ACLs are disabled (bucket owner enforced).
                      </Box>
                    </Container>
                  </SpaceBetween>
                </div>
              ),
            },
            {
              id: "management",
              label: "Management",
              content: (
                <SpaceBetween size="l">
                  <Container
                    header={
                      <Header
                        variant="h2"
                        actions={
                          <Button
                            disabled={!interactive}
                            onClick={() => setShowLifecycle(true)}
                          >
                            Create lifecycle rule
                          </Button>
                        }
                      >
                        Lifecycle rules
                      </Header>
                    }
                  >
                    {showLifecycle && (
                      <SpaceBetween size="s">
                        <FormField label="Rule name">
                          <Input
                            value={ruleName}
                            disabled={!interactive}
                            onChange={({ detail }) => setRuleName(detail.value)}
                          />
                        </FormField>
                        <FormField label="Prefix">
                          <Input
                            value={rulePrefix}
                            disabled={!interactive}
                            onChange={({ detail }) => setRulePrefix(detail.value)}
                          />
                        </FormField>
                        <SpaceBetween direction="horizontal" size="xs">
                          <Button
                            variant="primary"
                            disabled={!interactive || !ruleName.trim()}
                            onClick={() => {
                              addLifecycleRule(
                                bucket.name,
                                ruleName.trim(),
                                rulePrefix.trim()
                              );
                              setRuleName("");
                              setRulePrefix("");
                              setShowLifecycle(false);
                            }}
                          >
                            Create rule
                          </Button>
                          <Button onClick={() => setShowLifecycle(false)}>Cancel</Button>
                        </SpaceBetween>
                      </SpaceBetween>
                    )}
                    <Table
                      columnDefinitions={[
                        { id: "name", header: "Name", cell: (r) => r.name },
                        { id: "st", header: "Status", cell: (r) => r.status },
                        { id: "prefix", header: "Prefix", cell: (r) => r.prefix },
                        { id: "act", header: "Actions", cell: (r) => r.actions },
                      ]}
                      items={lifecycleRules}
                      empty="No lifecycle rules."
                    />
                  </Container>
                  <Container header={<Header variant="h2">Replication rules</Header>}>
                    <Box color="text-body-secondary">No replication rules.</Box>
                  </Container>
                  <Container header={<Header variant="h2">Inventory configurations</Header>}>
                    <Box color="text-body-secondary">No inventory configurations.</Box>
                  </Container>
                </SpaceBetween>
              ),
            },
            {
              id: "metrics",
              label: "Metrics",
              content: (
                <Box color="text-body-secondary">Request metrics are not enabled.</Box>
              ),
            },
            {
              id: "access-points",
              label: "Access Points",
              content: (
                <Box color="text-body-secondary">No access points for this bucket.</Box>
              ),
            },
          ]}
        />
      </SpaceBetween>
    </div>
  );
}

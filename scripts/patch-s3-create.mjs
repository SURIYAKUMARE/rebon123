import fs from "fs";
const p = "src/components/cloud/awsConsole/cloudscape/services/S3Service.tsx";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("function CreateBucket() {");
const end = s.indexOf("function BucketDetail() {");
if (start < 0 || end < 0) throw new Error("markers missing");

const replacement = `function CreateBucket() {
  const navigate = useAccountStore((s) => s.navigate);
  const createBucket = useAccountStore((s) => s.createBucket);
  const buckets = useAccountStore((s) => s.buckets);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const defaultRegion = useAccountStore((s) => s.identity.region);

  const [name, setName] = useState("");
  const [region, setRegion] = useState(defaultRegion);
  const [ownership, setOwnership] = useState("bucket-owner-enforced");
  const [bpa, setBpa] = useState({
    block_acls: true,
    ignore_acls: true,
    block_policy: true,
    restrict_buckets: true,
  });
  const [versioning, setVersioning] = useState(false);
  const [bpaAck, setBpaAck] = useState(false);
  const [creating, setCreating] = useState(false);

  const allBpaOn = Object.values(bpa).every(Boolean);

  const error = useMemo(() => {
    if (!name) return "";
    if (buckets.some((b) => b.name === name)) return "A bucket with this name already exists.";
    if (/[A-Z]/.test(name)) return "Bucket name must not contain uppercase letters.";
    if (!NAME_RE.test(name))
      return "Bucket names must be 3–63 characters, lowercase, and cannot look like IP addresses.";
    return "";
  }, [name, buckets]);

  return (
    <SpaceBetween size="l">
      <Header variant="h1">Create bucket</Header>
      <Container header={<Header variant="h2">General configuration</Header>}>
        <SpaceBetween size="m">
          <FormField label="Bucket name" errorText={error || undefined}>
            <span data-console-target="bucket-name-input">
              <Input
                value={name}
                disabled={!interactive}
                onChange={({ detail }) => {
                  setName(detail.value.toLowerCase());
                  useAccountStore.getState().setActionDraft({
                    "s3-bucket-name": detail.value.toLowerCase(),
                  });
                }}
                placeholder="my-unique-bucket-name"
              />
            </span>
          </FormField>
          <FormField label="AWS Region">
            <Select
              selectedOption={{
                label: REGIONS.find((r) => r.id === region)?.label || region,
                value: region,
              }}
              options={REGIONS.map((r) => ({ label: \`\${r.label} · \${r.id}\`, value: r.id }))}
              onChange={({ detail }) => setRegion(detail.selectedOption.value || region)}
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
      <Container header={<Header variant="h2">Block Public Access settings for this bucket</Header>}>
        <SpaceBetween size="s">
          <Checkbox
            checked={allBpaOn}
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
          {!allBpaOn && (
            <div className="aws-s3-bpa-warning">
              <Alert type="warning" header="Turning off block public access">
                You are about to turn off Block Public Access. Public access will be
                allowed if bucket policies or ACLs grant it. Confirm you understand
                the risks before creating this bucket.
              </Alert>
              <Checkbox checked={bpaAck} onChange={({ detail }) => setBpaAck(detail.checked)}>
                I acknowledge that the current settings might result in this bucket and
                the objects within becoming public.
              </Checkbox>
            </div>
          )}
          <Checkbox
            checked={bpa.block_acls}
            onChange={({ detail }) => {
              setBpa({ ...bpa, block_acls: detail.checked });
              setBpaAck(false);
            }}
          >
            Block public access to buckets and objects granted through new access control lists (ACLs)
          </Checkbox>
          <Checkbox
            checked={bpa.ignore_acls}
            onChange={({ detail }) => {
              setBpa({ ...bpa, ignore_acls: detail.checked });
              setBpaAck(false);
            }}
          >
            Block public access to buckets and objects granted through any access control lists (ACLs)
          </Checkbox>
          <Checkbox
            checked={bpa.block_policy}
            onChange={({ detail }) => {
              setBpa({ ...bpa, block_policy: detail.checked });
              setBpaAck(false);
            }}
          >
            Block public access to buckets and objects granted through new public bucket or access point policies
          </Checkbox>
          <Checkbox
            checked={bpa.restrict_buckets}
            onChange={({ detail }) => {
              setBpa({ ...bpa, restrict_buckets: detail.checked });
              setBpaAck(false);
            }}
          >
            Block public and cross-account access to buckets and objects through any public bucket or access point policies
          </Checkbox>
        </SpaceBetween>
      </Container>
      <Container header={<Header variant="h2">Bucket Versioning</Header>}>
        <Toggle checked={versioning} onChange={({ detail }) => setVersioning(detail.checked)}>
          Enable versioning
        </Toggle>
      </Container>
      <Container header={<Header variant="h2">Default encryption</Header>}>
        <Box>Server-side encryption with Amazon S3 managed keys (SSE-S3)</Box>
      </Container>
      <SpaceBetween direction="horizontal" size="xs">
        <span data-console-target="create-bucket-submit">
          <Button
            variant="primary"
            loading={creating}
            disabled={
              !interactive || !name || !!error || creating || (!allBpaOn && !bpaAck)
            }
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
        <Button onClick={() => navigate("s3", "buckets")}>Cancel</Button>
      </SpaceBetween>
    </SpaceBetween>
  );
}

`;

s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(p, s);
console.log("S3 CreateBucket patched");

import { memo, useCallback, useMemo, useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Wizard from "@cloudscape-design/components/wizard";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Textarea from "@cloudscape-design/components/textarea";
import Toggle from "@cloudscape-design/components/toggle";
import Checkbox from "@cloudscape-design/components/checkbox";
import RadioGroup from "@cloudscape-design/components/radio-group";
import Select from "@cloudscape-design/components/select";
import Tabs from "@cloudscape-design/components/tabs";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import TextFilter from "@cloudscape-design/components/text-filter";
import Pagination from "@cloudscape-design/components/pagination";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import Tiles from "@cloudscape-design/components/tiles";
import Modal from "@cloudscape-design/components/modal";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import ProgressBar from "@cloudscape-design/components/progress-bar";
import Spinner from "@cloudscape-design/components/spinner";
import { useAccountStore } from "../store";
import { WIZARD_I18N } from "../ui";
import type { IamGroup, IamPolicy, IamRole, IamUser } from "../types";
import { IamPolicyPickerTable, trustPolicyJson } from "./iamShared";
import { IdentityProvidersPage } from "./iam/IdentityProvidersPage";

function downloadUserCredentialsCsv(user: IamUser, accountId: string) {
  const signInUrl = `https://${accountId}.signin.aws.amazon.com/console`;
  const csv = [
    "User name,Console sign-in URL,Password,Access key ID",
    `${user.username},${signInUrl},${user.password || ""},${user.access_keys[0]?.id || ""}`,
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${user.username}_credentials.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const IamService = memo(function IamService() {
  const page = useAccountStore((s) => s.route.page);
  if (page === "dashboard") return <IamDashboard />;
  if (page === "create-user") return <CreateUserWizard />;
  if (page === "create-user-success") return <CreateUserSuccess />;
  if (page === "user-detail") return <UserDetail />;
  if (page === "groups") return <GroupsPage />;
  if (page === "roles") return <RolesPage />;
  if (page === "create-role") return <CreateRoleWizard />;
  if (page === "policies") return <PoliciesPage />;
  if (page === "identity-providers") return <IdentityProvidersPage />;
  if (page === "account-settings") return <AccountSettingsPage />;
  if (page === "security-credentials") return <MySecurityCredentialsPage />;
  if (page === "organizations") return <OrganizationsStub />;
  return <UsersList />;
});

function IamDashboard() {
  const users = useAccountStore((s) => s.users);
  const groups = useAccountStore((s) => s.groups);
  const roles = useAccountStore((s) => s.roles);
  const navigate = useAccountStore((s) => s.navigate);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const mfaOff = users.filter((u) => !u.mfa).length;

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="IAM is a global service — not Region-scoped.">
        IAM Dashboard
      </Header>
      <Alert type={mfaOff ? "warning" : "success"}>
        {mfaOff
          ? `${mfaOff} IAM user(s) do not have MFA enabled.`
          : "All IAM users have MFA enabled."}
      </Alert>
      <ColumnLayout columns={4} variant="text-grid">
        {[
          { label: "Users", n: users.length, page: "users", target: "nav-users" },
          { label: "User groups", n: groups.length, page: "groups", target: "nav-groups" },
          { label: "Roles", n: roles.length, page: "roles", target: "nav-roles" },
          { label: "Customer managed policies", n: 1, page: "policies", target: "nav-policies" },
        ].map((c) => (
          <Box key={c.label}>
            <Box variant="awsui-key-label">{c.label}</Box>
            <Button
              variant="inline-link"
              disabled={!interactive}
              onClick={() => {
                markClick(c.target);
                navigate("iam", c.page);
              }}
            >
              <Box fontSize="display-l" fontWeight="light">
                {c.n}
              </Box>
            </Button>
          </Box>
        ))}
      </ColumnLayout>
      <Header
        variant="h2"
        actions={
          <span data-console-target="iam-create-user-btn" data-action-id="HIGHLIGHT:btn-create-user">
            <Button
              variant="primary"
              disabled={!interactive}
              onClick={() => {
                markClick("create-user");
                navigate("iam", "create-user");
              }}
            >
              Create user
            </Button>
          </span>
        }
      >
        IAM resources
      </Header>
    </SpaceBetween>
  );
}

function Stub({ title }: { title: string }) {
  return (
    <Box padding="l">
      <Header variant="h1">{title}</Header>
      <Box color="text-body-secondary" padding={{ top: "m" }}>
        You don&apos;t have any {title.toLowerCase()}.
      </Box>
    </Box>
  );
}

const EMPTY_USERS = (
  <Box textAlign="center" color="inherit">
    <b>No users</b>
    <Box variant="p" color="inherit" padding={{ top: "xxs" }}>
      Create an IAM user to get started.
    </Box>
  </Box>
);

const UsersList = memo(function UsersList() {
  const users = useAccountStore((s) => s.users);
  const groups = useAccountStore((s) => s.groups);
  const navigate = useAccountStore((s) => s.navigate);
  const markClick = useAccountStore((s) => s.markClick);
  const deleteUsers = useAccountStore((s) => s.deleteUsers);
  const addUserToGroup = useAccountStore((s) => s.addUserToGroup);
  const createAccessKey = useAccountStore((s) => s.createAccessKey);
  const setUserMfa = useAccountStore((s) => s.setUserMfa);
  const setUserConsoleAccess = useAccountStore((s) => s.setUserConsoleAccess);
  const setFlash = useAccountStore((s) => s.setFlash);
  const identity = useAccountStore((s) => s.identity);
  const interactive = useAccountStore((s) => s.interactive);
  const [selected, setSelected] = useState<IamUser[]>([]);
  const [filter, setFilter] = useState("");
  const [groupModal, setGroupModal] = useState(false);
  const [groupPick, setGroupPick] = useState<string | null>(null);
  const [mfaModal, setMfaModal] = useState(false);
  const [consoleModal, setConsoleModal] = useState(false);
  const [consoleEnabled, setConsoleEnabled] = useState(true);

  const items = useMemo(
    () =>
      users.filter(
        (u) =>
          !filter ||
          u.username.toLowerCase().includes(filter.toLowerCase()) ||
          u.groups.some((g) => g.toLowerCase().includes(filter.toLowerCase())) ||
          u.last_activity.toLowerCase().includes(filter.toLowerCase())
      ),
    [users, filter]
  );

  const onSelectionChange = useCallback(
    ({ detail }: { detail: { selectedItems: IamUser[] } }) => {
      setSelected((prev) => {
        const next = detail.selectedItems;
        if (
          prev.length === next.length &&
          prev.every((row, i) => row.username === next[i]?.username)
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
        header: "User name",
        cell: (u: IamUser) => (
          <span data-console-target={`user-${u.username}`}>
            <Button
              variant="inline-link"
              disabled={!interactive}
              onClick={() => {
                markClick(`user-${u.username}`);
                useAccountStore.getState().log("open_user", "iam_user", u.username, {});
                navigate("iam", "user-detail", u.username);
              }}
            >
              {u.username}
            </Button>
          </span>
        ),
        sortingField: "username",
      },
      {
        id: "groups",
        header: "Groups",
        cell: (u: IamUser) => String(u.groups.length),
      },
      {
        id: "activity",
        header: "Last activity",
        cell: (u: IamUser) => u.last_activity,
      },
      {
        id: "mfa",
        header: "MFA",
        cell: (u: IamUser) =>
          u.mfa ? (
            <StatusIndicator type="success">Enabled</StatusIndicator>
          ) : (
            <StatusIndicator type="stopped">Not enabled</StatusIndicator>
          ),
      },
      {
        id: "password_age",
        header: "Password age",
        cell: (u: IamUser) => u.password_age || "None",
      },
    ],
    [interactive, markClick, navigate]
  );

  const one = selected[0];

  return (
    <div data-console-target="iam-users-table">
      <Modal
        visible={groupModal}
        onDismiss={() => setGroupModal(false)}
        header="Add user to group"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setGroupModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!groupPick || selected.length === 0}
                onClick={() => {
                  if (!groupPick) return;
                  selected.forEach((u) => addUserToGroup(u.username, groupPick));
                  setGroupModal(false);
                  setGroupPick(null);
                  setSelected([]);
                }}
              >
                Add user to group
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="User group">
          <Select
            selectedOption={groupPick ? { label: groupPick, value: groupPick } : null}
            options={groups.map((g) => ({ label: g.name, value: g.name }))}
            onChange={({ detail }) => setGroupPick(detail.selectedOption.value || null)}
            placeholder="Choose a group"
          />
        </FormField>
        <Box padding={{ top: "s" }} color="text-body-secondary">
          {selected.length} user(s) selected
        </Box>
      </Modal>

      <Modal
        visible={mfaModal}
        onDismiss={() => setMfaModal(false)}
        header="Manage MFA device"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setMfaModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!one}
                onClick={() => {
                  if (!one) return;
                  setUserMfa(one.username, !one.mfa);
                  setMfaModal(false);
                }}
              >
                {one?.mfa ? "Remove MFA" : "Assign MFA device"}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Box>
            Multi-factor authentication (MFA) adds extra security for sign-in. User:{" "}
            <b>{one?.username || "—"}</b>
          </Box>
          <StatusIndicator type={one?.mfa ? "success" : "stopped"}>
            {one?.mfa ? "MFA enabled" : "MFA not enabled"}
          </StatusIndicator>
        </SpaceBetween>
      </Modal>

      <Modal
        visible={consoleModal}
        onDismiss={() => setConsoleModal(false)}
        header="Manage console access"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setConsoleModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!one}
                onClick={() => {
                  if (!one) return;
                  setUserConsoleAccess(one.username, consoleEnabled);
                  setConsoleModal(false);
                }}
              >
                Update
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="AWS Management Console access">
          <Toggle
            checked={consoleEnabled}
            onChange={({ detail }) => setConsoleEnabled(detail.checked)}
          >
            {consoleEnabled ? "Enabled" : "Disabled"}
          </Toggle>
        </FormField>
      </Modal>

      <Table
        variant="full-page"
        stickyHeader
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={onSelectionChange}
        filter={
          <TextFilter
            filteringText={filter}
            filteringPlaceholder="Filter users by name or property"
            onChange={({ detail }) => setFilter(detail.filteringText)}
          />
        }
        pagination={<Pagination currentPageIndex={1} pagesCount={1} />}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${users.length})`}
            description="An IAM user is an identity with long-term credentials in this AWS account."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <ButtonDropdown
                  disabled={!interactive || selected.length === 0}
                  items={[
                    { id: "delete", text: "Delete" },
                    {
                      id: "add-to-group",
                      text: "Add user to group",
                      disabled: groups.length === 0,
                    },
                    {
                      id: "console-access",
                      text: "Manage console access",
                      disabled: selected.length !== 1,
                    },
                    {
                      id: "access-key",
                      text: "Create access key",
                      disabled: selected.length !== 1,
                    },
                    {
                      id: "mfa",
                      text: "Manage MFA",
                      disabled: selected.length !== 1,
                    },
                    {
                      id: "download",
                      text: "Download credentials",
                      disabled: selected.length !== 1,
                    },
                  ]}
                  onItemClick={({ detail }) => {
                    if (detail.id === "delete") {
                      deleteUsers(selected.map((s) => s.username));
                      setSelected([]);
                      return;
                    }
                    if (detail.id === "add-to-group") {
                      setGroupModal(true);
                      return;
                    }
                    if (!one) return;
                    if (detail.id === "console-access") {
                      setConsoleEnabled(one.console_access);
                      setConsoleModal(true);
                      return;
                    }
                    if (detail.id === "access-key") {
                      createAccessKey(one.username);
                      return;
                    }
                    if (detail.id === "mfa") {
                      setMfaModal(true);
                      return;
                    }
                    if (detail.id === "download") {
                      downloadUserCredentialsCsv(one, identity.account_id);
                      setFlash({
                        type: "success",
                        content: `Credentials downloaded for ${one.username}.`,
                      });
                    }
                  }}
                >
                  Actions
                </ButtonDropdown>
                <span data-console-target="iam-create-user-btn" data-action-id="HIGHLIGHT:btn-create-user">
                  <Button
                    variant="primary"
                    disabled={!interactive}
                    nativeButtonAttributes={{
                      "data-console-target": "create-user",
                    }}
                    onClick={() => {
                      markClick("iam-create-user-btn");
                      markClick("create-user");
                      navigate("iam", "create-user");
                    }}
                  >
                    Create user
                  </Button>
                </span>
              </SpaceBetween>
            }
          >
            Users
          </Header>
        }
        columnDefinitions={columnDefinitions}
        items={items}
        empty={EMPTY_USERS}
      />
    </div>
  );
});

function CreateUserSuccess() {
  const username = useAccountStore((s) => s.route.selectedId);
  const user = useAccountStore((s) => s.users.find((u) => u.username === username));
  const navigate = useAccountStore((s) => s.navigate);
  const identity = useAccountStore((s) => s.identity);
  const [showPassword, setShowPassword] = useState(false);

  if (!user) {
    return (
      <Alert
        type="error"
        action={<Button onClick={() => navigate("iam", "users")}>Return to users list</Button>}
      >
        User not found.
      </Alert>
    );
  }

  const signInUrl = `https://${identity.account_id}.signin.aws.amazon.com/console`;
  const csv = [
    "User name,Console sign-in URL,Password",
    `${user.username},${signInUrl},${user.password || ""}`,
  ].join("\n");

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${user.username}_credentials.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SpaceBetween size="l">
      <Alert type="success" header="IAM user Account Created Successfully">
        Save these credentials. The password is shown only once.
      </Alert>
      <Header variant="h1">Create user — Success</Header>
      <Container>
        <Table
          columnDefinitions={[
            { id: "u", header: "User name", cell: () => user.username },
            {
              id: "url",
              header: "Console sign-in URL",
              cell: () => (
                <Button variant="inline-link" href={signInUrl} target="_blank" rel="noopener noreferrer">
                  {signInUrl}
                </Button>
              ),
            },
            {
              id: "pw",
              header: "Password",
              cell: () =>
                user.password ? (
                  <SpaceBetween direction="horizontal" size="xs">
                    <Box>
                      <span style={{ fontFamily: "ui-monospace, Consolas, monospace" }}>
                        {showPassword ? user.password : "••••••••••••"}
                      </span>
                    </Box>
                    <Button variant="inline-link" onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? "Hide" : "Show"}
                    </Button>
                  </SpaceBetween>
                ) : (
                  "— (no console password)"
                ),
            },
          ]}
          items={[{ id: "1" }]}
        />
      </Container>
      <SpaceBetween direction="horizontal" size="xs">
        <Button
          data-action-id="CLICK:btn-download-credentials"
          onClick={downloadCsv}
          disabled={!user.password}
        >
          Download .csv file
        </Button>
        <Button
          variant="primary"
          data-action-id="NAV:iam-users"
          onClick={() => navigate("iam", "users")}
        >
          Return to users list
        </Button>
      </SpaceBetween>
    </SpaceBetween>
  );
}

function CreateUserWizard() {
  const navigate = useAccountStore((s) => s.navigate);
  const createUser = useAccountStore((s) => s.createUser);
  const markClick = useAccountStore((s) => s.markClick);
  const interactive = useAccountStore((s) => s.interactive);
  const available = useAccountStore((s) => s.available_policies);
  const groups = useAccountStore((s) => s.groups);
  const users = useAccountStore((s) => s.users);

  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [consoleAccess, setConsoleAccess] = useState(false);
  const [identityType, setIdentityType] = useState("iam-user");
  const [customPassword, setCustomPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [mustReset, setMustReset] = useState(true);
  const [creating, setCreating] = useState(false);
  const [permMode, setPermMode] = useState("attach");
  const [group, setGroup] = useState<string | null>(null);
  const [copyFrom, setCopyFrom] = useState<string | null>(null);
  const [policyFilter, setPolicyFilter] = useState("");
  const [pickedPolicies, setPickedPolicies] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [createProgress, setCreateProgress] = useState(0);

  const resolvedPolicies = useMemo(() => {
    if (permMode === "attach") return pickedPolicies;
    if (permMode === "copy" && copyFrom) {
      return users.find((u) => u.username === copyFrom)?.policies || [];
    }
    if (permMode === "group" && group) {
      return groups.find((g) => g.name === group)?.policies || [];
    }
    return [];
  }, [permMode, pickedPolicies, copyFrom, group, users, groups]);

  return (
    <Wizard
      i18nStrings={WIZARD_I18N}
      activeStepIndex={step}
      submitButtonText={creating ? "Creating user…" : "Create user"}
      onNavigate={({ detail }) => {
        if (detail.requestedStepIndex > 0 && !username.trim()) {
          setError("User name is required.");
          return;
        }
        if (
          detail.requestedStepIndex > 0 &&
          !/^[A-Za-z0-9+=,.@_-]{1,64}$/.test(username.trim())
        ) {
          setError(
            "Provide up to 64 characters. Valid characters: A-Z, a-z, 0-9, and +=,.@-_."
          );
          return;
        }
        setError("");
        markClick(detail.requestedStepIndex > step ? "create-user-next" : "create-user-back");
        setStep(detail.requestedStepIndex);
      }}
      onCancel={() => navigate("iam", "users")}
      onSubmit={() => {
        if (!username.trim() || creating) return;
        markClick("create-user-submit");
        setCreating(true);
        setCreateProgress(8);
        const timer = window.setInterval(() => {
          setCreateProgress((p) => Math.min(p + 12, 92));
        }, 180);
        void createUser({
          username: username.trim(),
          console_access: consoleAccess,
          policies: permMode === "attach" ? pickedPolicies : resolvedPolicies,
          groups: permMode === "group" && group ? [group] : [],
          ...(customPassword && password ? { password } : {}),
        })
          .then(() => setCreateProgress(100))
          .finally(() => {
            window.clearInterval(timer);
            setCreating(false);
          });
      }}
      isLoadingNextStep={creating}
      steps={[
        {
          title: "Specify user details",
          description: "Specify a user name and optional AWS Management Console access.",
          content: (
            <SpaceBetween size="l">
              {error && <Alert type="error">{error}</Alert>}
              <Container header={<Header variant="h2">User details</Header>}>
                <FormField
                  label="User name"
                  description="Provide up to 64 characters. Valid characters: A-Z, a-z, 0-9, and +=,.@-_."
                >
                  <span data-console-target="iam-username-input" data-action-id="FILL:iam-user-name">
                    <Input
                      value={username}
                      disabled={!interactive}
                      onChange={({ detail }) => {
                        setUsername(detail.value);
                        useAccountStore.getState().setActionDraft({
                          "iam-user-name": detail.value,
                        });
                      }}
                      placeholder="e.g. jane.doe"
                    />
                  </span>
                </FormField>
              </Container>

              <Container header={<Header variant="h2">Console access — optional</Header>}>
                <SpaceBetween size="m">
                  <Checkbox
                    checked={consoleAccess}
                    disabled={!interactive}
                    onChange={({ detail }) => {
                      setConsoleAccess(detail.checked);
                      useAccountStore.getState().setActionDraft({
                        "iam-console-access": detail.checked,
                      });
                    }}
                  >
                    Provide user access to the AWS Management Console - optional
                  </Checkbox>

                  {consoleAccess && (
                    <SpaceBetween size="m">
                      <FormField label="User type">
                        <RadioGroup
                          value={identityType}
                          onChange={({ detail }) => setIdentityType(detail.value)}
                          items={[
                            {
                              value: "iam-user",
                              label: "I want to create an IAM user",
                            },
                            {
                              value: "identity-center",
                              label:
                                "Specify user identity in IAM Identity Center (Recommended)",
                              disabled: true,
                              description: "Use IAM Identity Center for workforce identities.",
                            },
                          ]}
                        />
                      </FormField>
                      <FormField label="Console password">
                        <RadioGroup
                          value={customPassword ? "custom" : "auto"}
                          onChange={({ detail }) =>
                            setCustomPassword(detail.value === "custom")
                          }
                          items={[
                            { value: "auto", label: "Autogenerated password" },
                            { value: "custom", label: "Custom password" },
                          ]}
                        />
                        {customPassword && (
                          <Box padding={{ top: "s" }}>
                            <Input
                              type="password"
                              value={password}
                              onChange={({ detail }) => setPassword(detail.value)}
                              placeholder="Custom password"
                            />
                          </Box>
                        )}
                      </FormField>
                      <Checkbox
                        checked={mustReset}
                        onChange={({ detail }) => setMustReset(detail.checked)}
                      >
                        Users must create a new password at next sign-in - recommended
                      </Checkbox>
                    </SpaceBetween>
                  )}

                  <Alert type="info">
                    Access keys are created from the user&apos;s Security credentials tab after the
                    user exists — not during Create user.
                  </Alert>
                </SpaceBetween>
              </Container>
            </SpaceBetween>
          ),
        },
        {
          title: "Set permissions",
          description:
            "Add the user to a group, copy permissions, or attach policies directly.",
          content: (
            <SpaceBetween size="l">
              <Container header={<Header variant="h2">Permissions options</Header>}>
                <Tiles
                  value={permMode}
                  onChange={({ detail }) => setPermMode(detail.value)}
                  items={[
                    {
                      value: "group",
                      label: "Add user to group",
                      description: "Best practice — manage permissions with groups.",
                    },
                    {
                      value: "copy",
                      label: "Copy permissions",
                      description: "Copy from an existing IAM user.",
                    },
                    {
                      value: "attach",
                      label: "Attach policies directly",
                      description: "Attach managed policies to this user.",
                    },
                  ]}
                />
              </Container>

              {permMode === "group" && (
                <Container header={<Header variant="h2">User groups</Header>}>
                  <FormField label="User group">
                    <Select
                      selectedOption={group ? { label: group, value: group } : null}
                      options={groups.map((g) => ({ label: g.name, value: g.name }))}
                      onChange={({ detail }) => setGroup(detail.selectedOption.value || null)}
                      placeholder="Choose a group"
                      empty="No groups yet — create one under User groups."
                    />
                  </FormField>
                </Container>
              )}
              {permMode === "copy" && (
                <Container header={<Header variant="h2">Copy permissions</Header>}>
                  <FormField label="Copy permissions from">
                    <Select
                      selectedOption={copyFrom ? { label: copyFrom, value: copyFrom } : null}
                      options={users.map((u) => ({ label: u.username, value: u.username }))}
                      onChange={({ detail }) =>
                        setCopyFrom(detail.selectedOption.value || null)
                      }
                      placeholder="Choose a user"
                    />
                  </FormField>
                </Container>
              )}
              {permMode === "attach" && (
                <Container header={<Header variant="h2">Permissions policies</Header>}>
                  <IamPolicyPickerTable
                    available={available}
                    selected={pickedPolicies}
                    onChange={setPickedPolicies}
                    filter={policyFilter}
                    onFilterChange={setPolicyFilter}
                    interactive={interactive}
                  />
                </Container>
              )}
            </SpaceBetween>
          ),
        },
        {
          title: "Review and create",
          content: (
            <SpaceBetween size="l">
              {creating && (
                <Container>
                  <SpaceBetween size="m">
                    <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                      <Spinner />
                      <Box>Creating IAM user…</Box>
                    </SpaceBetween>
                    <ProgressBar
                      value={createProgress}
                      label="Create user"
                      description={`${createProgress}%`}
                      status={createProgress >= 100 ? "success" : "in-progress"}
                    />
                  </SpaceBetween>
                </Container>
              )}
              <Container header={<Header variant="h2">Step 1: User details</Header>}>
                <ColumnLayout columns={2} variant="text-grid">
                  <div>
                    <Box variant="awsui-key-label">User name</Box>
                    <Box>{username || "—"}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Console access</Box>
                    <Box>{consoleAccess ? "Enabled" : "Disabled"}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Password reset required</Box>
                    <Box>{consoleAccess && mustReset ? "Yes" : "—"}</Box>
                  </div>
                </ColumnLayout>
              </Container>
              <Container header={<Header variant="h2">Step 2: Permissions</Header>}>
                <Box variant="awsui-key-label">Method</Box>
                <Box>
                  {permMode === "attach"
                    ? "Attach policies directly"
                    : permMode === "group"
                      ? `Add to group: ${group || "—"}`
                      : `Copy from: ${copyFrom || "—"}`}
                </Box>
                <Box padding={{ top: "s" }} variant="awsui-key-label">
                  Policies
                </Box>
                <Box>{resolvedPolicies.join(", ") || "None"}</Box>
              </Container>
            </SpaceBetween>
          ),
        },
      ]}
    />
  );
}

function UserDetail() {
  const username = useAccountStore((s) => s.route.selectedId);
  const user = useAccountStore((s) => s.users.find((u) => u.username === username));
  const groups = useAccountStore((s) => s.groups);
  const navigate = useAccountStore((s) => s.navigate);
  const attachPolicy = useAccountStore((s) => s.attachPolicy);
  const detachPolicy = useAccountStore((s) => s.detachPolicy);
  const addUserToGroup = useAccountStore((s) => s.addUserToGroup);
  const setUserMfa = useAccountStore((s) => s.setUserMfa);
  const createAccessKey = useAccountStore((s) => s.createAccessKey);
  const deleteAccessKey = useAccountStore((s) => s.deleteAccessKey);
  const available = useAccountStore((s) => s.available_policies);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const [policy, setPolicy] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [groupToAdd, setGroupToAdd] = useState<string | null>(null);

  if (!user) {
    return (
      <Alert type="error">
        User not found.{" "}
        <Button onClick={() => navigate("iam", "users")}>Back to users</Button>
      </Alert>
    );
  }

  const joinableGroups = groups.filter((g) => !user.groups.includes(g.name));

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description={`arn:aws:iam::${useAccountStore.getState().identity.account_id}:user/${user.username}`}
      >
        {user.username}
      </Header>
      <Tabs
        tabs={[
          {
            id: "permissions",
            label: "Permissions",
            content: (
              <SpaceBetween size="m">
                <Header
                  variant="h2"
                  actions={
                    <span data-console-target="add-permissions">
                      <Button
                        disabled={!interactive}
                        onClick={() => {
                          markClick("add-permissions");
                          setShowAttach(true);
                        }}
                      >
                        Add permissions
                      </Button>
                    </span>
                  }
                >
                  Permissions policies ({user.policies.length})
                </Header>
                {showAttach && (
                  <SpaceBetween size="s">
                    <FormField label="Attach AWS managed policy">
                      <span data-console-target="attach-policy-select">
                        <Select
                          selectedOption={
                            policy ? { label: policy, value: policy } : null
                          }
                          options={available.map((p) => ({ label: p, value: p }))}
                          onChange={({ detail }) =>
                            setPolicy(detail.selectedOption.value || null)
                          }
                          filteringType="auto"
                          placeholder="Select a policy"
                        />
                      </span>
                    </FormField>
                    <span data-console-target="attach-policy-submit">
                      <Button
                        variant="primary"
                        disabled={!interactive || !policy}
                        onClick={() => {
                          if (!policy) return;
                          markClick("attach-policy-submit");
                          attachPolicy(user.username, policy);
                          setShowAttach(false);
                          setPolicy(null);
                        }}
                      >
                        Attach policy
                      </Button>
                    </span>
                  </SpaceBetween>
                )}
                <Table
                  columnDefinitions={[
                    { id: "name", header: "Policy name", cell: (p) => p },
                    { id: "type", header: "Type", cell: () => "Managed policy" },
                    {
                      id: "actions",
                      header: "Actions",
                      cell: (p) => (
                        <Button
                          variant="inline-link"
                          disabled={!interactive}
                          onClick={() => detachPolicy(user.username, p)}
                        >
                          Detach
                        </Button>
                      ),
                    },
                  ]}
                  items={user.policies}
                  empty="No permissions policies attached."
                />
              </SpaceBetween>
            ),
          },
          {
            id: "groups",
            label: "Groups",
            content: (
              <SpaceBetween size="m">
                <Header
                  variant="h2"
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <Select
                        selectedOption={
                          groupToAdd
                            ? { label: groupToAdd, value: groupToAdd }
                            : null
                        }
                        options={joinableGroups.map((g) => ({
                          label: g.name,
                          value: g.name,
                        }))}
                        onChange={({ detail }) =>
                          setGroupToAdd(detail.selectedOption.value || null)
                        }
                        placeholder="Select a group"
                        disabled={!interactive || joinableGroups.length === 0}
                      />
                      <Button
                        disabled={!interactive || !groupToAdd}
                        onClick={() => {
                          if (!groupToAdd) return;
                          addUserToGroup(user.username, groupToAdd);
                          setGroupToAdd(null);
                        }}
                      >
                        Add to group
                      </Button>
                    </SpaceBetween>
                  }
                >
                  Groups ({user.groups.length})
                </Header>
                <Table
                  columnDefinitions={[
                    { id: "name", header: "Group name", cell: (g) => g },
                  ]}
                  items={user.groups}
                  empty="This user does not belong to any groups."
                />
              </SpaceBetween>
            ),
          },
          {
            id: "security",
            label: "Security credentials",
            content: (
              <SpaceBetween size="l">
                <Header variant="h2">
                  Console password — {user.console_access ? "Enabled" : "Disabled"}
                </Header>
                <Header
                  variant="h2"
                  actions={
                    <Button
                      disabled={!interactive}
                      onClick={() => setUserMfa(user.username, !user.mfa)}
                    >
                      {user.mfa ? "Disable MFA" : "Enable MFA"}
                    </Button>
                  }
                >
                  Multi-factor authentication (MFA) —{" "}
                  {user.mfa ? "Assigned" : "Not assigned"}
                </Header>
                <Table
                  header={
                    <Header
                      actions={
                        <Button
                          disabled={!interactive}
                          onClick={() => createAccessKey(user.username)}
                        >
                          Create access key
                        </Button>
                      }
                    >
                      Access keys ({user.access_keys.length})
                    </Header>
                  }
                  columnDefinitions={[
                    { id: "id", header: "Access key ID", cell: (k) => k.id },
                    { id: "status", header: "Status", cell: (k) => k.status },
                    { id: "created", header: "Created", cell: (k) => k.created },
                    {
                      id: "actions",
                      header: "Actions",
                      cell: (k) => (
                        <Button
                          variant="inline-link"
                          disabled={!interactive}
                          onClick={() => deleteAccessKey(user.username, k.id)}
                        >
                          Delete
                        </Button>
                      ),
                    },
                  ]}
                  items={user.access_keys}
                  empty="No access keys."
                />
              </SpaceBetween>
            ),
          },
          {
            id: "advisor",
            label: "Access Advisor",
            content: (
              <Box color="text-body-secondary">
                Service last accessed data is generating. Check again later for recommendations.
              </Box>
            ),
          },
          {
            id: "tags",
            label: "Tags",
            content: <Box color="text-body-secondary">No tags.</Box>,
          },
        ]}
      />
    </SpaceBetween>
  );
}

function GroupsPage() {
  const groups = useAccountStore((s) => s.groups);
  const createGroup = useAccountStore((s) => s.createGroup);
  const deleteGroups = useAccountStore((s) => s.deleteGroups);
  const attachPolicyToGroup = useAccountStore((s) => s.attachPolicyToGroup);
  const available = useAccountStore((s) => s.available_policies);
  const interactive = useAccountStore((s) => s.interactive);
  const [name, setName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<IamGroup[]>([]);
  const [attachModal, setAttachModal] = useState(false);
  const [policyPick, setPolicyPick] = useState<string | null>(null);

  return (
    <>
      <Modal
        visible={attachModal}
        onDismiss={() => setAttachModal(false)}
        header="Attach policy"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setAttachModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!policyPick || selected.length === 0}
                onClick={() => {
                  if (!policyPick) return;
                  selected.forEach((g) => attachPolicyToGroup(g.name, policyPick));
                  setAttachModal(false);
                  setPolicyPick(null);
                }}
              >
                Attach policy
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Policy">
          <Select
            selectedOption={
              policyPick ? { label: policyPick, value: policyPick } : null
            }
            options={available.map((p) => ({ label: p, value: p }))}
            onChange={({ detail }) =>
              setPolicyPick(detail.selectedOption.value || null)
            }
            filteringType="auto"
            placeholder="Select a policy"
          />
        </FormField>
      </Modal>

      {showCreate && (
        <Box padding={{ bottom: "m" }}>
          <SpaceBetween direction="horizontal" size="xs">
            <FormField label="Group name">
              <Input
                value={name}
                disabled={!interactive}
                onChange={({ detail }) => setName(detail.value)}
                placeholder="e.g. Developers"
              />
            </FormField>
            <Button
              variant="primary"
              disabled={!interactive || !name.trim()}
              onClick={() => {
                createGroup(name.trim());
                setName("");
                setShowCreate(false);
              }}
            >
              Create group
            </Button>
            <Button onClick={() => setShowCreate(false)}>Cancel</Button>
          </SpaceBetween>
        </Box>
      )}
      <Table
        variant="full-page"
        stickyHeader
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${groups.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <ButtonDropdown
                  disabled={!interactive || selected.length === 0}
                  items={[
                    { id: "delete", text: "Delete" },
                    {
                      id: "attach",
                      text: "Attach policy",
                      disabled: selected.length !== 1,
                    },
                  ]}
                  onItemClick={({ detail }) => {
                    if (detail.id === "delete") {
                      deleteGroups(selected.map((g) => g.name));
                      setSelected([]);
                    }
                    if (detail.id === "attach") setAttachModal(true);
                  }}
                >
                  Actions
                </ButtonDropdown>
                <Button
                  variant="primary"
                  disabled={!interactive}
                  onClick={() => setShowCreate(true)}
                >
                  Create group
                </Button>
              </SpaceBetween>
            }
          >
            User groups
          </Header>
        }
        columnDefinitions={[
          { id: "name", header: "Group name", cell: (g) => g.name },
          { id: "users", header: "Users", cell: (g) => String(g.members.length) },
          {
            id: "policies",
            header: "Attached policies",
            cell: (g) => g.policies.join(", ") || "—",
          },
        ]}
        items={groups}
        empty={
          <Box textAlign="center" color="inherit">
            <b>No user groups</b>
            <Box variant="p" color="inherit" padding={{ top: "xxs" }}>
              Create a group to manage permissions for multiple users.
            </Box>
          </Box>
        }
      />
    </>
  );
}

function RolesPage() {
  const roles = useAccountStore((s) => s.roles);
  const navigate = useAccountStore((s) => s.navigate);
  const deleteRoles = useAccountStore((s) => s.deleteRoles);
  const attachPolicyToRole = useAccountStore((s) => s.attachPolicyToRole);
  const available = useAccountStore((s) => s.available_policies);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const [selected, setSelected] = useState<IamRole[]>([]);
  const [filter, setFilter] = useState("");
  const [attachModal, setAttachModal] = useState(false);
  const [policyPick, setPolicyPick] = useState<string | null>(null);

  const items = roles.filter(
    (r) =>
      !filter ||
      r.name.toLowerCase().includes(filter.toLowerCase()) ||
      r.trusted.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div data-console-target="iam-roles-table">
      <Modal
        visible={attachModal}
        onDismiss={() => setAttachModal(false)}
        header="Attach policy"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setAttachModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!policyPick || selected.length !== 1}
                onClick={() => {
                  if (!policyPick || !selected[0]) return;
                  attachPolicyToRole(selected[0].name, policyPick);
                  setAttachModal(false);
                  setPolicyPick(null);
                }}
              >
                Attach policy
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Policy">
          <Select
            selectedOption={
              policyPick ? { label: policyPick, value: policyPick } : null
            }
            options={available.map((p) => ({ label: p, value: p }))}
            onChange={({ detail }) =>
              setPolicyPick(detail.selectedOption.value || null)
            }
            filteringType="auto"
            placeholder="Select a policy"
          />
        </FormField>
      </Modal>

      <Table
        variant="full-page"
        stickyHeader
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        filter={
          <TextFilter
            filteringText={filter}
            filteringPlaceholder="Filter roles by name or trusted entity"
            onChange={({ detail }) => setFilter(detail.filteringText)}
          />
        }
        pagination={<Pagination currentPageIndex={1} pagesCount={1} />}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${roles.length})`}
            description="An IAM role is an identity you can assume to gain temporary permissions."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <ButtonDropdown
                  disabled={!interactive || selected.length === 0}
                  items={[
                    { id: "delete", text: "Delete" },
                    {
                      id: "attach",
                      text: "Attach policy",
                      disabled: selected.length !== 1,
                    },
                  ]}
                  onItemClick={({ detail }) => {
                    if (detail.id === "delete") {
                      deleteRoles(selected.map((r) => r.name));
                      setSelected([]);
                    }
                    if (detail.id === "attach") setAttachModal(true);
                  }}
                >
                  Actions
                </ButtonDropdown>
                <Button
                  variant="primary"
                  disabled={!interactive}
                  onClick={() => {
                    markClick("create-role");
                    navigate("iam", "create-role");
                  }}
                >
                  Create role
                </Button>
              </SpaceBetween>
            }
          >
            Roles
          </Header>
        }
        columnDefinitions={[
          {
            id: "name",
            header: "Role name",
            cell: (r) => (
              <Button variant="inline-link" disabled={!interactive}>
                {r.name}
              </Button>
            ),
          },
          {
            id: "trusted",
            header: "Trusted entities",
            cell: (r) => r.trusted,
          },
          {
            id: "activity",
            header: "Last activity",
            cell: (r) => r.last_activity,
          },
          {
            id: "session",
            header: "Maximum session duration",
            cell: (r) => r.max_session_duration || "1 hour",
          },
        ]}
        items={items}
        empty={
          <Box textAlign="center" color="inherit">
            <b>No roles</b>
            <Box variant="p" color="inherit" padding={{ top: "xxs" }}>
              Create a role so an AWS service can assume permissions.
            </Box>
          </Box>
        }
      />
    </div>
  );
}

function CreateRoleWizard() {
  const navigate = useAccountStore((s) => s.navigate);
  const createRole = useAccountStore((s) => s.createRole);
  const available = useAccountStore((s) => s.available_policies);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);

  const [step, setStep] = useState(0);
  const [entityType, setEntityType] = useState("aws-service");
  const [useCase, setUseCase] = useState("ec2.amazonaws.com");
  const [accountId, setAccountId] = useState("");
  const [oidcAudience, setOidcAudience] = useState("sts.amazonaws.com");
  const [samlProvider, setSamlProvider] = useState("");
  const [customTrust, setCustomTrust] = useState(
    '{\n  "Version": "2012-10-17",\n  "Statement": [{\n    "Effect": "Allow",\n    "Principal": { "AWS": "*" },\n    "Action": "sts:AssumeRole"\n  }]\n}'
  );
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [policyFilter, setPolicyFilter] = useState("");
  const [pickedPolicies, setPickedPolicies] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const identityProviders = useAccountStore((s) => s.identity_providers);
  const thisAccount = useAccountStore((s) => s.identity.account_id);

  const servicePrincipal = (() => {
    if (entityType === "aws-service") return useCase;
    if (entityType === "aws-account") {
      const acct = accountId.replace(/\D/g, "") || thisAccount;
      return `arn:aws:iam::${acct}:root`;
    }
    if (entityType === "web-identity") return `oidc:${oidcAudience || "sts.amazonaws.com"}`;
    if (entityType === "saml") return `saml:${samlProvider || "provider"}`;
    return "custom";
  })();

  return (
    <Wizard
      i18nStrings={WIZARD_I18N}
      activeStepIndex={step}
      submitButtonText={creating ? "Creating role…" : "Create role"}
      isLoadingNextStep={creating}
      onCancel={() => navigate("iam", "roles")}
      onNavigate={({ detail }) => {
        setError("");
        markClick(detail.requestedStepIndex > step ? "create-role-next" : "create-role-back");
        setStep(detail.requestedStepIndex);
      }}
      onSubmit={() => {
        if (!roleName.trim() || creating) return;
        if (!/^[A-Za-z0-9+=,.@_-]{1,64}$/.test(roleName.trim())) {
          setError(
            "Provide up to 64 characters. Valid characters: A-Z, a-z, 0-9, and +=,.@-_."
          );
          return;
        }
        markClick("create-role-submit");
        setCreating(true);
        void createRole(roleName.trim(), servicePrincipal, pickedPolicies, {
          description: description.trim(),
          max_session_duration: "1 hour",
        }).finally(() => setCreating(false));
      }}
      steps={[
        {
          title: "Select trusted entity",
          description: "Choose who can assume this role.",
          content: (
            <SpaceBetween size="l">
              <Container header={<Header variant="h2">Trusted entity type</Header>}>
                <Tiles
                  value={entityType}
                  columns={2}
                  onChange={({ detail }) => setEntityType(detail.value)}
                  items={[
                    {
                      value: "aws-service",
                      label: "AWS service",
                      description: "Allow an AWS service to perform actions in this account.",
                    },
                    {
                      value: "aws-account",
                      label: "AWS account",
                      description: "Allow entities in this or another AWS account to assume this role.",
                    },
                    {
                      value: "web-identity",
                      label: "Web identity",
                      description: "Allow users federated with an OpenID Connect provider.",
                    },
                    {
                      value: "saml",
                      label: "SAML 2.0 federation",
                      description: "Allow users federated with a SAML identity provider.",
                    },
                    {
                      value: "custom",
                      label: "Custom trust policy",
                      description: "Provide your own trust policy JSON.",
                    },
                  ]}
                />
              </Container>

              {entityType === "aws-service" && (
                <Container header={<Header variant="h2">Use case</Header>}>
                  <FormField
                    label="Service or use case"
                    description="Common daily choices for instance and serverless workloads."
                  >
                    <RadioGroup
                      value={useCase}
                      onChange={({ detail }) => setUseCase(detail.value)}
                      items={[
                        {
                          value: "ec2.amazonaws.com",
                          label: "EC2",
                          description: "Allows EC2 instances to call AWS services on your behalf.",
                        },
                        {
                          value: "lambda.amazonaws.com",
                          label: "Lambda",
                          description: "Allows Lambda functions to access AWS services.",
                        },
                        {
                          value: "ecs-tasks.amazonaws.com",
                          label: "Elastic Container Service — Task",
                          description: "Allows ECS tasks to call AWS services.",
                        },
                        {
                          value: "rds.amazonaws.com",
                          label: "RDS",
                          description: "Allows RDS to access other AWS services.",
                        },
                      ]}
                    />
                  </FormField>
                </Container>
              )}

              {entityType === "aws-account" && (
                <Container header={<Header variant="h2">An AWS account</Header>}>
                  <FormField
                    label="Account ID"
                    description="12-digit account ID. Leave blank to trust this account."
                  >
                    <Input
                      value={accountId}
                      onChange={({ detail }) => setAccountId(detail.value)}
                      placeholder={thisAccount}
                    />
                  </FormField>
                </Container>
              )}

              {entityType === "web-identity" && (
                <Container header={<Header variant="h2">Web identity</Header>}>
                  <FormField label="Audience">
                    <Input
                      value={oidcAudience}
                      onChange={({ detail }) => setOidcAudience(detail.value)}
                    />
                  </FormField>
                </Container>
              )}

              {entityType === "saml" && (
                <Container header={<Header variant="h2">SAML 2.0 federation</Header>}>
                  <FormField label="SAML provider">
                    <Select
                      selectedOption={
                        samlProvider
                          ? { label: samlProvider, value: samlProvider }
                          : { label: "Choose a provider", value: "" }
                      }
                      options={
                        identityProviders.filter((p) => p.type === "SAML").length
                          ? identityProviders
                              .filter((p) => p.type === "SAML")
                              .map((p) => ({ label: p.name, value: p.name }))
                          : [{ label: "Add a SAML provider first", value: "" }]
                      }
                      onChange={({ detail }) =>
                        setSamlProvider(detail.selectedOption.value || "")
                      }
                    />
                  </FormField>
                </Container>
              )}

              {entityType === "custom" && (
                <Container header={<Header variant="h2">Custom trust policy</Header>}>
                  <FormField label="Trust policy JSON">
                    <Textarea
                      value={customTrust}
                      onChange={({ detail }) => setCustomTrust(detail.value)}
                      rows={10}
                    />
                  </FormField>
                </Container>
              )}
            </SpaceBetween>
          ),
        },
        {
          title: "Add permissions",
          description: "Attach managed policies that define what this role can do.",
          content: (
            <Container header={<Header variant="h2">Add permissions</Header>}>
              <IamPolicyPickerTable
                available={available}
                selected={pickedPolicies}
                onChange={setPickedPolicies}
                filter={policyFilter}
                onFilterChange={setPolicyFilter}
                interactive={interactive}
              />
            </Container>
          ),
        },
        {
          title: "Name, review, and create",
          content: (
            <SpaceBetween size="l">
              {error && <Alert type="error">{error}</Alert>}
              <Container header={<Header variant="h2">Role details</Header>}>
                <SpaceBetween size="m">
                  <FormField
                    label="Role name"
                    description="Maximum 64 characters. Valid: A-Z, a-z, 0-9, and +=,.@-_."
                  >
                    <Input
                      value={roleName}
                      disabled={!interactive}
                      onChange={({ detail }) => setRoleName(detail.value)}
                      placeholder="e.g. EC2-S3-ReadOnly"
                    />
                  </FormField>
                  <FormField label="Description - optional">
                    <Input
                      value={description}
                      disabled={!interactive}
                      onChange={({ detail }) => setDescription(detail.value)}
                      placeholder="Allows EC2 to read from S3"
                    />
                  </FormField>
                </SpaceBetween>
              </Container>

              <Container header={<Header variant="h2">Step 1: Select trusted entities</Header>}>
                <Box variant="awsui-key-label">Trust policy</Box>
                <Box
                  margin={{ top: "xs" }}
                  padding="s"
                  fontSize="body-s"
                  color="text-body-secondary"
                >
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      fontFamily: "ui-monospace, Consolas, monospace",
                    }}
                  >
                    {trustPolicyJson(servicePrincipal)}
                  </pre>
                </Box>
              </Container>

              <Container header={<Header variant="h2">Step 2: Add permissions</Header>}>
                <Box>
                  {pickedPolicies.length
                    ? pickedPolicies.join(", ")
                    : "No policies selected — you can attach later."}
                </Box>
              </Container>
            </SpaceBetween>
          ),
        },
      ]}
    />
  );
}

function PoliciesPage() {
  const policies = useAccountStore((s) => s.policies);
  const createPolicy = useAccountStore((s) => s.createPolicy);
  const deletePolicies = useAccountStore((s) => s.deletePolicies);
  const interactive = useAccountStore((s) => s.interactive);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<IamPolicy[]>([]);
  const items =
    filter === "all"
      ? policies
      : policies.filter((p) =>
          filter === "aws"
            ? p.type === "AWS managed"
            : filter === "customer"
              ? p.type === "Customer managed"
              : p.type === "Job function"
        );
  return (
    <>
      {showCreate && (
        <Box padding={{ bottom: "m" }}>
          <SpaceBetween direction="horizontal" size="xs">
            <FormField label="Policy name">
              <Input
                value={name}
                disabled={!interactive}
                onChange={({ detail }) => setName(detail.value)}
                placeholder="e.g. CustomS3ReadOnly"
              />
            </FormField>
            <Button
              variant="primary"
              disabled={!interactive || !name.trim()}
              onClick={() => {
                createPolicy(name.trim());
                setName("");
                setShowCreate(false);
              }}
            >
              Create policy
            </Button>
            <Button onClick={() => setShowCreate(false)}>Cancel</Button>
          </SpaceBetween>
        </Box>
      )}
      <Table
        variant="full-page"
        stickyHeader
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${items.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  disabled={
                    !interactive ||
                    selected.length === 0 ||
                    selected.some((p) => p.type === "AWS managed")
                  }
                  onClick={() => {
                    deletePolicies(selected.map((p) => p.name));
                    setSelected([]);
                  }}
                >
                  Delete
                </Button>
                <Button
                  variant="primary"
                  disabled={!interactive}
                  onClick={() => setShowCreate(true)}
                >
                  Create policy
                </Button>
              </SpaceBetween>
            }
          >
            Policies
          </Header>
        }
        filter={
          <Select
            selectedOption={{
              label:
                filter === "aws"
                  ? "AWS managed"
                  : filter === "customer"
                    ? "Customer managed"
                    : filter === "job"
                      ? "Job function"
                      : "All types",
              value: filter,
            }}
            options={[
              { label: "All types", value: "all" },
              { label: "AWS managed", value: "aws" },
              { label: "Customer managed", value: "customer" },
              { label: "Job function", value: "job" },
            ]}
            onChange={({ detail }) => setFilter(detail.selectedOption.value || "all")}
          />
        }
        columnDefinitions={[
          { id: "name", header: "Policy name", cell: (p) => p.name },
          { id: "type", header: "Type", cell: (p) => p.type },
          { id: "attached", header: "Attached entities", cell: (p) => String(p.attached) },
          { id: "created", header: "Created", cell: (p) => p.created },
        ]}
        items={items}
      />
    </>
  );
}

function AccountSettingsPage() {
  const interactive = useAccountStore((s) => s.interactive);
  const [minLength, setMinLength] = useState(true);
  const [requireUpper, setRequireUpper] = useState(true);
  const [requireLower, setRequireLower] = useState(true);
  const [requireNumber, setRequireNumber] = useState(true);
  const [requireSymbol, setRequireSymbol] = useState(false);
  const [expirePasswords, setExpirePasswords] = useState(false);

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="Password policy for IAM users in this account.">
        Account settings
      </Header>
      <SpaceBetween size="m">
        <Toggle
          checked={minLength}
          disabled={!interactive}
          onChange={({ detail }) => setMinLength(detail.checked)}
        >
          Require a minimum password length of 8 characters
        </Toggle>
        <Toggle
          checked={requireUpper}
          disabled={!interactive}
          onChange={({ detail }) => setRequireUpper(detail.checked)}
        >
          Require at least one uppercase letter
        </Toggle>
        <Toggle
          checked={requireLower}
          disabled={!interactive}
          onChange={({ detail }) => setRequireLower(detail.checked)}
        >
          Require at least one lowercase letter
        </Toggle>
        <Toggle
          checked={requireNumber}
          disabled={!interactive}
          onChange={({ detail }) => setRequireNumber(detail.checked)}
        >
          Require at least one number
        </Toggle>
        <Toggle
          checked={requireSymbol}
          disabled={!interactive}
          onChange={({ detail }) => setRequireSymbol(detail.checked)}
        >
          Require at least one non-alphanumeric character
        </Toggle>
        <Toggle
          checked={expirePasswords}
          disabled={!interactive}
          onChange={({ detail }) => setExpirePasswords(detail.checked)}
        >
          Enable password expiration
        </Toggle>
        <Button
          variant="primary"
          disabled={!interactive}
          onClick={() =>
            useAccountStore.setState({
              flash: { type: "success", content: "Password policy saved." },
            })
          }
        >
          Save changes
        </Button>
      </SpaceBetween>
    </SpaceBetween>
  );
}

function MySecurityCredentialsPage() {
  const identity = useAccountStore((s) => s.identity);
  const users = useAccountStore((s) => s.users);
  const createAccessKey = useAccountStore((s) => s.createAccessKey);
  const interactive = useAccountStore((s) => s.interactive);
  const me =
    users.find((u) => u.username === identity.iam_username) || users[0];
  const [revealed, setRevealed] = useState<{
    accessKeyId: string;
    secret: string;
  } | null>(null);

  return (
    <div data-console-target="iam-security-credentials">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description={`Account ${identity.account_id} · ${identity.iam_username}`}
        >
          My security credentials
        </Header>
        <Alert type="info">
          Access keys provide long-term credentials for the AWS CLI, SDKs, and other development
          tools. After you create an access key, you can view the secret access key only once.
        </Alert>
        <Container
          header={
            <Header
              variant="h2"
              counter={`(${me?.access_keys.length ?? 0})`}
              actions={
                <Button
                  variant="primary"
                  disabled={!interactive || !me}
                  onClick={() => {
                    if (!me) return;
                    const before = me.access_keys.length;
                    createAccessKey(me.username);
                    const updated = useAccountStore
                      .getState()
                      .users.find((u) => u.username === me.username);
                    const newest = updated?.access_keys[updated.access_keys.length - 1];
                    if (newest && (updated?.access_keys.length || 0) > before) {
                      setRevealed({
                        accessKeyId: newest.id,
                        secret: `wJalrXUtnFEMI/K7MDENG/bPxRfiCY${newest.id.slice(-8)}`,
                      });
                    }
                  }}
                >
                  Create access key
                </Button>
              }
            >
              Access keys
            </Header>
          }
        >
          <Table
            trackBy="id"
            columnDefinitions={[
              { id: "id", header: "Access key ID", cell: (k) => k.id },
              {
                id: "created",
                header: "Created",
                cell: (k) => k.created || "—",
              },
              {
                id: "status",
                header: "Status",
                cell: (k) => k.status || "Active",
              },
            ]}
            items={me?.access_keys || []}
            empty={
              <Box textAlign="center" padding="l" color="text-body-secondary">
                You don&apos;t have any access keys.
              </Box>
            }
          />
        </Container>
        <Modal
          visible={!!revealed}
          onDismiss={() => setRevealed(null)}
          header="Retrieve access keys"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  onClick={() => {
                    if (!revealed) return;
                    const csv = `Access key ID,Secret access key\n${revealed.accessKeyId},${revealed.secret}\n`;
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${revealed.accessKeyId}_credentials.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download .csv file
                </Button>
                <Button variant="primary" onClick={() => setRevealed(null)}>
                  Done
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          {revealed && (
            <SpaceBetween size="m">
              <Alert type="warning">
                This is the only time you can view or download the secret access key. You cannot
                recover it later.
              </Alert>
              <FormField label="Access key ID">
                <Input value={revealed.accessKeyId} readOnly />
              </FormField>
              <FormField label="Secret access key">
                <Input value={revealed.secret} readOnly />
              </FormField>
            </SpaceBetween>
          )}
        </Modal>
      </SpaceBetween>
    </div>
  );
}

function OrganizationsStub() {
  return (
    <SpaceBetween size="l" data-console-target="aws-organizations">
      <Header
        variant="h1"
        description="Global"
        actions={
          <Button variant="primary" disabled>
            Create an organization
          </Button>
        }
      >
        AWS Organizations
      </Header>
      <Alert type="info">
        AWS Organizations helps you centrally manage and govern your environment as you grow and
        scale your AWS resources.
      </Alert>
      <Container>
        <Box textAlign="center" padding={{ vertical: "xxl" }}>
          <SpaceBetween size="s">
            <Box fontSize="heading-m" fontWeight="bold">
              This account is not part of an organization
            </Box>
            <Box color="text-body-secondary">
              Create an organization to centrally manage billing, control access, compliance, and
              security across multiple AWS accounts.
            </Box>
            <Button variant="primary" disabled>
              Create an organization
            </Button>
          </SpaceBetween>
        </Box>
      </Container>
      <ColumnLayout columns={3} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">Organization ID</Box>
          <Box>—</Box>
        </div>
        <div>
          <Box variant="awsui-key-label">Feature set</Box>
          <Box>—</Box>
        </div>
        <div>
          <Box variant="awsui-key-label">Management account</Box>
          <Box>—</Box>
        </div>
      </ColumnLayout>
    </SpaceBetween>
  );
}

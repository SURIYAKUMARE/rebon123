import { useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import RadioGroup from "@cloudscape-design/components/radio-group";
import { useAccountStore } from "../../store";

export function IdentityProvidersPage() {
  const providers = useAccountStore((s) => s.identity_providers);
  const addIdentityProvider = useAccountStore((s) => s.addIdentityProvider);
  const deleteIdentityProvider = useAccountStore((s) => s.deleteIdentityProvider);
  const accountId = useAccountStore((s) => s.identity.account_id);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("SAML");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [audience, setAudience] = useState("");
  const [selected, setSelected] = useState<typeof providers>([]);

  return (
    <div data-console-target="iam-identity-providers">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${providers.length})`}
          description="IAM identity providers establish trust between your AWS account and an external identity provider (IdP)."
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                disabled={!selected.length}
                onClick={() => {
                  for (const p of selected) deleteIdentityProvider(p.name);
                  setSelected([]);
                }}
              >
                Delete
              </Button>
              <Button variant="primary" onClick={() => setOpen(true)}>
                Add provider
              </Button>
            </SpaceBetween>
          }
        >
          Identity providers
        </Header>
        <Table
          trackBy="name"
          selectionType="multi"
          selectedItems={selected}
          onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
          columnDefinitions={[
            { id: "name", header: "Provider", cell: (p) => p.name },
            { id: "type", header: "Type", cell: (p) => p.type },
            { id: "created", header: "Creation time", cell: (p) => p.created },
            {
              id: "arn",
              header: "ARN",
              cell: (p) =>
                p.type === "SAML"
                  ? `arn:aws:iam::${accountId}:saml-provider/${p.name}`
                  : `arn:aws:iam::${accountId}:oidc-provider/${(p.provider_url || "").replace(/^https?:\/\//, "")}`,
            },
          ]}
          items={providers}
          empty={
            <Box textAlign="center" padding="l">
              <b>No identity providers</b>
              <Box variant="p" color="inherit" padding={{ top: "xxs" }}>
                Add a SAML 2.0 or OpenID Connect provider to enable federation.
              </Box>
            </Box>
          }
        />
      </SpaceBetween>

      <Modal
        visible={open}
        onDismiss={() => setOpen(false)}
        header="Add an identity provider"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!name.trim() || (type === "OpenID Connect" && !/^https:\/\//i.test(url))}
                onClick={() => {
                  addIdentityProvider({
                    name: name.trim(),
                    type: type === "SAML" ? "SAML" : "OpenID Connect",
                    provider_url: type === "OpenID Connect" ? url.trim() : undefined,
                    audience: audience.trim() || undefined,
                  });
                  setOpen(false);
                  setName("");
                  setUrl("https://");
                  setAudience("");
                }}
              >
                Add provider
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Provider type">
            <RadioGroup
              value={type}
              onChange={({ detail }) => setType(detail.value)}
              items={[
                { value: "SAML", label: "SAML" },
                { value: "OpenID Connect", label: "OpenID Connect" },
              ]}
            />
          </FormField>
          <FormField label="Provider name">
            <Input value={name} onChange={({ detail }) => setName(detail.value)} />
          </FormField>
          {type === "OpenID Connect" && (
            <>
              <FormField label="Provider URL" description="Must begin with https://">
                <Input value={url} onChange={({ detail }) => setUrl(detail.value)} />
              </FormField>
              <FormField label="Audience — optional">
                <Input value={audience} onChange={({ detail }) => setAudience(detail.value)} />
              </FormField>
            </>
          )}
          {type === "SAML" && (
            <FormField
              label="Metadata document"
              description="Upload a metadata XML document from your identity provider."
            >
              <input type="file" accept=".xml,text/xml" />
            </FormField>
          )}
        </SpaceBetween>
      </Modal>
    </div>
  );
}

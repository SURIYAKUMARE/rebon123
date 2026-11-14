/**
 * Cloudscape-only resource list shell for secondary console pages.
 * Matches AWS empty-table chrome: Header actions + Table + filter.
 */
import { useMemo, useState, type ReactNode } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Input from "@cloudscape-design/components/input";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Spinner from "@cloudscape-design/components/spinner";
import { useAccountStore } from "./store";

export type ResourceColumn<T> = {
  id: string;
  header: string;
  cell: (item: T) => ReactNode;
};

type ActionItem = {
  id: string;
  text: string;
  disabled?: boolean;
};

type Props<T extends { id: string } | { name: string } | Record<string, unknown>> = {
  title: string;
  description?: string;
  counter?: number;
  items: T[];
  trackBy: keyof T & string;
  columns: ResourceColumn<T>[];
  filterPlaceholder?: string;
  filterFn?: (item: T, query: string) => boolean;
  primaryAction?: { label: string; onClick: () => void };
  selectionActions?: ActionItem[];
  onSelectionAction?: (id: string, selected: T[]) => void;
  createModal?: {
    title: string;
    visible: boolean;
    onDismiss: () => void;
    onSubmit: () => void | Promise<void>;
    submitLabel?: string;
    submitting?: boolean;
    submitDisabled?: boolean;
    children: ReactNode;
  };
  emptyTitle?: string;
  emptyDescription?: string;
  selectionType?: "single" | "multi";
};

export function ResourceTableShell<
  T extends { id?: string; name?: string } & Record<string, unknown>,
>({
  title,
  description,
  counter,
  items,
  trackBy,
  columns,
  filterPlaceholder = "Find resources",
  filterFn,
  primaryAction,
  selectionActions,
  onSelectionAction,
  createModal,
  emptyTitle,
  emptyDescription,
  selectionType = "multi",
}: Props<T>) {
  const interactive = useAccountStore((s) => s.interactive);
  const [selected, setSelected] = useState<T[]>([]);
  const [filter, setFilter] = useState("");
  const [tick, setTick] = useState(0);

  const visible = useMemo(() => {
    if (!filter.trim()) return items;
    const q = filter.toLowerCase();
    if (filterFn) return items.filter((i) => filterFn(i, q));
    return items.filter((i) => JSON.stringify(i).toLowerCase().includes(q));
  }, [items, filter, filterFn]);

  return (
    <>
      <Table
        variant="full-page"
        stickyHeader
        selectionType={selectionType}
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        trackBy={trackBy}
        filter={
          <SpaceBetween direction="horizontal" size="xs">
            <Input
              value={filter}
              onChange={({ detail }) => setFilter(detail.value)}
              placeholder={filterPlaceholder}
              type="search"
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
            counter={`(${counter ?? items.length})`}
            description={description}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                {selectionActions && selectionActions.length > 0 ? (
                  <ButtonDropdown
                    disabled={!interactive || selected.length === 0}
                    items={selectionActions}
                    onItemClick={({ detail }) =>
                      onSelectionAction?.(detail.id, selected)
                    }
                  >
                    Actions
                  </ButtonDropdown>
                ) : null}
                {primaryAction ? (
                  <Button
                    variant="primary"
                    disabled={!interactive}
                    onClick={primaryAction.onClick}
                  >
                    {primaryAction.label}
                  </Button>
                ) : null}
              </SpaceBetween>
            }
          >
            {title}
          </Header>
        }
        columnDefinitions={columns.map((c) => ({
          id: c.id,
          header: c.header,
          cell: c.cell,
        }))}
        items={visible}
        empty={
          <Box textAlign="center" padding="l" color="inherit">
            <SpaceBetween size="xxs">
              <Box variant="strong">{emptyTitle || `No ${title.toLowerCase()}`}</Box>
              <Box variant="p" color="text-body-secondary">
                {emptyDescription ||
                  `Get started by creating ${title.toLowerCase()} in this Region.`}
              </Box>
              {primaryAction ? (
                <Button
                  variant="primary"
                  disabled={!interactive}
                  onClick={primaryAction.onClick}
                >
                  {primaryAction.label}
                </Button>
              ) : null}
            </SpaceBetween>
          </Box>
        }
      />
      {createModal ? (
        <Modal
          visible={createModal.visible}
          onDismiss={createModal.onDismiss}
          header={createModal.title}
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="link" onClick={createModal.onDismiss}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={
                    !interactive ||
                    createModal.submitting ||
                    createModal.submitDisabled
                  }
                  onClick={() => void createModal.onSubmit()}
                >
                  {createModal.submitting ? (
                    <Spinner />
                  ) : (
                    createModal.submitLabel || "Create"
                  )}
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <SpaceBetween size="m">{createModal.children}</SpaceBetween>
        </Modal>
      ) : null}
    </>
  );
}

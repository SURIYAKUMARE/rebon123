import { useMemo, useState } from "react";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import Button from "@cloudscape-design/components/button";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Select from "@cloudscape-design/components/select";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Wizard from "@cloudscape-design/components/wizard";
import RadioGroup from "@cloudscape-design/components/radio-group";
import BarChart from "@cloudscape-design/components/bar-chart";
import LineChart from "@cloudscape-design/components/line-chart";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import Checkbox from "@cloudscape-design/components/checkbox";
import ProgressBar from "@cloudscape-design/components/progress-bar";
import Alert from "@cloudscape-design/components/alert";
import Modal from "@cloudscape-design/components/modal";
import Toggle from "@cloudscape-design/components/toggle";
import Spinner from "@cloudscape-design/components/spinner";
import { useAccountStore } from "../store";
import { WIZARD_I18N } from "../ui";
import type { Budget } from "../types";
import { CostAllocationTagsPage } from "./billing/CostAllocationTagsPage";

export function BillingService() {
  const page = useAccountStore((s) => s.route.page);
  if (page === "budgets") return <Budgets />;
  if (page === "create-budget") return <CreateBudget />;
  if (page === "cost-explorer") return <CostExplorer />;
  if (page === "bills") return <BillsPage />;
  if (page === "cost-allocation-tags") return <CostAllocationTagsPage />;
  if (page === "savings-plans") return <SavingsPlansPage />;
  if (page === "billing-preferences") return <BillingPreferencesPage />;
  if (page === "payment-methods") return <PaymentMethodsPage />;
  return <BillingDashboard />;
}

function BillsPage() {
  const rows = useAccountStore((s) => s.cost_rows);
  const identity = useAccountStore((s) => s.identity);
  const total = rows.reduce((s, r) => s + r.this_month, 0);
  const period = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div data-console-target="billing-bills" data-action-id="NAV:billing-bills">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description={`Account ${identity.account_id} · ${identity.account_name}`}
        >
          Bills
        </Header>
        <Container
          header={
            <Header variant="h2" description={`Billing period · ${period}`}>
              Charges by service
            </Header>
          }
        >
          <Table
            trackBy="service"
            columnDefinitions={[
              { id: "svc", header: "Service", cell: (r) => r.service },
              {
                id: "amt",
                header: "Amount (USD)",
                cell: (r) => `$${r.this_month.toFixed(2)}`,
              },
              {
                id: "prev",
                header: "Previous month",
                cell: (r) => `$${r.last_month.toFixed(2)}`,
              },
            ]}
            items={rows}
            empty={
              <Box textAlign="center" padding="l">
                No charges yet this month.
              </Box>
            }
            footer={
              <Box float="right" fontWeight="bold" padding="s">
                Total · ${total.toFixed(2)}
              </Box>
            }
          />
        </Container>
        <Alert type="info">
          Charges by service for the current billing period. Totals update as usage is recorded.
        </Alert>
      </SpaceBetween>
    </div>
  );
}

function BillingDashboard() {
  const budgets = useAccountStore((s) => s.budgets);
  const rows = useAccountStore((s) => s.cost_rows);
  const navigate = useAccountStore((s) => s.navigate);
  const total = rows.reduce((s, r) => s + r.this_month, 0);
  const inAlert = budgets.filter(
    (b) => b.forecasted / b.budgeted >= b.alert_threshold / 100 || b.current >= b.budgeted
  ).length;

  return (
    <div data-action-id="NAV:billing-dashboard">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description="Month-to-date cost overview for this account."
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => navigate("billing", "cost-explorer")}>
                Cost Explorer
              </Button>
              <Button variant="primary" onClick={() => navigate("billing", "budgets")}>
                Budgets
              </Button>
            </SpaceBetween>
          }
        >
          Billing dashboard
        </Header>
        <ColumnLayout columns={3}>
          <Container>
            <Box variant="awsui-key-label">Month-to-date cost</Box>
            <Box fontSize="display-l">${total.toFixed(2)}</Box>
          </Container>
          <Container>
            <Box variant="awsui-key-label">Budgets in alert</Box>
            <Box fontSize="display-l" color="text-status-error">
              {inAlert}
            </Box>
          </Container>
          <Container>
            <Box variant="awsui-key-label">Services tracked</Box>
            <Box fontSize="display-l">{rows.length}</Box>
          </Container>
        </ColumnLayout>
      </SpaceBetween>
    </div>
  );
}

function budgetStatus(b: Budget) {
  if (b.current >= b.budgeted || b.forecasted >= b.budgeted) {
    return <StatusIndicator type="error">Exceeded</StatusIndicator>;
  }
  const pct =
    b.threshold_type === "Forecasted"
      ? (b.forecasted / b.budgeted) * 100
      : (b.current / b.budgeted) * 100;
  if (pct >= b.alert_threshold) {
    return <StatusIndicator type="warning">Alert</StatusIndicator>;
  }
  return <StatusIndicator type="success">OK</StatusIndicator>;
}

function CostExplorer() {
  const getCostExplorerData = useAccountStore((s) => s.getCostExplorerData);
  const costRows = useAccountStore((s) => s.cost_rows);
  const allocationTags = useAccountStore((s) => s.cost_allocation_tags);
  const navigate = useAccountStore((s) => s.navigate);
  const setFlash = useAccountStore((s) => s.setFlash);
  const [dateRange, setDateRange] = useState({
    label: "Last 3 months",
    value: "3m",
  });
  const [granularity, setGranularity] = useState("Monthly");
  const [chartType, setChartType] = useState<"stack" | "line">("stack");
  const [groupBy, setGroupBy] = useState("Service");
  const [serviceFilter, setServiceFilter] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(costRows.map((r) => [r.service, true]))
  );
  const [tagKey, setTagKey] = useState<string>("");
  const [tagValue, setTagValue] = useState<string>("");
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [report, setReport] = useState({
    dateRange: { label: "Last 3 months", value: "3m" },
    granularity: "Monthly",
    chartType: "stack" as "stack" | "line",
    groupBy: "Service",
    serviceFilter: Object.fromEntries(costRows.map((r) => [r.service, true])) as Record<
      string,
      boolean
    >,
    tagKey: "",
    tagValue: "",
    regionFilter: "",
  });
  const [refreshing, setRefreshing] = useState(false);

  const applyRefresh = () => {
    setRefreshing(true);
    setReport({
      dateRange: { ...dateRange },
      granularity,
      chartType,
      groupBy,
      serviceFilter: { ...serviceFilter },
      tagKey,
      tagValue,
      regionFilter,
    });
    setFlash({ type: "success", content: "Cost Explorer report refreshed." });
    window.setTimeout(() => setRefreshing(false), 250);
  };

  const activeTagKeys = allocationTags
    .filter((t) => t.status === "Active")
    .map((t) => t.key);

  const monthly = useMemo(
    () => getCostExplorerData(report.granularity, report.dateRange.value),
    [getCostExplorerData, report.granularity, report.dateRange.value]
  );

  const filteredCostRows = useMemo(() => {
    return costRows.filter((r) => {
      if (report.regionFilter && (r.region || "ap-south-1") !== report.regionFilter)
        return false;
      if (
        report.tagKey &&
        report.tagValue &&
        (r.tags || {})[report.tagKey] !== report.tagValue
      )
        return false;
      return report.serviceFilter[r.service] !== false;
    });
  }, [costRows, report]);

  const services = useMemo(() => {
    if (report.groupBy.startsWith("Tag:") && report.tagKey) {
      const vals = Array.from(
        new Set(filteredCostRows.map((r) => (r.tags || {})[report.tagKey] || "(none)"))
      );
      return vals;
    }
    if (report.groupBy === "Region") {
      return Array.from(
        new Set(filteredCostRows.map((r) => r.region || "ap-south-1"))
      );
    }
    const keys = Object.keys(monthly[0]?.services || {});
    return keys.filter((k) => report.serviceFilter[k] !== false);
  }, [monthly, report, filteredCostRows]);

  const amountFor = (key: string) => {
    if (report.groupBy.startsWith("Tag:") && report.tagKey) {
      return filteredCostRows
        .filter((r) => ((r.tags || {})[report.tagKey] || "(none)") === key)
        .reduce((s, r) => s + r.this_month, 0);
    }
    if (report.groupBy === "Region") {
      return filteredCostRows
        .filter((r) => (r.region || "ap-south-1") === key)
        .reduce((s, r) => s + r.this_month, 0);
    }
    return filteredCostRows
      .filter((r) => r.service === key)
      .reduce((s, r) => s + r.this_month, 0);
  };

  const lineSeries = useMemo(
    () =>
      services.map((svc) => ({
        title: svc,
        type: "line" as const,
        data: monthly.map((m) => ({
          x: m.month,
          y:
            report.groupBy === "Service" ||
            report.groupBy === "Linked Account" ||
            report.groupBy === "Instance Type" ||
            report.groupBy === "Usage Type"
              ? m.services[svc] || 0
              : amountFor(svc) / Math.max(monthly.length, 1),
        })),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [services, monthly, report.groupBy, filteredCostRows, report.tagKey]
  );

  const barSeries = useMemo(
    () =>
      services.map((svc) => ({
        title: svc,
        type: "bar" as const,
        data: monthly.map((m) => ({
          x: m.month,
          y:
            report.groupBy === "Service" ||
            report.groupBy === "Linked Account" ||
            report.groupBy === "Instance Type" ||
            report.groupBy === "Usage Type"
              ? m.services[svc] || 0
              : amountFor(svc) / Math.max(monthly.length, 1),
        })),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [services, monthly, report.groupBy, filteredCostRows, report.tagKey]
  );

  const yMax =
    Math.max(
      ...monthly.map((m) =>
        services.reduce((sum, svc) => sum + (m.services[svc] || 0), 0)
      ),
      1
    ) * 1.15;

  const tableItems = services.map((svc) => {
    const row: Record<string, string | number> = { service: svc };
    let total = 0;
    for (const m of monthly) {
      const v = m.services[svc] || 0;
      row[m.month] = v;
      total += v;
    }
    row.total = Math.round(total * 100) / 100;
    return row;
  });

  const totalRow: Record<string, string | number> = { service: "Total costs" };
  let grand = 0;
  for (const m of monthly) {
    const v = services.reduce((s, svc) => s + (m.services[svc] || 0), 0);
    totalRow[m.month] = Math.round(v * 100) / 100;
    grand += v;
  }
  totalRow.total = Math.round(grand * 100) / 100;

  return (
    <div data-action-id="NAV:cost-explorer">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description={`${report.dateRange.label} · ${report.granularity} · grouped by ${report.groupBy}`}
          actions={
            <Button
              variant="primary"
              loading={refreshing}
              onClick={applyRefresh}
              data-action-id="CLICK:ce-refresh"
            >
              Refresh
            </Button>
          }
        >
          Cost Explorer
        </Header>
        <div
          className="aws-cost-explorer-layout"
          data-console-target="cost-explorer-view"
          data-action-id="NAV:cost-explorer-view"
        >
          <div className="aws-cost-explorer-main">
            <div data-action-id="HIGHLIGHT:ce-chart-canvas">
              {refreshing ? (
                <Box textAlign="center" padding="xxl">
                  <Spinner size="large" />
                </Box>
              ) : report.chartType === "line" ? (
                <LineChart
                  series={lineSeries}
                  xDomain={monthly.map((m) => m.month)}
                  yDomain={[0, yMax]}
                  height={320}
                  hideFilter
                  ariaLabel="Cost Explorer line chart"
                />
              ) : (
                <BarChart
                  series={barSeries}
                  xDomain={monthly.map((m) => m.month)}
                  yDomain={[0, yMax]}
                  stackedBars
                  height={320}
                  hideFilter
                  ariaLabel="Cost Explorer stacked bar chart"
                />
              )}
            </div>
            <Table
              header={<Header>Costs by {report.groupBy.toLowerCase()}</Header>}
              columnDefinitions={[
                { id: "service", header: "Service", cell: (r) => String(r.service) },
                ...monthly.map((m) => ({
                  id: m.month,
                  header: m.month,
                  cell: (r: Record<string, string | number>) =>
                    `$${Number(r[m.month] || 0).toFixed(2)}`,
                })),
                {
                  id: "total",
                  header: "Total",
                  cell: (r: Record<string, string | number>) =>
                    `$${Number(r.total || 0).toFixed(2)}`,
                },
              ]}
              items={[...tableItems, totalRow]}
            />
          </div>
          <aside className="aws-cost-explorer-filters">
            <Header variant="h2">Report parameters</Header>
            <SpaceBetween size="m">
              <FormField label="Date range">
                <Select
                  selectedOption={dateRange}
                  options={[
                    { label: "Month-to-date", value: "mtd" },
                    { label: "Last 3 months", value: "3m" },
                    { label: "Last 6 months", value: "6m" },
                    { label: "Custom range", value: "custom" },
                  ]}
                  onChange={({ detail }) =>
                    setDateRange({
                      label: detail.selectedOption.label || dateRange.label,
                      value: detail.selectedOption.value || dateRange.value,
                    })
                  }
                />
              </FormField>
              <FormField label="Granularity">
                <span data-action-id="SELECT:ce-granularity-monthly">
                  <RadioGroup
                    value={granularity === "Daily" ? "Daily" : "Monthly"}
                    onChange={({ detail }) => setGranularity(detail.value)}
                    items={[
                      { value: "Daily", label: "Daily" },
                      { value: "Monthly", label: "Monthly" },
                    ]}
                  />
                </span>
              </FormField>
              <FormField label="Chart type">
                <RadioGroup
                  value={chartType}
                  onChange={({ detail }) =>
                    setChartType(detail.value as "stack" | "line")
                  }
                  items={[
                    { value: "stack", label: "Bar (Stacked)" },
                    { value: "line", label: "Line" },
                  ]}
                />
              </FormField>
              <FormField label="Group by">
                <span
                  data-action-id="HIGHLIGHT:ce-group-by-dropdown"
                >
                  <span data-action-id="SELECT:ce-group-by-service">
                    <Select
                      selectedOption={{ label: groupBy, value: groupBy }}
                      options={[
                        "Service",
                        "Linked Account",
                        "Region",
                        "Instance Type",
                        "Usage Type",
                        ...activeTagKeys.map((k) => `Tag: ${k}`),
                      ].map((g) => ({ label: g, value: g }))}
                      onChange={({ detail }) => {
                        const next = detail.selectedOption.value || groupBy;
                        setGroupBy(next);
                        if (next.startsWith("Tag: ")) {
                          setTagKey(next.replace("Tag: ", ""));
                        }
                      }}
                    />
                  </span>
                </span>
              </FormField>
              <ExpandableSection headerText="Service" defaultExpanded>
                <SpaceBetween size="xs">
                  {costRows.map((r) => (
                    <Checkbox
                      key={r.service}
                      checked={serviceFilter[r.service] !== false}
                      onChange={({ detail }) =>
                        setServiceFilter((prev) => ({
                          ...prev,
                          [r.service]: detail.checked,
                        }))
                      }
                    >
                      {r.service}
                    </Checkbox>
                  ))}
                </SpaceBetween>
              </ExpandableSection>
              <ExpandableSection headerText="Region" defaultExpanded={!!regionFilter}>
                <SpaceBetween size="xs">
                  <Checkbox
                    checked={!regionFilter}
                    onChange={() => setRegionFilter("")}
                  >
                    All Regions
                  </Checkbox>
                  {Array.from(
                    new Set(costRows.map((r) => r.region || "ap-south-1"))
                  ).map((reg) => (
                    <Checkbox
                      key={reg}
                      checked={regionFilter === reg}
                      onChange={({ detail }) =>
                        setRegionFilter(detail.checked ? reg : "")
                      }
                    >
                      {reg}
                    </Checkbox>
                  ))}
                </SpaceBetween>
              </ExpandableSection>
              <ExpandableSection headerText="Tag" defaultExpanded={!!tagKey}>
                {activeTagKeys.length === 0 ? (
                  <SpaceBetween size="s">
                    <Box color="text-body-secondary">
                      No active cost allocation tags. Activate tags to filter and group by
                      them.
                    </Box>
                    <Button
                      variant="inline-link"
                      onClick={() => navigate("billing", "cost-allocation-tags")}
                    >
                      Cost allocation tags
                    </Button>
                  </SpaceBetween>
                ) : (
                  <SpaceBetween size="s">
                    <FormField label="Tag key">
                      <Select
                        selectedOption={
                          tagKey
                            ? { label: tagKey, value: tagKey }
                            : { label: "Choose a tag key", value: "" }
                        }
                        options={activeTagKeys.map((k) => ({ label: k, value: k }))}
                        onChange={({ detail }) => {
                          setTagKey(detail.selectedOption.value || "");
                          setTagValue("");
                        }}
                      />
                    </FormField>
                    {tagKey && (
                      <FormField label="Tag value">
                        <Select
                          selectedOption={
                            tagValue
                              ? { label: tagValue, value: tagValue }
                              : { label: "All values", value: "" }
                          }
                          options={[
                            { label: "All values", value: "" },
                            ...Array.from(
                              new Set(
                                costRows
                                  .map((r) => (r.tags || {})[tagKey])
                                  .filter(Boolean) as string[]
                              )
                            ).map((v) => ({ label: v, value: v })),
                          ]}
                          onChange={({ detail }) =>
                            setTagValue(detail.selectedOption.value || "")
                          }
                        />
                      </FormField>
                    )}
                  </SpaceBetween>
                )}
              </ExpandableSection>
              <Button onClick={applyRefresh} loading={refreshing}>
                Refresh
              </Button>
            </SpaceBetween>
          </aside>
        </div>
      </SpaceBetween>
    </div>
  );
}

function Budgets() {
  const budgets = useAccountStore((s) => s.budgets);
  const navigate = useAccountStore((s) => s.navigate);
  const deleteBudget = useAccountStore((s) => s.deleteBudget);
  const setFlash = useAccountStore((s) => s.setFlash);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const [selected, setSelected] = useState<Budget[]>([]);
  const [detailBudget, setDetailBudget] = useState<Budget | null>(null);

  const inAlert = budgets.filter((b) => {
    const pct =
      b.threshold_type === "Forecasted"
        ? (b.forecasted / b.budgeted) * 100
        : (b.current / b.budgeted) * 100;
    return pct >= b.alert_threshold || b.current >= b.budgeted;
  }).length;
  const ok = budgets.length - inAlert;

  return (
    <div data-action-id="NAV:budgets-list">
      <Modal
        visible={!!detailBudget}
        onDismiss={() => setDetailBudget(null)}
        header={detailBudget?.name || "Budget details"}
        footer={
          <Box float="right">
            <Button onClick={() => setDetailBudget(null)}>Close</Button>
          </Box>
        }
      >
        {detailBudget && (
          <SpaceBetween size="s">
            <Box>
              <b>Period:</b> {detailBudget.period}
            </Box>
            <Box>
              <b>Budgeted:</b> ${detailBudget.budgeted.toFixed(2)}
            </Box>
            <Box>
              <b>Current:</b> ${detailBudget.current.toFixed(2)}
            </Box>
            <Box>
              <b>Forecasted:</b> ${detailBudget.forecasted.toFixed(2)}
            </Box>
            <Box>
              <b>Alert:</b> {detailBudget.threshold_type} ≥ {detailBudget.alert_threshold}% →{" "}
              {detailBudget.email}
            </Box>
          </SpaceBetween>
        )}
      </Modal>
      <SpaceBetween size="l">
        <ColumnLayout columns={2}>
          <Container>
            <Box variant="awsui-key-label">Budgets in alert</Box>
            <Box fontSize="display-l" color="text-status-error">
              {inAlert}
            </Box>
          </Container>
          <Container>
            <Box variant="awsui-key-label">Budgets ok</Box>
            <Box fontSize="display-l" color="text-status-success">
              {ok}
            </Box>
          </Container>
        </ColumnLayout>
        <Table
          variant="full-page"
          stickyHeader
          selectionType="multi"
          selectedItems={selected}
          onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
          header={
            <Header
              variant="awsui-h1-sticky"
              counter={`(${budgets.length})`}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <ButtonDropdown
                    disabled={!interactive}
                    items={[
                      { id: "create", text: "Create budget" },
                      {
                        id: "delete",
                        text: "Delete",
                        disabled: selected.length === 0,
                      },
                      {
                        id: "view",
                        text: "View details",
                        disabled: selected.length !== 1,
                      },
                    ]}
                    onItemClick={({ detail }) => {
                      if (detail.id === "create") {
                        markClick("create-budget");
                        navigate("billing", "create-budget");
                        return;
                      }
                      if (detail.id === "delete") {
                        selected.forEach((b) => {
                          markClick("delete-budget");
                          deleteBudget(b.id || b.name);
                        });
                        setSelected([]);
                        return;
                      }
                      if (detail.id === "view" && selected[0]) {
                        setDetailBudget(selected[0]);
                        setFlash({
                          type: "info",
                          content: `Viewing budget ${selected[0].name}.`,
                        });
                      }
                    }}
                  >
                    Actions
                  </ButtonDropdown>
                  <span data-action-id="HIGHLIGHT:btn-create-budget">
                    <Button
                      variant="primary"
                      disabled={!interactive}
                      onClick={() => {
                        markClick("create-budget");
                        navigate("billing", "create-budget");
                      }}
                    >
                      Create budget
                    </Button>
                  </span>
                </SpaceBetween>
              }
            >
              Budgets
            </Header>
          }
          columnDefinitions={[
            {
              id: "name",
              header: "Budget name",
              cell: (b) => (
                <Button variant="inline-link" disabled={!interactive}>
                  {b.name}
                </Button>
              ),
            },
            {
              id: "amt",
              header: "Amount",
              cell: (b) => `$${b.budgeted.toFixed(2)}`,
            },
            {
              id: "cur",
              header: "Current vs Budgeted",
              cell: (b) => (
                <div className="aws-budget-progress">
                  <ProgressBar
                    value={Math.min(100, (b.current / b.budgeted) * 100)}
                    description={`$${b.current.toFixed(2)} / $${b.budgeted.toFixed(2)}`}
                  />
                </div>
              ),
            },
            {
              id: "fc",
              header: "Forecasted vs Budgeted",
              cell: (b) => `${Math.round((b.forecasted / b.budgeted) * 100)}%`,
            },
            {
              id: "st",
              header: "Status",
              cell: (b) => budgetStatus(b),
            },
          ]}
          items={budgets}
        />
      </SpaceBetween>
    </div>
  );
}

function CreateBudget() {
  const navigate = useAccountStore((s) => s.navigate);
  const createBudget = useAccountStore((s) => s.createBudget);
  const interactive = useAccountStore((s) => s.interactive);
  const markClick = useAccountStore((s) => s.markClick);
  const costRows = useAccountStore((s) => s.cost_rows);

  const [step, setStep] = useState(0);
  const [budgetType, setBudgetType] = useState("cost");
  const [name, setName] = useState("Monthly-Cost-Limit");
  const [period, setPeriod] = useState<Budget["period"]>("Monthly");
  const [amountMode, setAmountMode] = useState("fixed");
  const [amount, setAmount] = useState("50.00");
  const [showAlert, setShowAlert] = useState(true);
  const [thresholdType, setThresholdType] =
    useState<Budget["threshold_type"]>("Forecasted");
  const [threshold, setThreshold] = useState("80");
  const [email, setEmail] = useState("admin@rebon.io");
  const [creating, setCreating] = useState(false);

  const amountNum = Number(amount) || 50;
  const thresholdNum = Number(threshold) || 80;
  const notifyAt = Math.round(amountNum * (thresholdNum / 100) * 100) / 100;
  const histAvg =
    costRows.reduce((s, r) => s + r.last_month, 0) / Math.max(costRows.length, 1);

  const submit = () => {
    if (!interactive || !name.trim() || creating) return;
    markClick("create-budget-submit");
    setCreating(true);
    void createBudget({
      name: name.trim(),
      amount: amountNum,
      period,
      threshold: thresholdNum,
      thresholdType,
      email,
    }).finally(() => setCreating(false));
  };

  return (
    <div data-action-id="NAV:budgets-create">
      {creating && (
        <Box textAlign="center" padding="s">
          <Spinner size="large" /> Creating budget…
        </Box>
      )}
      <Wizard
        i18nStrings={WIZARD_I18N}
        activeStepIndex={step}
        submitButtonText="Create budget"
        isLoadingNextStep={creating}
        onNavigate={({ detail }) => setStep(detail.requestedStepIndex)}
        onCancel={() => navigate("billing", "budgets")}
        onSubmit={submit}
        steps={[
          {
            title: "Choose budget type",
            content: (
              <span data-action-id="SELECT:budget-type-cost">
                <RadioGroup
                  value={budgetType}
                  onChange={({ detail }) => setBudgetType(detail.value)}
                  items={[
                    {
                      value: "cost",
                      label: "Cost budget - Recommended",
                      description:
                        "Monitor costs against a specified dollar amount and receive alerts",
                    },
                    {
                      value: "usage",
                      label: "Usage budget",
                      description:
                        "Monitor usage of one or more specified resource types",
                    },
                    {
                      value: "sp",
                      label: "Savings Plans budget",
                      description: "Track Savings Plans utilization or coverage",
                    },
                    {
                      value: "ri",
                      label: "Reservation budget",
                      description: "Track reservation utilization or coverage",
                    },
                  ]}
                />
              </span>
            ),
          },
          {
            title: "Set your budget",
            content: (
              <SpaceBetween size="l">
                <Container header={<Header variant="h2">Budget details</Header>}>
                  <SpaceBetween size="m">
                    <FormField label="Budget name">
                      <span data-action-id="FILL:budget-name">
                        <Input
                          value={name}
                          disabled={!interactive}
                          onChange={({ detail }) => setName(detail.value)}
                        />
                      </span>
                    </FormField>
                    <FormField label="Period">
                      <Select
                        selectedOption={{ label: period, value: period }}
                        options={["Daily", "Monthly", "Quarterly", "Annually"].map(
                          (p) => ({ label: p, value: p })
                        )}
                        onChange={({ detail }) =>
                          setPeriod(
                            (detail.selectedOption.value || period) as Budget["period"]
                          )
                        }
                      />
                    </FormField>
                  </SpaceBetween>
                </Container>
                <Container header={<Header variant="h2">Budget amount</Header>}>
                  <SpaceBetween size="m">
                    <RadioGroup
                      value={amountMode}
                      onChange={({ detail }) => setAmountMode(detail.value)}
                      items={[
                        { value: "fixed", label: "Fixed" },
                        { value: "planned", label: "Planned" },
                      ]}
                    />
                    <FormField label="Budgeted amount ($)">
                      <span data-action-id="HIGHLIGHT:budget-amount-input">
                        <span data-action-id="FILL:budget-amount">
                          <Input
                            value={amount}
                            disabled={!interactive}
                            type="number"
                            onChange={({ detail }) => setAmount(detail.value)}
                          />
                        </span>
                      </span>
                    </FormField>
                    <LineChart
                      series={[
                        {
                          title: "Historical spend",
                          type: "line",
                          data: [
                            { x: 0, y: histAvg * 0.9 },
                            { x: 1, y: histAvg },
                            { x: 2, y: histAvg * 1.05 },
                          ],
                        },
                        {
                          title: `Budget ($${amountNum})`,
                          type: "threshold",
                          y: amountNum,
                        },
                      ]}
                      xDomain={[0, 1, 2]}
                      yDomain={[0, Math.max(amountNum, histAvg) * 1.3]}
                      height={180}
                      hideFilter
                      ariaLabel="Budget vs historical spend"
                    />
                  </SpaceBetween>
                </Container>
              </SpaceBetween>
            ),
          },
          {
            title: "Configure budget alerts",
            content: (
              <Container header={<Header variant="h2">Alert 1</Header>}>
                <SpaceBetween size="m">
                  {!showAlert && (
                    <span data-action-id="CLICK:btn-add-alert-threshold">
                      <Button onClick={() => setShowAlert(true)}>
                        Add an alert threshold
                      </Button>
                    </span>
                  )}
                  {showAlert && (
                    <>
                      <FormField label="Threshold type">
                        <span data-action-id="SELECT:alert-type-forecasted">
                          <Select
                            selectedOption={{
                              label: thresholdType,
                              value: thresholdType,
                            }}
                            options={[
                              { label: "Actual", value: "Actual" },
                              { label: "Forecasted", value: "Forecasted" },
                            ]}
                            onChange={({ detail }) =>
                              setThresholdType(
                                (detail.selectedOption.value ||
                                  thresholdType) as Budget["threshold_type"]
                              )
                            }
                          />
                        </span>
                      </FormField>
                      <FormField label="Alert threshold (% of budgeted amount)">
                        <span data-action-id="HIGHLIGHT:alert-threshold-input">
                          <span data-action-id="FILL:alert-threshold-percent">
                            <Input
                              value={threshold}
                              disabled={!interactive}
                              type="number"
                              onChange={({ detail }) => setThreshold(detail.value)}
                            />
                          </span>
                        </span>
                      </FormField>
                      <Box color="text-body-secondary">
                        You will be notified when your{" "}
                        {thresholdType.toLowerCase()} cost is greater than{" "}
                        {thresholdNum.toFixed(2)}% (${notifyAt.toFixed(2)}) of your
                        budgeted amount (${amountNum.toFixed(2)}).
                      </Box>
                      <FormField label="Email contacts">
                        <span data-action-id="FILL:alert-email">
                          <Input
                            value={email}
                            disabled={!interactive}
                            onChange={({ detail }) => setEmail(detail.value)}
                          />
                        </span>
                      </FormField>
                    </>
                  )}
                </SpaceBetween>
              </Container>
            ),
          },
          {
            title: "Confirm budget and create",
            content: (
              <SpaceBetween size="m">
                <Container header={<Header variant="h2">Budget summary</Header>}>
                  <SpaceBetween size="s">
                    <Box>
                      <b>Type:</b> Cost budget
                    </Box>
                    <Box>
                      <b>Name:</b> {name}
                    </Box>
                    <Box>
                      <b>Period:</b> {period}
                    </Box>
                    <Box>
                      <b>Amount:</b> ${amountNum.toFixed(2)} ({amountMode})
                    </Box>
                    <Box>
                      <b>Alert:</b> {thresholdType} ≥ {thresholdNum}% → {email}
                    </Box>
                  </SpaceBetween>
                </Container>
                <span
                  data-action-id="CLICK:btn-create-budget-submit"
                  className="aws-billing-ren-hooks"
                >
                  <button type="button" onClick={submit} disabled={!interactive || creating} />
                </span>
              </SpaceBetween>
            ),
          },
        ]}
      />
    </div>
  );
}

type PaymentMethod = {
  id: string;
  type: string;
  last4: string;
  expiry: string;
  default: boolean;
};

function SavingsPlansPage() {
  const setFlash = useAccountStore((s) => s.setFlash);
  const interactive = useAccountStore((s) => s.interactive);
  const plans: never[] = [];

  return (
    <div data-action-id="NAV:billing-savings-plans">
      <Table
        variant="full-page"
        stickyHeader
        header={
          <Header
            variant="awsui-h1-sticky"
            counter="(0)"
            description="Commit to a consistent amount of usage for a 1- or 3-year term in exchange for a discount."
            actions={
              <Button
                variant="primary"
                disabled={!interactive}
                onClick={() =>
                  setFlash({
                    type: "info",
                    content: "Purchase Savings Plans opens the recommendation workflow.",
                  })
                }
              >
                Purchase
              </Button>
            }
          >
            Savings Plans
          </Header>
        }
        columnDefinitions={[
          { id: "id", header: "Savings Plan ID", cell: () => "—" },
          { id: "type", header: "Type", cell: () => "—" },
          { id: "term", header: "Term", cell: () => "—" },
          { id: "commit", header: "Commitment", cell: () => "—" },
          { id: "start", header: "Start date", cell: () => "—" },
          { id: "status", header: "Status", cell: () => "—" },
        ]}
        items={plans}
        empty={
          <Box textAlign="center" padding="l">
            <SpaceBetween size="m">
              <b>No Savings Plans</b>
              <Box color="text-body-secondary">
                You don't have any Savings Plans. Purchase a plan to reduce on-demand costs.
              </Box>
              <Button
                variant="primary"
                disabled={!interactive}
                onClick={() =>
                  setFlash({
                    type: "info",
                    content: "Purchase Savings Plans opens the recommendation workflow.",
                  })
                }
              >
                Purchase
              </Button>
            </SpaceBetween>
          </Box>
        }
      />
    </div>
  );
}

function BillingPreferencesPage() {
  const setFlash = useAccountStore((s) => s.setFlash);
  const interactive = useAccountStore((s) => s.interactive);
  const [pdfInvoice, setPdfInvoice] = useState(true);
  const [creditSharing, setCreditSharing] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <div data-action-id="NAV:billing-preferences">
      <SpaceBetween size="l">
        <Header
          variant="h1"
          description="Manage invoice delivery and credit sharing for this account."
          actions={
            <Button
              variant="primary"
              loading={saving}
              disabled={!interactive}
              onClick={() => {
                setSaving(true);
                window.setTimeout(() => {
                  setSaving(false);
                  setFlash({
                    type: "success",
                    content: "Billing preferences saved.",
                  });
                }, 400);
              }}
            >
              Save preferences
            </Button>
          }
        >
          Billing preferences
        </Header>
        <Container header={<Header variant="h2">Invoice delivery</Header>}>
          <SpaceBetween size="m">
            <Toggle
              checked={pdfInvoice}
              onChange={({ detail }) => setPdfInvoice(detail.checked)}
            >
              PDF invoice by email
            </Toggle>
            <Box color="text-body-secondary">
              When enabled, a PDF copy of each invoice is sent to the billing contact.
            </Box>
          </SpaceBetween>
        </Container>
        <Container header={<Header variant="h2">Credit sharing</Header>}>
          <SpaceBetween size="m">
            <Toggle
              checked={creditSharing}
              onChange={({ detail }) => setCreditSharing(detail.checked)}
            >
              Credit sharing
            </Toggle>
            <Box color="text-body-secondary">
              Allow AWS credits to be shared across accounts in your organization.
            </Box>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </div>
  );
}

function PaymentMethodsPage() {
  const setFlash = useAccountStore((s) => s.setFlash);
  const interactive = useAccountStore((s) => s.interactive);
  const [methods, setMethods] = useState<PaymentMethod[]>([
    {
      id: "pm-1",
      type: "Visa",
      last4: "4242",
      expiry: "08/2028",
      default: true,
    },
  ]);
  const [selected, setSelected] = useState<PaymentMethod[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [cardType, setCardType] = useState("Visa");
  const [last4, setLast4] = useState("");
  const [expiry, setExpiry] = useState("");

  return (
    <div data-action-id="NAV:billing-payment-methods">
      <Modal
        visible={showAdd}
        onDismiss={() => setShowAdd(false)}
        header="Add payment method"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!interactive || last4.trim().length < 4 || !expiry.trim()}
                onClick={() => {
                  const id = `pm-${Date.now().toString(36)}`;
                  setMethods((prev) => [
                    ...prev,
                    {
                      id,
                      type: cardType,
                      last4: last4.trim().slice(-4),
                      expiry: expiry.trim(),
                      default: prev.length === 0,
                    },
                  ]);
                  setFlash({
                    type: "success",
                    content: "Payment method added.",
                  });
                  setLast4("");
                  setExpiry("");
                  setShowAdd(false);
                }}
              >
                Add
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Card type">
            <Select
              selectedOption={{ label: cardType, value: cardType }}
              options={["Visa", "Mastercard", "American Express"].map((t) => ({
                label: t,
                value: t,
              }))}
              onChange={({ detail }) =>
                setCardType(detail.selectedOption.value || cardType)
              }
            />
          </FormField>
          <FormField label="Last 4 digits">
            <Input
              value={last4}
              onChange={({ detail }) => setLast4(detail.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4242"
            />
          </FormField>
          <FormField label="Expiry (MM/YYYY)">
            <Input
              value={expiry}
              onChange={({ detail }) => setExpiry(detail.value)}
              placeholder="08/2028"
            />
          </FormField>
        </SpaceBetween>
      </Modal>
      <Table
        variant="full-page"
        stickyHeader
        selectionType="single"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${methods.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  disabled={!interactive || selected.length === 0}
                  onClick={() => {
                    const id = selected[0]?.id;
                    if (!id) return;
                    setMethods((prev) => prev.filter((m) => m.id !== id));
                    setSelected([]);
                    setFlash({
                      type: "success",
                      content: "Payment method removed.",
                    });
                  }}
                >
                  Remove
                </Button>
                <Button
                  variant="primary"
                  disabled={!interactive}
                  onClick={() => setShowAdd(true)}
                >
                  Add payment method
                </Button>
              </SpaceBetween>
            }
          >
            Payment methods
          </Header>
        }
        columnDefinitions={[
          { id: "type", header: "Type", cell: (m) => m.type },
          { id: "last4", header: "Ending in", cell: (m) => m.last4 },
          { id: "exp", header: "Expiration", cell: (m) => m.expiry },
          {
            id: "def",
            header: "Default",
            cell: (m) =>
              m.default ? (
                <StatusIndicator type="success">Default</StatusIndicator>
              ) : (
                "—"
              ),
          },
        ]}
        items={methods}
        empty={
          <Box textAlign="center" padding="l">
            <SpaceBetween size="m">
              <b>No payment methods</b>
              <Button
                variant="primary"
                disabled={!interactive}
                onClick={() => setShowAdd(true)}
              >
                Add payment method
              </Button>
            </SpaceBetween>
          </Box>
        }
      />
    </div>
  );
}

import type { ProMailboxTicketV1 } from "@/types/proMailbox";

export const FINOVA_LANES = [
  {
    id: "console",
    title: "Console",
    blurb: "Account, region, search",
  },
  {
    id: "iam",
    title: "IAM",
    blurb: "Users, policies, keys",
  },
  {
    id: "cloudwatch",
    title: "CloudWatch",
    blurb: "Metrics, alarms, logs",
  },
] as const;

export type FinovaLaneId = (typeof FINOVA_LANES)[number]["id"];

export function consoleViewForTicket(
  service: ProMailboxTicketV1["service"]
): "home" | "iam" | "cloudwatch" {
  if (service === "iam") return "iam";
  if (service === "cloudwatch") return "cloudwatch";
  return "home";
}

export function priorityTone(
  priority: string,
  surface: "dark" | "light" = "dark"
): string {
  if (surface === "light") {
    if (priority === "P1") return "bg-rose-100 text-rose-800 ring-rose-200";
    if (priority === "P2") return "bg-amber-100 text-amber-900 ring-amber-200";
    if (priority === "P3") return "bg-sky-100 text-sky-900 ring-sky-200";
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }
  if (priority === "P1") return "bg-rose-500/15 text-rose-200 ring-rose-400/40";
  if (priority === "P2") return "bg-amber-500/15 text-amber-100 ring-amber-400/40";
  if (priority === "P3") return "bg-sky-500/15 text-sky-100 ring-sky-400/40";
  return "bg-white/5 text-slate-300 ring-white/10";
}

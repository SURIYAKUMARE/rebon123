/**
 * Load Finova L1 mailbox desk tickets (eager glob).
 */
import type { MailboxDeskIndexV1, ProMailboxTicketV1 } from "@/types/proMailbox";
import deskIndex from "./mailbox/_l1_desk.json";

const modules = import.meta.glob("./mailbox/l1/*.json", { eager: true }) as Record<
  string,
  { default: ProMailboxTicketV1 } | ProMailboxTicketV1
>;

const byId: Record<string, ProMailboxTicketV1> = {};

for (const mod of Object.values(modules)) {
  const raw = ("default" in mod ? mod.default : mod) as ProMailboxTicketV1;
  if (!raw?.ticket_id || raw.content_status !== "ready") continue;
  byId[raw.ticket_id] = raw;
}

export function getL1DeskIndex(): MailboxDeskIndexV1 {
  return deskIndex as MailboxDeskIndexV1;
}

export function getMailboxTicket(ticketId: string): ProMailboxTicketV1 | null {
  return byId[ticketId] ?? null;
}

export function listL1MailboxTickets(): ProMailboxTicketV1[] {
  const index = getL1DeskIndex();
  const fromIndex = index.tickets
    .map((row) => byId[row.ticket_id])
    .filter((t): t is ProMailboxTicketV1 => Boolean(t));
  // Fallback: if desk index and glob get out of sync, still surface every ready ticket.
  if (fromIndex.length === 0) {
    return Object.values(byId).sort((a, b) => a.sequence - b.sequence);
  }
  const seen = new Set(fromIndex.map((t) => t.ticket_id));
  const extras = Object.values(byId).filter((t) => !seen.has(t.ticket_id));
  return [...fromIndex, ...extras].sort((a, b) => a.sequence - b.sequence);
}

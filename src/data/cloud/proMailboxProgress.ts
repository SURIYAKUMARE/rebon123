/**
 * Finova L1 mailbox progress — local only.
 */
import { progressGet, progressSet } from "@/data/cloud/ephemeralProgress";
import { TESTING_UNLOCK_ALL_PRO_TICKETS } from "@/data/cloud/ephemeralProgress";
import { isProLessonComplete } from "@/data/cloud/professionalRoleProgress";
import type {
  MailboxProgressV1,
  ProMailboxTicketV1,
  TicketProgressV1,
  TicketState,
} from "@/types/proMailbox";
import type { ProRoleId } from "@/data/cloud/professionalRoleProgress";

const keyFor = (roleId: string) => `rebon_pro_mailbox_v1_${roleId}`;

function emptyProgress(roleId: ProRoleId): MailboxProgressV1 {
  return { role_id: roleId, tickets: {} };
}

export function loadMailboxProgress(roleId: ProRoleId): MailboxProgressV1 {
  const raw = progressGet(keyFor(roleId));
  if (!raw) return emptyProgress(roleId);
  try {
    const parsed = JSON.parse(raw) as MailboxProgressV1;
    if (!parsed?.tickets) return emptyProgress(roleId);
    return parsed;
  } catch {
    return emptyProgress(roleId);
  }
}

export function saveMailboxProgress(progress: MailboxProgressV1) {
  progressSet(keyFor(progress.role_id), JSON.stringify(progress));
}

export function getTicketProgress(
  roleId: ProRoleId,
  ticketId: string
): TicketProgressV1 | null {
  return loadMailboxProgress(roleId).tickets[ticketId] ?? null;
}

function upsertTicket(
  roleId: ProRoleId,
  ticketId: string,
  patch: Partial<TicketProgressV1>
): TicketProgressV1 {
  const box = loadMailboxProgress(roleId);
  const prev = box.tickets[ticketId] ?? {
    ticket_id: ticketId,
    state: "unread" as TicketState,
    steps: {},
    captured: {},
    attempts: [],
  };
  const next: TicketProgressV1 = { ...prev, ...patch, ticket_id: ticketId };
  saveMailboxProgress({
    ...box,
    tickets: { ...box.tickets, [ticketId]: next },
  });
  return next;
}

export function openTicket(roleId: ProRoleId, ticketId: string) {
  const prev = getTicketProgress(roleId, ticketId);
  return upsertTicket(roleId, ticketId, {
    state:
      prev?.state === "closed" || prev?.state === "work_done"
        ? prev.state
        : "in_progress",
    opened_at: prev?.opened_at || new Date().toISOString(),
  });
}

export function markStepDone(
  roleId: ProRoleId,
  ticketId: string,
  stepId: string,
  capture?: { key: string; value: string }
) {
  const prev = getTicketProgress(roleId, ticketId) ?? openTicket(roleId, ticketId);
  const steps = { ...prev.steps, [stepId]: "done" as const };
  const captured = capture
    ? { ...prev.captured, [capture.key]: capture.value }
    : { ...prev.captured };
  return upsertTicket(roleId, ticketId, { steps, captured, state: "in_progress" });
}

export function markWorkDone(roleId: ProRoleId, ticketId: string) {
  return upsertTicket(roleId, ticketId, { state: "work_done" });
}

export function recordReplyAttempt(
  roleId: ProRoleId,
  ticketId: string,
  attempt: TicketProgressV1["attempts"][number],
  close: boolean
) {
  const prev = getTicketProgress(roleId, ticketId) ?? openTicket(roleId, ticketId);
  const attempts = [...prev.attempts, attempt];
  const best = Math.max(prev.best_score ?? 0, attempt.score);
  return upsertTicket(roleId, ticketId, {
    attempts,
    best_score: best,
    needs_revision: !attempt.passed && !close,
    state: close ? "closed" : attempt.passed ? "closed" : "work_done",
    closed_at: close || attempt.passed ? new Date().toISOString() : prev.closed_at,
    draft: attempt.passed ? undefined : prev.draft,
  });
}

export function saveDraft(roleId: ProRoleId, ticketId: string, draft: string) {
  return upsertTicket(roleId, ticketId, { draft });
}

export function isTicketUnlocked(
  ticket: ProMailboxTicketV1,
  roleId: ProRoleId
): boolean {
  if (TESTING_UNLOCK_ALL_PRO_TICKETS) return true;
  for (const lesson of ticket.unlock.lessons_complete) {
    if (!isProLessonComplete(lesson)) return false;
  }
  const box = loadMailboxProgress(roleId);
  for (const id of ticket.unlock.tickets_closed ?? []) {
    if (box.tickets[id]?.state !== "closed") return false;
  }
  return true;
}

export function countClosed(roleId: ProRoleId): number {
  const box = loadMailboxProgress(roleId);
  return Object.values(box.tickets).filter((t) => t.state === "closed").length;
}

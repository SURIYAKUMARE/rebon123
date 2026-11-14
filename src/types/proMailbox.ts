/**
 * Professional Mode — Finova mailbox desk tickets (CSA L1 first).
 * See docs/learning/WORKSPACE_ARCHITECTURE.md
 */

import type { KeywordRubric } from "@/lib/keywordGrader";
import type { ProRoleId } from "@/data/cloud/professionalRoleProgress";

export type TicketTier = 1 | 2 | 3;

export type TicketState =
  | "unread"
  | "in_progress"
  | "work_done"
  | "reply_sent"
  | "closed";

export type MailParty = {
  name: string;
  email: string;
  title?: string;
};

export type MailMessageV1 = {
  message_id: string;
  from: MailParty;
  to: MailParty[];
  cc?: MailParty[];
  subject: string;
  body: string;
  received_at_label: string;
  priority: "P4" | "P3" | "P2" | "P1";
  attachments?: {
    name: string;
    kind: "text" | "json" | "csv" | "log";
    content: string;
  }[];
};

export type ChecklistStep = {
  id: string;
  kind: "checklist";
  instruction: string;
  confirm_label: string;
};

export type ObserveStep = {
  id: string;
  kind: "observe";
  instruction: string;
  question: string;
  accept_keywords: string[];
  hint: string;
  capture_as?: string;
};

export type WorkStep = ChecklistStep | ObserveStep;

export type ProMailboxTicketV1 = {
  schema_version: 1;
  ticket_id: string;
  legacy_task_id?: string;
  role_id: ProRoleId;
  tier: TicketTier;
  sequence: number;
  service: "console" | "iam" | "cloudwatch";
  source_lessons: string[];
  duration_minutes: number;
  content_status: "ready" | "stub";
  unlock: {
    lessons_complete: string[];
    tickets_closed?: string[];
  };
  email: MailMessageV1;
  /** MVP: checklist / observe first; console_target wiring comes next phase */
  work: {
    environment: "checklist" | "none" | "console";
    steps: WorkStep[];
  };
  reply: KeywordRubric & {
    model_reply: string;
    max_attempts_before_model: number;
  };
  debrief: { english: string; tanglish: string };
};

export type ReplyAttempt = {
  sent_at: string;
  body: string;
  score: number;
  passed: boolean;
  feedback: string[];
};

export type TicketProgressV1 = {
  ticket_id: string;
  state: TicketState;
  steps: Record<string, "pending" | "done">;
  captured: Record<string, string>;
  draft?: string;
  attempts: ReplyAttempt[];
  needs_revision?: boolean;
  closed_at?: string;
  best_score?: number;
  opened_at?: string;
};

export type MailboxProgressV1 = {
  role_id: ProRoleId;
  tickets: Record<string, TicketProgressV1>;
};

export type MailboxDeskIndexV1 = {
  schema_version: 1;
  role_id: ProRoleId;
  company: "Finova Technologies";
  wip_limit: number;
  tickets: {
    ticket_id: string;
    tier: TicketTier;
    sequence: number;
    file: string;
  }[];
};

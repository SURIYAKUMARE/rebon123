import { FINOVA_HIRE } from "@/data/cloud/roleTrack";
import {
  canPromoteFromRole,
  getCompletedProLessonIds,
  getCurrentProRoleId,
  getProRole,
  isProLessonComplete,
  isProLessonUnlocked,
  roleLessonProgress,
  type ProRoleId,
} from "@/data/cloud/professionalRoleProgress";
import { loadMailboxProgress } from "@/data/cloud/proMailboxProgress";
import { listL1MailboxTickets } from "@/data/cloud/professional_mode/mailboxLoader";
import { getProfessionalCurriculum } from "@/data/cloud/professional_mode";
import {
  isDayWorkspaceComplete,
  isReadinessPassed,
} from "@/data/cloud/studentModeProgress";
import type { TicketProgressV1 } from "@/types/proMailbox";

const PRACTICE_CAP_MINUTES = 45;
const STUDENT_DAYS = 10;

export type ProofRadarAxis = {
  axis: string;
  value: number;
  evidence: boolean;
  note: string;
};

export type CloudProof = {
  roleTitle: string;
  services: string[];
  company: string;
  account: string;
  verifiedLine: string;
  ticketsClosed: number;
  lessonsDone: number;
  lessonsTotal: number;
  practiceMinutes: number;
  streakDays: number | null;
  radar: ProofRadarAxis[];
  didTickets: {
    id: string;
    subject: string;
    when: string;
    score: number | null;
    attempts: number;
  }[];
  didLessons: { id: string; title: string }[];
  studentDays: number[];
  readiness: boolean;
  doingTickets: {
    id: string;
    subject: string;
    stepsDone: number;
    stepsTotal: number;
  }[];
  nextLesson: { id: string; title: string } | null;
  nextRoleTitle: string | null;
  gateLessons: number;
  openedTickets: number;
  canPromote: boolean;
  standing: string;
};

function dayKey(iso: string): string | null {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  const date = new Date(time);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function calculateStreak(dayKeys: string[], now = new Date()): number {
  const unique = [...new Set(dayKeys)].sort().reverse();
  if (unique.length === 0) return 0;
  const today = dayKey(now.toISOString());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayKey(yesterdayDate.toISOString());
  if (unique[0] !== today && unique[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const prev = new Date(`${unique[i - 1]}T12:00:00`);
    const curr = new Date(`${unique[i]}T12:00:00`);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) streak += 1;
    else break;
  }
  return streak;
}

function lessonTitle(id: string): string {
  const curriculum = getProfessionalCurriculum();
  for (const topic of curriculum.topics) {
    const lesson = topic.lessons.find(
      (item) => item.id.toUpperCase() === id.toUpperCase()
    );
    if (lesson) return lesson.title;
  }
  return id;
}

function ticketMinutes(ticket: TicketProgressV1): number {
  if (!ticket.opened_at) return 0;
  const start = Date.parse(ticket.opened_at);
  if (!Number.isFinite(start)) return 0;
  const stamps = [ticket.closed_at, ...ticket.attempts.map((attempt) => attempt.sent_at)]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));
  const end = stamps.length > 0 ? Math.max(...stamps) : start;
  const minutes = Math.max(0, (end - start) / 60000);
  return Math.min(PRACTICE_CAP_MINUTES, Math.round(minutes));
}

function activityDays(ticket: TicketProgressV1): string[] {
  const stamps = [
    ticket.opened_at,
    ticket.closed_at,
    ...ticket.attempts.map((attempt) => attempt.sent_at),
  ];
  return stamps
    .filter((value): value is string => Boolean(value))
    .map((value) => dayKey(value))
    .filter((value): value is string => Boolean(value));
}

function standing(proof: {
  roleTitle: string;
  ticketsClosed: number;
  lessonsDone: number;
  lessonsTotal: number;
  studentDays: number[];
}): string {
  const parts = [`${proof.roleTitle} at Finova Technologies.`];
  if (proof.lessonsDone > 0) {
    parts.push(
      `${proof.lessonsDone} of ${proof.lessonsTotal} lessons finished.`
    );
  }
  if (proof.ticketsClosed > 0) {
    parts.push(
      `${proof.ticketsClosed} ticket${proof.ticketsClosed === 1 ? "" : "s"} closed on the desk.`
    );
  }
  if (proof.studentDays.length > 0) {
    parts.push(
      `${proof.studentDays.length} student day${proof.studentDays.length === 1 ? "" : "s"} finished.`
    );
  }
  if (parts.length === 1) {
    parts.push("The desk has not written a record yet.");
  }
  return parts.join(" ");
}

export function buildCloudProof(now = new Date()): CloudProof {
  const roleId = getCurrentProRoleId() as ProRoleId;
  const role = getProRole(roleId);
  const progress = roleLessonProgress(roleId);
  const mailbox = loadMailboxProgress(roleId);
  const catalog = listL1MailboxTickets();
  const byId = new Map(catalog.map((ticket) => [ticket.ticket_id, ticket]));
  const records = Object.values(mailbox.tickets);

  const opened = records.filter((ticket) => ticket.opened_at || ticket.state !== "unread");
  const closed = records.filter((ticket) => ticket.state === "closed");
  const practiceMinutes = records.reduce((sum, ticket) => sum + ticketMinutes(ticket), 0);
  const days = records.flatMap(activityDays);
  const streak = days.length > 0 ? calculateStreak(days, now) : null;

  const triageReady = opened.filter((ticket) => {
    const catalogTicket = byId.get(ticket.ticket_id);
    const total = catalogTicket?.work.steps.length ?? Object.keys(ticket.steps).length;
    if (total === 0) return false;
    const done = Object.values(ticket.steps).filter((step) => step === "done").length;
    return done > 0;
  });
  const stepTotals = opened.reduce(
    (sum, ticket) => {
      const catalogTicket = byId.get(ticket.ticket_id);
      const total = catalogTicket?.work.steps.length ?? Object.keys(ticket.steps).length;
      const done = Object.values(ticket.steps).filter((step) => step === "done").length;
      return { done: sum.done + done, total: sum.total + total };
    },
    { done: 0, total: 0 }
  );
  const replied = opened.filter((ticket) => ticket.attempts.length > 0);
  const replyAverage =
    replied.length === 0
      ? 0
      : replied.reduce((sum, ticket) => sum + (ticket.best_score ?? 0), 0) / replied.length;

  const earliest = records
    .map((ticket) => ticket.opened_at)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  const didTickets = closed
    .slice()
    .sort((a, b) => (b.closed_at || "").localeCompare(a.closed_at || ""))
    .map((ticket) => ({
      id: ticket.ticket_id,
      subject: byId.get(ticket.ticket_id)?.email.subject || ticket.ticket_id,
      when: ticket.closed_at || "",
      score: ticket.best_score ?? null,
      attempts: ticket.attempts.length,
    }));

  const didLessons = getCompletedProLessonIds().map((id) => ({
    id,
    title: lessonTitle(id),
  }));

  const studentDays = Array.from({ length: STUDENT_DAYS }, (_, index) => index + 1).filter(
    (day) => isDayWorkspaceComplete(day)
  );

  const doingTickets = records
    .filter((ticket) => ticket.state !== "closed" && ticket.state !== "unread")
    .map((ticket) => {
      const catalogTicket = byId.get(ticket.ticket_id);
      const stepsTotal = catalogTicket?.work.steps.length ?? Object.keys(ticket.steps).length;
      const stepsDone = Object.values(ticket.steps).filter((step) => step === "done").length;
      return {
        id: ticket.ticket_id,
        subject: catalogTicket?.email.subject || ticket.ticket_id,
        stepsDone,
        stepsTotal,
      };
    });

  const nextId =
    progress.remainingIds.find(
      (id) => isProLessonUnlocked(id) && !isProLessonComplete(id)
    ) || null;

  const triageValue =
    opened.length === 0 ? 0 : Math.round((triageReady.length / opened.length) * 100);
  const investigationValue =
    stepTotals.total === 0 ? 0 : Math.round((stepTotals.done / stepTotals.total) * 100);
  const replyValue = replied.length === 0 ? 0 : Math.round(replyAverage * 100);
  const resolutionValue =
    opened.length === 0 ? 0 : Math.round((closed.length / opened.length) * 100);
  const lessonsValue =
    progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);

  const radar: ProofRadarAxis[] = [
    {
      axis: "Triage",
      value: triageValue,
      evidence: opened.length > 0,
      note:
        opened.length === 0
          ? "Opens when a ticket is read"
          : `${triageReady.length} of ${opened.length} opened tickets have work started`,
    },
    {
      axis: "Investigation",
      value: investigationValue,
      evidence: stepTotals.total > 0,
      note:
        stepTotals.total === 0
          ? "Counted from console steps"
          : `${stepTotals.done} of ${stepTotals.total} console steps finished`,
    },
    {
      axis: "Reply",
      value: replyValue,
      evidence: replied.length > 0,
      note:
        replied.length === 0
          ? "Scored when a reply is sent"
          : `Average across ${replied.length} sent repl${replied.length === 1 ? "y" : "ies"}`,
    },
    {
      axis: "Resolution",
      value: resolutionValue,
      evidence: opened.length > 0,
      note:
        opened.length === 0
          ? "Closed tickets raise this"
          : `${closed.length} of ${opened.length} opened tickets closed`,
    },
    {
      axis: "Lessons",
      value: lessonsValue,
      evidence: progress.total > 0 && progress.done > 0,
      note:
        progress.total === 0
          ? "This role has no lessons yet"
          : `${progress.done} of ${progress.total} role lessons finished`,
    },
  ];

  const nextRole = role?.next_role_id ? getProRole(role.next_role_id) : null;

  const roleTitle = role?.title || FINOVA_HIRE.role;
  const base = {
    roleTitle,
    ticketsClosed: closed.length,
    lessonsDone: progress.done,
    lessonsTotal: progress.total,
    studentDays,
  };

  return {
    roleTitle,
    services: role?.services ?? [],
    company: FINOVA_HIRE.company,
    account: FINOVA_HIRE.account,
    verifiedLine: earliest
      ? `Verified from desk activity since ${new Date(earliest).toLocaleDateString()}. Not self-reported.`
      : "No desk activity yet. Not self-reported.",
    ticketsClosed: closed.length,
    lessonsDone: progress.done,
    lessonsTotal: progress.total,
    practiceMinutes,
    streakDays: streak,
    radar,
    didTickets,
    didLessons,
    studentDays,
    readiness: isReadinessPassed(),
    doingTickets,
    nextLesson: nextId ? { id: nextId, title: lessonTitle(nextId) } : null,
    nextRoleTitle: nextRole?.title ?? null,
    gateLessons: role?.mastery_gate.min_lessons_complete ?? progress.total,
    openedTickets: opened.length,
    canPromote: canPromoteFromRole(roleId),
    standing: standing(base),
  };
}

export function formatPractice(minutes: number): string {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

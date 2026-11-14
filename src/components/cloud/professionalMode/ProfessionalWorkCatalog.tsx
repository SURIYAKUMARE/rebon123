import { useMemo, useState } from "react";
import { AwsWorkspaceConsole } from "@/components/cloud/awsConsole/AwsWorkspaceConsole";
import { RebonModeSwitcher } from "@/components/cloud/RebonModeSwitcher";
import { FinovaMailPane } from "@/components/cloud/professionalMode/FinovaMailPane";
import { FinovaTicketBoard } from "@/components/cloud/professionalMode/FinovaTicketBoard";
import { consoleViewForTicket } from "@/components/cloud/professionalMode/finovaDesk";
import { listL1MailboxTickets } from "@/data/cloud/professional_mode/mailboxLoader";
import {
  countClosed,
  getTicketProgress,
  markWorkDone,
  openTicket,
} from "@/data/cloud/proMailboxProgress";
import { getCurrentProRoleId } from "@/data/cloud/professionalRoleProgress";

type Stage = "board" | "gate" | "mail" | "console" | "reply" | "sandbox";

/**
 * Finova desk — card per ticket, mail first, console second, reply last.
 */
export function ProfessionalWorkCatalog() {
  const roleId = getCurrentProRoleId();
  const tickets = useMemo(() => listL1MailboxTickets(), []);
  const [stage, setStage] = useState<Stage>("board");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const bump = () => setTick((n) => n + 1);
  void tick;

  const active = activeId
    ? tickets.find((ticket) => ticket.ticket_id === activeId) ?? null
    : null;
  const closed = countClosed(roleId);

  const stateOf = (ticketId: string) =>
    getTicketProgress(roleId, ticketId)?.state || "unread";

  const stageFor = (ticketId: string): Stage => {
    const prog = getTicketProgress(roleId, ticketId);
    if (!prog || prog.state === "unread") return "gate";
    if (prog.state === "closed") return "mail";
    if (prog.state === "work_done" || prog.needs_revision) return "reply";
    if (prog.state === "in_progress") return "mail";
    return "gate";
  };

  if ((stage === "console" || stage === "sandbox") && (active || stage === "sandbox")) {
    const ticket = stage === "console" ? active : null;
    return (
      <AwsWorkspaceConsole
        onBack={() => {
          if (ticket) {
            markWorkDone(roleId, ticket.ticket_id);
            setStage("reply");
            bump();
            return;
          }
          setStage("board");
        }}
        initialView={ticket ? consoleViewForTicket(ticket.service) : "home"}
        ticket={
          ticket
            ? {
                from: `${ticket.email.from.name} <${ticket.email.from.email}>`,
                subject: ticket.email.subject,
                body: ticket.email.body,
                priority: ticket.email.priority,
              }
            : null
        }
        onFinished={
          ticket
            ? () => {
                markWorkDone(roleId, ticket.ticket_id);
                setStage("reply");
                bump();
              }
            : undefined
        }
      />
    );
  }

  const progress = getTicketProgress(roleId, active?.ticket_id || "");

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-30 flex flex-col bg-[#070b12] text-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff9900] text-sm font-black text-[#232f3e]">
            F
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Finova Technologies</p>
            <p className="text-[11px] text-slate-400">
              Cloud Support · L1 desk · {closed}/{tickets.length || 0} closed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStage("sandbox")}
            className="hidden rounded-lg border border-white/10 px-3 py-2 text-[12px] text-slate-400 hover:text-white sm:inline"
          >
            Free sandbox
          </button>
          <RebonModeSwitcher section="work" />
        </div>
      </header>
      <p className="shrink-0 border-b border-white/[0.04] px-4 py-2 text-[12px] text-slate-400 md:px-5">
        Open a ticket, read the mail, do the work in the console, then reply
        with what you did.
      </p>

      {stage === "board" || !active ? (
        <FinovaTicketBoard
          tickets={tickets}
          stateOf={stateOf}
          onOpen={(ticketId) => {
            setActiveId(ticketId);
            setStage(stageFor(ticketId));
          }}
        />
      ) : (
        <FinovaMailPane
          key={active.ticket_id}
          ticket={active}
          tickets={tickets}
          stage={stage === "reply" ? "reply" : stage === "mail" ? "mail" : "gate"}
          roleId={roleId}
          draft={progress?.draft || ""}
          closed={progress?.state === "closed"}
          stateOf={stateOf}
          onPick={(ticketId) => {
            setActiveId(ticketId);
            setStage(stageFor(ticketId));
            bump();
          }}
          onOpenMail={() => {
            openTicket(roleId, active.ticket_id);
            setStage("mail");
            bump();
          }}
          onEnterConsole={() => setStage("console")}
          onBackToBoard={() => {
            setStage("board");
            setActiveId(null);
            bump();
          }}
          onSent={bump}
        />
      )}
    </div>
  );
}

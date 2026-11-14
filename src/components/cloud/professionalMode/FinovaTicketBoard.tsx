import { FINOVA_LANES, priorityTone } from "@/components/cloud/professionalMode/finovaDesk";
import type { ProMailboxTicketV1 } from "@/types/proMailbox";

type Props = {
  tickets: ProMailboxTicketV1[];
  stateOf: (ticketId: string) => string;
  onOpen: (ticketId: string) => void;
};

export function FinovaTicketBoard({ tickets, stateOf, onOpen }: Props) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-3 md:p-4">
      {FINOVA_LANES.map((lane) => {
        const list = tickets.filter((t) => t.service === lane.id);
        const closed = list.filter((t) => stateOf(t.ticket_id) === "closed").length;
        return (
          <section
            key={lane.id}
            className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1220]"
          >
            <header className="flex items-end justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
                  {lane.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">{lane.blurb}</p>
              </div>
              <p className="font-mono text-[11px] text-slate-400">
                {closed}/{list.length}
              </p>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {list.map((ticket) => {
                const state = stateOf(ticket.ticket_id);
                return (
                  <button
                    key={ticket.ticket_id}
                    type="button"
                    onClick={() => onOpen(ticket.ticket_id)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#121a2b] p-3.5 text-left transition hover:border-amber-400/40 hover:bg-[#162033]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${priorityTone(ticket.email.priority)}`}
                      >
                        {ticket.email.priority}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {ticket.ticket_id}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-snug text-slate-100">
                      {ticket.email.subject}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {ticket.email.from.name}
                      <span className="text-slate-600"> · </span>
                      {ticket.email.from.title || "Finova"}
                    </p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-amber-200/80">
                      {state === "closed"
                        ? "Closed"
                        : state === "work_done"
                          ? "Reply pending"
                          : state === "in_progress"
                            ? "In progress"
                            : "Open mail"}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

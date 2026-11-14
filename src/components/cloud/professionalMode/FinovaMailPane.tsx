import { useState } from "react";
import { ArrowLeft, Mail, Paperclip, Star } from "lucide-react";
import { priorityTone } from "@/components/cloud/professionalMode/finovaDesk";
import { gradeText } from "@/lib/keywordGrader";
import { isAcceptAnyAnswerActive } from "@/data/cloud/ephemeralProgress";
import {
  getTicketProgress,
  recordReplyAttempt,
  saveDraft,
} from "@/data/cloud/proMailboxProgress";
import type { ProRoleId } from "@/data/cloud/professionalRoleProgress";
import type { ProMailboxTicketV1 } from "@/types/proMailbox";

const MAIL_HEADINGS = [
  "WHAT HAPPENED",
  "WHAT YOU NEED TO DO",
  "DO NOT",
  "REPLY WITH",
] as const;

function MailLetter({ body }: { body: string }) {
  const blocks: { title: string; text: string }[] = [];
  let title = "";
  let lines: string[] = [];
  const flush = () => {
    const text = lines.join("\n").trim();
    if (title || text) blocks.push({ title, text });
    lines = [];
  };
  for (const line of body.split("\n")) {
    const heading = MAIL_HEADINGS.find((item) => line.trim() === item);
    if (heading) {
      flush();
      title = heading;
    } else {
      lines.push(line);
    }
  }
  flush();
  if (blocks.length === 1 && !blocks[0].title) {
    return (
      <pre className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-[#e8eaed]">
        {body}
      </pre>
    );
  }
  const tone: Record<string, string> = {
    "WHAT YOU NEED TO DO": "border-[#8ab4f8]/30 bg-[#8ab4f8]/10",
    "DO NOT": "border-[#f28b82]/30 bg-[#f28b82]/10",
    "REPLY WITH": "border-[#fdd663]/25 bg-[#fdd663]/10",
  };
  return (
    <div className="space-y-3">
      {blocks.map((block) => (
        <section
          key={block.title || "intro"}
          className={
            block.title
              ? `rounded-lg border px-4 py-3 ${tone[block.title] || "border-white/10"}`
              : ""
          }
        >
          {block.title ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9aa0a6]">
              {block.title}
            </p>
          ) : null}
          <pre className="mt-1 whitespace-pre-wrap font-sans text-[15px] leading-7 text-[#e8eaed]">
            {block.text}
          </pre>
        </section>
      ))}
    </div>
  );
}

type Stage = "gate" | "mail" | "reply";

type Props = {
  ticket: ProMailboxTicketV1;
  tickets: ProMailboxTicketV1[];
  stage: Stage;
  roleId: ProRoleId;
  draft: string;
  closed: boolean;
  stateOf: (ticketId: string) => string;
  onPick: (ticketId: string) => void;
  onOpenMail: () => void;
  onEnterConsole: () => void;
  onBackToBoard: () => void;
  onSent: () => void;
};

export function FinovaMailPane({
  ticket,
  tickets,
  stage,
  roleId,
  draft,
  closed,
  stateOf,
  onPick,
  onOpenMail,
  onEnterConsole,
  onBackToBoard,
  onSent,
}: Props) {
  const mail = ticket.email;
  const [reply, setReply] = useState(draft);
  const [feedback, setFeedback] = useState<string[] | null>(null);
  const opened = stage !== "gate";

  return (
    <div className="flex min-h-0 flex-1 bg-[#202124] text-[#e8eaed]">
      <aside className="flex w-[272px] shrink-0 flex-col border-r border-[#3c4043] bg-[#1f1f1f]">
        <div className="px-3 py-3">
          <button
            type="button"
            onClick={onBackToBoard}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-[#9aa0a6] hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All desks
          </button>
          <p className="px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#9aa0a6]">
            Inbox
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tickets.map((row) => {
            const active = row.ticket_id === ticket.ticket_id;
            const state = stateOf(row.ticket_id);
            const unread = state === "unread";
            return (
              <button
                key={row.ticket_id}
                type="button"
                onClick={() => onPick(row.ticket_id)}
                className={`flex w-full gap-3 border-b border-[#3c4043]/60 px-4 py-3 text-left ${
                  active ? "bg-[#303134]" : "hover:bg-[#28292b]"
                }`}
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    unread ? "bg-[#8ab4f8]" : "bg-transparent"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-[13px] ${
                        unread ? "font-semibold text-white" : "text-[#e8eaed]"
                      }`}
                    >
                      {row.email.from.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-[#9aa0a6]">
                      {row.email.priority}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-[13px] ${
                      unread ? "font-medium text-[#e8eaed]" : "text-[#bdc1c6]"
                    }`}
                  >
                    {row.email.subject}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-[#9aa0a6]">
                    {state === "closed" ? "Closed" : row.service} · {row.ticket_id}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#202124]">
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#3c4043] px-4">
          <div className="flex items-center gap-2 text-[13px] text-[#9aa0a6]">
            <Mail className="h-4 w-4" />
            <span>cloud-support@finova.tech</span>
            <span className="text-[#5f6368]">/</span>
            <span>{ticket.ticket_id}</span>
          </div>
          <div className="flex items-center gap-2">
            {opened && !closed ? (
              <button
                type="button"
                onClick={onEnterConsole}
                className="rounded-full bg-[#8ab4f8] px-4 py-1.5 text-[13px] font-medium text-[#202124] hover:bg-[#aecbfa]"
              >
                {stage === "reply" ? "Back to console" : "Enter console"}
              </button>
            ) : null}
          </div>
        </div>

        {!opened ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-[#3c4043] px-8 py-6">
              <h2 className="text-[22px] font-normal text-[#e8eaed]">
                {mail.subject}
              </h2>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5f6368] text-sm font-medium text-white">
                  {mail.from.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm text-[#e8eaed]">{mail.from.name}</p>
                  <p className="text-xs text-[#9aa0a6]">Unread · {mail.received_at_label}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col items-start justify-center px-8">
              <p className="max-w-xl text-sm leading-6 text-[#bdc1c6]">
                This message is still closed. Open it to read what Finova needs.
                The console stays shut until you have read the request.
              </p>
              <button
                type="button"
                onClick={onOpenMail}
                className="mt-6 rounded-full bg-[#8ab4f8] px-5 py-2 text-sm font-medium text-[#202124] hover:bg-[#aecbfa]"
              >
                Open mail
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <article className="px-8 py-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-[22px] font-normal leading-snug text-[#e8eaed]">
                  {mail.subject}
                </h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${priorityTone(mail.priority)}`}
                >
                  {mail.priority}
                </span>
              </div>

              <div className="mt-5 flex gap-3 border-b border-[#3c4043] pb-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8ab4f8] text-sm font-medium text-[#202124]">
                  {mail.from.name.slice(0, 1)}
                </div>
                <div className="min-w-0 text-sm">
                  <p className="text-[#e8eaed]">
                    <span className="font-medium">{mail.from.name}</span>
                    <span className="text-[#9aa0a6]">
                      {" "}
                      &lt;{mail.from.email}&gt;
                    </span>
                  </p>
                  <p className="text-xs text-[#9aa0a6]">
                    to{" "}
                    {mail.to.map((person) => person.email).join(", ")}
                    {" · "}
                    {mail.received_at_label}
                    {mail.from.title ? ` · ${mail.from.title}` : ""}
                  </p>
                </div>
                <Star className="ml-auto h-4 w-4 text-[#9aa0a6]" />
              </div>

              <div className="py-6">
                <MailLetter body={mail.body} />
                {mail.attachments?.length ? (
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {mail.attachments.map((file) => (
                      <div
                        key={file.name}
                        className="rounded-xl border border-[#3c4043] bg-[#303134] p-3"
                      >
                        <p className="flex items-center gap-2 text-xs text-[#8ab4f8]">
                          <Paperclip className="h-3.5 w-3.5" />
                          {file.name}
                        </p>
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-[#bdc1c6]">
                          {file.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {closed && stage !== "reply" ? (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  <p className="font-medium">Ticket closed</p>
                  <p className="mt-1 text-emerald-100/80">{ticket.debrief.english}</p>
                  <button
                    type="button"
                    className="mt-3 text-sm text-[#8ab4f8]"
                    onClick={onBackToBoard}
                  >
                    Back to desk
                  </button>
                </div>
              ) : null}

              {stage === "reply" ? (
                <div className="mt-2 rounded-2xl border border-[#3c4043] bg-[#292a2d] p-4">
                  <p className="text-sm text-[#e8eaed]">
                    Reply to {mail.from.name}
                  </p>
                  <p className="mt-1 text-xs text-[#9aa0a6]">Re: {mail.subject}</p>
                  <textarea
                    value={reply}
                    onChange={(event) => {
                      setReply(event.target.value);
                      saveDraft(roleId, ticket.ticket_id, event.target.value);
                    }}
                    rows={7}
                    placeholder="What you checked, what you changed, and what they should do next."
                    className="mt-3 w-full rounded-xl border border-[#3c4043] bg-[#202124] px-3 py-2 text-sm text-[#e8eaed] outline-none placeholder:text-[#9aa0a6]"
                  />
                  {feedback ? (
                    <ul className="mt-2 space-y-1 text-sm text-[#fdd663]">
                      {feedback.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                  {closed ? (
                    <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                      <p className="font-medium">Sent. Ticket closed.</p>
                      <p className="mt-1">{ticket.debrief.english}</p>
                      <button
                        type="button"
                        className="mt-3 text-sm text-[#8ab4f8]"
                        onClick={onBackToBoard}
                      >
                        Back to desk
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-3 rounded-full bg-[#8ab4f8] px-5 py-2 text-sm font-medium text-[#202124]"
                      onClick={() => {
                        const result = isAcceptAnyAnswerActive()
                          ? {
                              pass: true,
                              score: 1,
                              feedback: ["Accepted (testing mode)."],
                            }
                          : gradeText(reply, ticket.reply);
                        const prior =
                          getTicketProgress(roleId, ticket.ticket_id)?.attempts
                            .length ?? 0;
                        const forceModel =
                          !result.pass &&
                          prior + 1 >=
                            (ticket.reply.max_attempts_before_model || 3);
                        recordReplyAttempt(
                          roleId,
                          ticket.ticket_id,
                          {
                            sent_at: new Date().toISOString(),
                            body: reply,
                            score: result.score,
                            passed: result.pass,
                            feedback: result.feedback,
                          },
                          result.pass || forceModel
                        );
                        if (result.pass) {
                          setFeedback(["Sent. Desk lead accepted your reply."]);
                        } else if (forceModel) {
                          setFeedback(["Model reply:", ticket.reply.model_reply]);
                        } else {
                          setFeedback(result.feedback);
                        }
                        onSent();
                      }}
                    >
                      Send reply
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          </div>
        )}
      </section>
    </div>
  );
}

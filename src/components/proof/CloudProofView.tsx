import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { buildCloudProof, formatPractice } from "@/data/cloud/proofSelectors";
import {
  identityComplete,
  loadProofIdentity,
  saveProofIdentity,
  type ProofIdentity,
} from "@/data/cloud/proofIdentity";

const EMERALD = "#10B981";

function formatWhen(iso: string): string {
  if (!iso) return "—";
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "—";
  return new Date(time).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CloudProofView() {
  const { user } = useAuth();
  const record = useMemo(() => buildCloudProof(), []);
  const fallbackName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const [identity, setIdentity] = useState<ProofIdentity>(() => {
    const stored = loadProofIdentity();
    if (stored.name || !fallbackName) return stored;
    return { ...stored, name: fallbackName };
  });
  const [editing, setEditing] = useState(() => !identityComplete(loadProofIdentity()));
  const [error, setError] = useState("");

  const lessonPct =
    record.lessonsTotal > 0
      ? Math.round((record.lessonsDone / record.lessonsTotal) * 100)
      : 0;
  const gatePct =
    record.gateLessons > 0
      ? Math.min(100, Math.round((record.lessonsDone / record.gateLessons) * 100))
      : lessonPct;

  const onSave = (event: FormEvent) => {
    event.preventDefault();
    try {
      setIdentity(saveProofIdentity(identity));
      setEditing(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check the details.");
    }
  };

  const setField = (field: keyof ProofIdentity, value: string) => {
    setIdentity((current) => ({ ...current, [field]: value }));
  };

  const ledger = [
    ...record.didTickets.map((ticket) => ({
      key: ticket.id,
      when: formatWhen(ticket.when),
      kind: "Desk",
      title: ticket.subject,
      result:
        ticket.score == null
          ? "Closed"
          : `Reply ${Math.round(ticket.score * 100)}`,
    })),
    ...record.didLessons.map((lesson) => ({
      key: lesson.id,
      when: lesson.id,
      kind: "Learn",
      title: lesson.title,
      result: "Finished",
    })),
    ...record.studentDays.map((day) => ({
      key: `day-${day}`,
      when: `Day ${day}`,
      kind: "Student",
      title: `Student desk, day ${day}`,
      result: "Finished",
    })),
  ];

  return (
    <div className="h-dvh overflow-y-auto bg-[#09090B] text-[#FAFAFA]">
      <article className="px-8 pb-32 pt-28 md:px-16 md:pt-36">
        <header>
          <p className="font-body text-sm" style={{ color: EMERALD }}>
            {record.company}
          </p>
          {editing ? (
            <IdentityForm
              identity={identity}
              error={error}
              onField={setField}
              onSave={onSave}
            />
          ) : (
            <>
              <h1 className="mt-8 max-w-5xl font-display text-[clamp(3.4rem,7vw,6.75rem)] font-extrabold leading-[0.88] text-white">
                {identity.name}
              </h1>
              <p className="mt-8 max-w-2xl font-body text-2xl leading-snug text-zinc-200 md:text-3xl">
                {record.roleTitle}
              </p>
              <p className="mt-3 font-body text-lg text-zinc-500">{record.account}</p>
              <dl className="mt-14 grid max-w-5xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
                <Fact label="Age" value={identity.age} />
                <Fact label="Department" value={identity.department} />
                <Fact label="College" value={identity.college} />
                <Fact label="Year of study" value={`Year ${identity.year}`} />
              </dl>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-8 font-body text-sm text-zinc-500 hover:text-zinc-200"
              >
                Correct identity
              </button>
            </>
          )}
          <p className="mt-16 max-w-3xl font-body text-2xl leading-snug text-zinc-100 md:text-[1.75rem]">
            {record.standing}
          </p>
        </header>

        <section className="mt-20 grid gap-14 border-t border-white/10 pt-16 md:grid-cols-4">
          <Metric
            label="Tickets closed"
            value={String(record.ticketsClosed)}
            note={
              record.openedTickets === 0
                ? "None opened on this desk"
                : `${record.openedTickets} opened`
            }
          />
          <Metric
            label="Lessons finished"
            value={`${record.lessonsDone}`}
            note={`of ${record.lessonsTotal || 0} in this role · ${lessonPct}%`}
          />
          <Metric
            label="Time on the desk"
            value={formatPractice(record.practiceMinutes)}
            note="From open to reply, per ticket"
          />
          <Metric
            label="Active days"
            value={record.streakDays == null ? "—" : String(record.streakDays)}
            note={record.verifiedLine}
          />
        </section>

        <section className="mt-24 grid items-start gap-16 border-t border-white/10 pt-16 lg:grid-cols-[minmax(280px,0.9fr)_1.1fr]">
          <div>
            <h2 className="font-display text-3xl text-white md:text-4xl">The desk, measured</h2>
            <p className="mt-4 max-w-sm font-body text-base leading-7 text-zinc-400">
              Each score is the work already done. It moves when a lesson finishes or a ticket closes.
            </p>
            <div className="mt-8 h-[22rem]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={record.radar} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="rgba(255,255,255,0.14)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: "#D4D4D8", fontSize: 13 }} />
                  <Radar dataKey="value" stroke={EMERALD} fill={EMERALD} fillOpacity={0.22} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <ul className="space-y-8 pt-2">
            {record.radar.map((axis) => (
              <li key={axis.axis}>
                <div className="flex items-end justify-between gap-6">
                  <p className="font-body text-lg text-white">{axis.axis}</p>
                  <p className="font-display text-4xl leading-none text-white">{axis.value}</p>
                </div>
                <p className="mt-2 font-body text-base leading-7 text-zinc-400">{axis.note}</p>
                <div className="mt-4 h-[3px] bg-white/10">
                  <div className="h-[3px]" style={{ width: `${axis.value}%`, background: EMERALD }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-24 border-t border-white/10 pt-16">
          <h2 className="font-display text-3xl text-white md:text-4xl">Open now</h2>
          <ul className="mt-10 divide-y divide-white/10 border-y border-white/10">
            {record.nextLesson ? (
              <li className="flex flex-wrap items-end justify-between gap-4 py-7">
                <div>
                  <p className="font-body text-xl text-white">{record.nextLesson.title}</p>
                  <p className="mt-2 font-body text-base text-zinc-500">
                    Next lesson · {record.nextLesson.id}
                  </p>
                </div>
                <span className="font-body text-sm" style={{ color: EMERALD }}>
                  Learn
                </span>
              </li>
            ) : (
              <li className="py-7 font-body text-lg text-zinc-400">
                Every lesson for this role is finished.
              </li>
            )}
            {record.doingTickets.length === 0 ? (
              <li className="py-7 font-body text-lg text-zinc-400">No ticket is open.</li>
            ) : (
              record.doingTickets.map((ticket) => {
                const pct =
                  ticket.stepsTotal > 0
                    ? Math.round((ticket.stepsDone / ticket.stepsTotal) * 100)
                    : 0;
                return (
                  <li key={ticket.id} className="py-7">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <p className="font-body text-xl text-white">{ticket.subject}</p>
                      <p className="font-display text-2xl text-white">
                        {ticket.stepsDone}
                        <span className="text-zinc-500">/{ticket.stepsTotal}</span>
                      </p>
                    </div>
                    <p className="mt-2 font-body text-base text-zinc-500">{ticket.id}</p>
                    <div className="mt-4 h-[3px] bg-white/10">
                      <div className="h-[3px]" style={{ width: `${pct}%`, background: EMERALD }} />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <section className="mt-24 border-t border-white/10 pt-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display text-3xl text-white md:text-4xl">Where this leads</h2>
            <p className="font-display text-5xl text-white">
              {record.lessonsDone}
              <span className="text-zinc-500">/{record.gateLessons}</span>
            </p>
          </div>
          <div className="mt-8 h-[3px] bg-white/10">
            <div className="h-[3px]" style={{ width: `${gatePct}%`, background: EMERALD }} />
          </div>
          <p className="mt-8 max-w-2xl font-body text-2xl leading-snug text-zinc-100">
            {record.canPromote
              ? `The next role is open. ${record.nextRoleTitle || "Promotion"} is the desk after this one.`
              : record.nextRoleTitle
                ? `${record.nextRoleTitle} is the next desk. It opens when this role is earned.`
                : "This is the current desk."}
          </p>
          {record.services.length > 0 ? (
            <p className="mt-6 font-body text-lg text-zinc-400">{record.services.join("  ·  ")}</p>
          ) : null}
        </section>

        <section className="mt-24 border-t border-white/10 pt-16">
          <h2 className="font-display text-3xl text-white md:text-4xl">On the record</h2>
          {ledger.length === 0 ? (
            <p className="mt-8 font-body text-xl text-zinc-400">
              Closed tickets and finished lessons will list here.
            </p>
          ) : (
            <ul className="mt-8 border-t border-white/10">
              {ledger.map((row) => (
                <li
                  key={row.key}
                  className="grid gap-2 border-b border-white/10 py-7 md:grid-cols-[140px_88px_1fr_auto] md:items-baseline md:gap-8"
                >
                  <span className="font-body text-base text-zinc-500">{row.when}</span>
                  <span className="font-body text-base text-zinc-400">{row.kind}</span>
                  <span className="font-body text-xl text-white">{row.title}</span>
                  <span className="font-body text-base text-zinc-300 md:text-right">{row.result}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-body text-sm text-zinc-500">{label}</dt>
      <dd className="mt-2 font-body text-2xl text-white">{value}</dd>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <p className="font-body text-sm text-zinc-500">{label}</p>
      <p className="mt-4 font-display text-6xl leading-none text-white">{value}</p>
      <p className="mt-4 font-body text-base leading-6 text-zinc-400">{note}</p>
    </div>
  );
}

function IdentityForm({
  identity,
  error,
  onField,
  onSave,
}: {
  identity: ProofIdentity;
  error: string;
  onField: (field: keyof ProofIdentity, value: string) => void;
  onSave: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSave} className="mt-10 grid max-w-5xl gap-8 sm:grid-cols-2">
      <Field label="Name" value={identity.name} onChange={(value) => onField("name", value)} />
      <Field
        label="Age"
        value={identity.age}
        onChange={(value) => onField("age", value.replace(/\D/g, "").slice(0, 2))}
      />
      <Field
        label="Department"
        value={identity.department}
        onChange={(value) => onField("department", value)}
      />
      <Field
        label="College"
        value={identity.college}
        onChange={(value) => onField("college", value)}
      />
      <label className="font-body text-sm text-zinc-500 sm:col-span-2">
        Year of study
        <select
          value={identity.year}
          onChange={(event) => onField("year", event.target.value)}
          className="mt-2 w-full border-b border-white/25 bg-transparent py-3 font-body text-2xl text-white outline-none"
        >
          <option value="" className="bg-[#121214]">
            Select
          </option>
          {["1", "2", "3", "4", "5"].map((year) => (
            <option key={year} value={year} className="bg-[#121214]">
              Year {year}
            </option>
          ))}
        </select>
      </label>
      <div>
        <button type="submit" className="font-body text-lg font-semibold" style={{ color: EMERALD }}>
          Save
        </button>
        {error ? <p className="mt-3 font-body text-sm text-rose-300">{error}</p> : null}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="font-body text-sm text-zinc-500">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border-b border-white/25 bg-transparent py-3 font-body text-2xl text-white outline-none"
      />
    </label>
  );
}

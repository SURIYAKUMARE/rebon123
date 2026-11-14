import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfessionalCurriculum } from "@/data/cloud/professional_mode";
import { useSettings } from "@/contexts/SettingsContext";
import { isProfessionalUnlocked } from "@/data/cloud/studentModeProgress";
import { TESTING_UNLOCK_ALL_LESSONS } from "@/data/cloud/ephemeralProgress";
import { CloudDeskShell } from "@/components/cloud/CloudDeskShell";
import { RebonModeSwitcher } from "@/components/cloud/RebonModeSwitcher";
import { listL1MailboxTickets } from "@/data/cloud/professional_mode/mailboxLoader";
import type { CloudRole } from "@/data/cloud/cloudRole";
import {
  FINOVA_HIRE,
  MVP_LIVE_ROLE_TRACKS,
  ROLE_TRACK_LABELS,
} from "@/data/cloud/roleTrack";
import { CsaHireOnboarding } from "@/components/cloud/professionalMode/CsaHireOnboarding";
import { hasSeenCsaHire } from "@/components/cloud/professionalMode/csaHireStorage";
import {
  canPromoteFromRole,
  CONSOLE_FIRST_LESSON_ID,
  getCurrentProRoleId,
  getProRole,
  isProLessonComplete,
  isProLessonUnlocked,
  promoteToNextRole,
  roleLessonProgress,
  servicesLabel,
} from "@/data/cloud/professionalRoleProgress";

interface Props {
  cloudRole?: CloudRole | null;
}

/**
 * Professional Learn — show ONLY the active Finova role's lessons.
 * Six services is the ladder ceiling; each role learns its must-know set only.
 * Promote → next role unlocks that role's services/lessons.
 */
export function ProfessionalLessonCatalog({ cloudRole }: Props) {
  const navigate = useNavigate();
  const curriculum = useMemo(() => getProfessionalCurriculum(), []);
  const deskTickets = useMemo(() => listL1MailboxTickets(), []);
  const { teachLanguage, setTeachLanguage } = useSettings();
  const [showHire, setShowHire] = useState(() => !hasSeenCsaHire());
  const [roleTick, setRoleTick] = useState(0);

  const unlocked =
    cloudRole === "cloud_junior" ||
    cloudRole === "cloud_engineer" ||
    isProfessionalUnlocked();

  const currentRoleId = useMemo(
    () => getCurrentProRoleId(cloudRole),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roleTick forces re-read after promote
    [cloudRole, roleTick]
  );
  const currentRole = getProRole(currentRoleId);
  const progress = useMemo(
    () => roleLessonProgress(currentRoleId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentRoleId, roleTick]
  );
  const canPromote = canPromoteFromRole(currentRoleId);
  const nextRole = currentRole?.next_role_id
    ? getProRole(currentRole.next_role_id)
    : null;

  /** Only lessons for the active desk role; PM-0 always first.
   * Testing: show all live-role lessons across the ladder. */
  const roleTopics = useMemo(() => {
    const sessions = new Set(currentRole?.lesson_sessions ?? []);
    sessions.add("PM-0");
    const showAll = TESTING_UNLOCK_ALL_LESSONS;
    const topics = curriculum.topics
      .map((topic) => ({
        ...topic,
        lessons: topic.lessons
          .filter((l) => {
            if (!l.available) return false;
            if (showAll) {
              return Boolean(
                l.role_tracks?.some((t) =>
                  (MVP_LIVE_ROLE_TRACKS as readonly string[]).includes(t)
                )
              );
            }
            return (
              sessions.has(topic.session) &&
              Boolean(l.role_tracks?.includes(currentRoleId))
            );
          })
          .slice()
          .sort((a, b) => {
            if (a.id === CONSOLE_FIRST_LESSON_ID) return -1;
            if (b.id === CONSOLE_FIRST_LESSON_ID) return 1;
            return (a.role_order ?? 99) - (b.role_order ?? 99);
          }),
      }))
      .filter((t) => t.lessons.length > 0);
    return topics.sort((a, b) => {
      if (a.session === "PM-0") return -1;
      if (b.session === "PM-0") return 1;
      return 0;
    });
  }, [curriculum.topics, currentRole, currentRoleId]);

  const trackLabel =
    ROLE_TRACK_LABELS[currentRoleId] || currentRole?.title || "Desk role";

  if (!unlocked) {
    return (
      <CloudDeskShell
        section="learn"
        title="Console path"
        subtitle="Professional Mode unlocks after Student Mode and the Console Readiness Check."
        progress={{ done: 0, total: 9 }}
      >
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 px-6 py-10 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-300">
            Locked
          </p>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Complete Lessons 1–10 in Student Mode and pass the Console Readiness
            Check (70%) to unlock Ren&apos;s console teaching path — or place as
            Cloud Junior / Engineer.
          </p>
        </div>
      </CloudDeskShell>
    );
  }

  const ticketsFor = (lessonId: string) =>
    deskTickets.filter((ticket) => ticket.source_lessons.includes(lessonId));

  return (
    <>
    {showHire && (
      <CsaHireOnboarding onContinue={() => setShowHire(false)} />
    )}
    <div className="fixed inset-x-0 bottom-0 top-16 z-30 flex flex-col bg-[#0c1017] text-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300/80">
            Learn · {trackLabel}
          </p>
          <h1 className="mt-1 text-lg font-semibold text-white">
            {FINOVA_HIRE.company} · {currentRole?.title || FINOVA_HIRE.role}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-slate-400 sm:block">
            {progress.done}/{progress.total || 1} lessons
          </p>
          <RebonModeSwitcher section="learn" />
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside className="border-b border-white/[0.06] p-5 lg:border-b-0 lg:border-r">
          <p className="font-mono text-xs text-sky-300">{FINOVA_HIRE.account}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Lessons teach the base for the desk. Work tickets use that base.
            The mail states the request. You explore the service and solve it.
            The lesson does not click the console for you.
          </p>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            L1 desk practice is Console, IAM, and CloudWatch. VPC, EC2, S3, and
            Cost lessons are the next role. They do not have L1 tickets yet.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(["english", "tanglish"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setTeachLanguage(lang)}
                className={`rounded-full px-3 py-1 text-xs capitalize ${
                  teachLanguage === lang
                    ? "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40"
                    : "text-slate-400 ring-1 ring-white/10"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          {canPromote && nextRole ? (
            <button
              type="button"
              className="mt-5 rounded-lg bg-sky-500/20 px-3 py-2 text-xs text-sky-100 ring-1 ring-sky-400/40"
              onClick={() => {
                if (promoteToNextRole(currentRoleId)) {
                  setRoleTick((n) => n + 1);
                  setShowHire(true);
                }
              }}
            >
              Promote → {nextRole.title}
            </button>
          ) : null}
          <button
            type="button"
            className="mt-4 block text-xs text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
            onClick={() => setShowHire(true)}
          >
            Replay hire briefing
          </button>
        </aside>
        <div className="min-h-0 overflow-y-auto p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <p className="xl:col-span-2 text-xs text-slate-500">
              Services for this role: {servicesLabel(currentRole?.services ?? [])}
            </p>
            {roleTopics.map((topic) => (
              <section
                key={topic.session}
                className="rounded-2xl border border-white/[0.08] bg-[#121826] p-4"
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/70">
                  {topic.session}
                </p>
                <h2 className="mt-1 text-base font-semibold text-white">{topic.title}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">{topic.description}</p>
                <div className="mt-3 divide-y divide-white/[0.06]">
                  {topic.lessons.map((lesson) => {
                    const done = isProLessonComplete(lesson.id);
                    const unlocked = isProLessonUnlocked(lesson.id);
                    const linked = ticketsFor(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          if (unlocked) navigate(`/lesson/${lesson.id}`);
                        }}
                        className="flex w-full flex-col gap-1 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-sm text-slate-100">
                            {lesson.id} · {lesson.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-500">
                            {done ? "Done" : `${lesson.duration_minutes} min`}
                          </span>
                        </span>
                        <span className="text-[12px] leading-5 text-slate-400">
                          {linked.length
                            ? `Desk uses this base · ${linked.length} ticket${linked.length === 1 ? "" : "s"} · ${linked.map((t) => t.ticket_id).join(", ")}`
                            : "Base for a later desk. No L1 ticket yet."}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

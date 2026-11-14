import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  getStudentCurriculum,
  getStudentLessonsForDay,
  getReadinessCheck,
} from "@/data/cloud/student_mode";
import {
  getStudentLanguage as getLang,
  setStudentLanguage,
  isDayUnlocked,
  isDayWorkspaceComplete,
  isReadinessAvailable,
  isReadinessPassed,
} from "@/data/cloud/studentModeProgress";
import { StudentLanguageToggle } from "@/components/cloud/studentMode/StudentLanguageToggle";
import { StudentReadinessCheck } from "@/components/cloud/studentMode/StudentReadinessCheck";
import {
  CloudDeskShell,
  CloudLessonRow,
  CloudPhaseBlock,
} from "@/components/cloud/CloudDeskShell";
import type { StudentLanguage } from "@/types/studentMode";
import type { CloudRole } from "@/data/cloud/cloudRole";
import { CLOUD_ROLE_LABELS } from "@/data/cloud/cloudRole";

interface Props {
  cloudRole?: CloudRole | null;
}

/**
 * Student Learn — 10 fundamentals lessons unlock sequentially; readiness after Lesson 10.
 */
export function StudentLessonCatalog({ cloudRole }: Props) {
  const navigate = useNavigate();
  const curriculum = useMemo(() => getStudentCurriculum(), []);
  const readiness = useMemo(() => getReadinessCheck(), []);
  const [language, setLanguage] = useState<StudentLanguage>(() => getLang());
  const [activeDay, setActiveDay] = useState<number | null>(
    () => curriculum.days[0]?.day ?? 1
  );
  const [showReadiness, setShowReadiness] = useState(false);
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => {
    setStudentLanguage(language);
  }, [language]);

  const doneDays = curriculum.days.filter((d) =>
    isDayWorkspaceComplete(d.day)
  ).length;

  const roleLabel = cloudRole ? CLOUD_ROLE_LABELS[cloudRole] : null;

  if (showReadiness) {
    return (
      <StudentReadinessCheck
        check={readiness}
        language={language}
        onClose={() => {
          setShowReadiness(false);
          setProgressTick((n) => n + 1);
        }}
        onRevisitDay={(day) => {
          setShowReadiness(false);
          setActiveDay(day);
        }}
      />
    );
  }

  return (
    <CloudDeskShell
      section="learn"
      title="Your path"
      subtitle={
        roleLabel
          ? `${roleLabel} · 10 short fundamentals with Ren — no console yet. Then Professional Mode.`
          : "10 short lessons with Ren on the board. Fundamentals only — console unlocks in Professional Mode."
      }
      actions={
        <StudentLanguageToggle
          language={language}
          onChange={setLanguage}
          section="learn"
        />
      }
      progress={{ done: doneDays, total: curriculum.days.length }}
    >
      {curriculum.days.map((d, pIndex) => {
        const lesson = getStudentLessonsForDay(d.day, language)[0];
        const title = lesson?.title || d.title;
        const mins = lesson?.duration_minutes;
        const isOpen = activeDay === d.day;
        const unlocked = isDayUnlocked(d.day);
        const complete = isDayWorkspaceComplete(d.day);

        return (
          <CloudPhaseBlock
            key={`${d.day}-${progressTick}`}
            section="learn"
            index={pIndex + 1}
            title={title}
            description={
              d.has_readiness_badge
                ? "Capstone — then Console Readiness unlocks Professional Mode."
                : "Cloud fundamentals with Ren — board + voice, no console."
            }
            meta={`Lesson ${d.day} of 10${mins ? ` · ${mins} min` : ""}${
              complete ? " · Done" : unlocked ? "" : " · Locked"
            }${d.has_readiness_badge ? " · Readiness" : ""}`}
            open={isOpen}
            onToggle={() => setActiveDay(isOpen ? null : d.day)}
          >
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <CloudLessonRow
                    section="learn"
                    title={title}
                    description={
                      unlocked
                        ? "Board session with Ren · doubt check at the end"
                        : "Complete the previous lesson to unlock"
                    }
                    meta={
                      complete
                        ? "Completed"
                        : mins
                          ? `${mins} min`
                          : unlocked
                            ? "Lesson"
                            : "Locked"
                    }
                    disabled={!unlocked}
                    onClick={() => {
                      if (unlocked) navigate(`/lesson/SM-D${d.day}`);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CloudPhaseBlock>
        );
      })}

      {isReadinessAvailable() && (
        <CloudPhaseBlock
          section="learn"
          index={curriculum.days.length + 1}
          title="Console Readiness Check"
          description="15 questions · 70% pass · unlocks Professional Mode"
          meta={
            isReadinessPassed()
              ? "Passed · Professional unlocked"
              : "Available after Lesson 10"
          }
          open={activeDay === 99}
          onToggle={() => setActiveDay(activeDay === 99 ? null : 99)}
        >
          <CloudLessonRow
            section="learn"
            title="Console Readiness Check"
            description="Exam mode — no hints. Ren stays quiet until you finish."
            meta={`${readiness.questions.length} questions`}
            onClick={() => setShowReadiness(true)}
          />
        </CloudPhaseBlock>
      )}
    </CloudDeskShell>
  );
}

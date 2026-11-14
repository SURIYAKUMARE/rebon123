import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  StudentLanguage,
  StudentWorkspaceFile,
  StudentWorkspaceItem,
} from "@/types/studentMode";
import {
  getCompletedItemIds,
  markDayWorkspaceComplete,
  markItemComplete,
} from "@/data/cloud/studentModeProgress";
import { gradeText } from "@/lib/keywordGrader";
import { progressGet, progressSet } from "@/data/cloud/ephemeralProgress";

interface Props {
  day: number;
  workspace: StudentWorkspaceFile;
  language: StudentLanguage;
  onComplete: () => void;
}

function hintFor(item: StudentWorkspaceItem, language: StudentLanguage) {
  return language === "tanglish"
    ? item.ren_hint_tanglish
    : item.ren_hint_english;
}

function scoreKey(day: number) {
  return `rebon_student_ws_score_${day}`;
}

function loadScore(day: number): { correct: number; total: number } {
  try {
    const raw = progressGet(scoreKey(day));
    if (!raw) return { correct: 0, total: 0 };
    const p = JSON.parse(raw);
    return {
      correct: Number(p.correct) || 0,
      total: Number(p.total) || 0,
    };
  } catch {
    return { correct: 0, total: 0 };
  }
}

function bumpScore(day: number, correct: boolean, totalItems: number) {
  const prev = loadScore(day);
  const next = {
    correct: prev.correct + (correct ? 1 : 0),
    total: Math.max(prev.total + 1, totalItems),
  };
  progressSet(scoreKey(day), JSON.stringify(next));
  return next;
}

function isItemCorrect(
  item: StudentWorkspaceItem,
  selected: number | null,
  textAnswer: string,
  tfChoice: boolean | null
): boolean {
  if (item.type === "true_false") {
    return tfChoice === item.correct;
  }
  if (item.type === "short_answer") {
    const result = gradeText(textAnswer, {
      accept_keywords: item.accept_keywords,
      required_groups: item.required_groups,
      min_words: 3,
    });
    return result.pass;
  }
  if (item.type === "account_id") {
    const expected = item.expected_answer.trim().toLowerCase();
    const given = textAnswer.trim().toLowerCase();
    return (
      given === expected ||
      given.includes(expected) ||
      expected.includes(given)
    );
  }
  return selected === item.correct_index;
}

export function StudentWorkspacePanel({
  day,
  workspace,
  language,
  onComplete,
}: Props) {
  const items = workspace.items;
  const threshold = workspace.pass_threshold ?? 0.75;
  const completed = useMemo(() => new Set(getCompletedItemIds(day)), [day]);
  const startIndex = Math.max(
    0,
    items.findIndex((i) => !completed.has(i.id))
  );
  const [index, setIndex] = useState(startIndex === -1 ? 0 : startIndex);
  const [selected, setSelected] = useState<number | null>(null);
  const [tfChoice, setTfChoice] = useState<boolean | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const item = items[index];
  if (!item) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        No workspace items for this day yet.
      </div>
    );
  }

  const advance = (itemId: string, wasCorrect: boolean) => {
    markItemComplete(day, itemId);
    bumpScore(day, wasCorrect, items.length);
    const nextCompleted = new Set([...completed, itemId]);
    const allDone = items.every((i) => nextCompleted.has(i.id));
    if (allDone) {
      const score = loadScore(day);
      const ratio =
        score.total > 0 ? score.correct / Math.max(score.total, items.length) : 0;
      // Mark day complete if threshold met OR all attempted (strengthen mode)
      if (ratio >= threshold || score.total >= items.length) {
        markDayWorkspaceComplete(day);
      }
      onComplete();
      return;
    }
    const next = items.findIndex((i) => !nextCompleted.has(i.id));
    setIndex(next >= 0 ? next : index + 1);
    setSelected(null);
    setTfChoice(null);
    setTextAnswer("");
    setWrongCount(0);
    setFeedback(null);
    setShowExplanation(false);
  };

  const submit = () => {
    const correct = isItemCorrect(item, selected, textAnswer, tfChoice);
    if (correct) {
      setFeedback(null);
      setShowExplanation(true);
      window.setTimeout(() => advance(item.id, true), 900);
      return;
    }

    const nextWrong = wrongCount + 1;
    setWrongCount(nextWrong);
    if (nextWrong >= 2) {
      setShowExplanation(true);
      setFeedback(
        item.type === "short_answer"
          ? item.model_answer
          : item.explanation
      );
      window.setTimeout(() => advance(item.id, false), 1600);
    } else {
      setFeedback(hintFor(item, language));
    }
  };

  const canSubmit =
    item.type === "true_false"
      ? tfChoice !== null
      : item.type === "short_answer" || item.type === "account_id"
        ? textAnswer.trim().length >= 2
        : selected !== null;

  const heading =
    item.type === "true_false"
      ? "True or false"
      : item.type === "short_answer"
        ? "Short answer"
        : item.type === "scenario"
          ? "Scenario"
          : item.type === "account_id"
            ? "Type the answer"
            : "Multiple choice";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-5 flex items-end justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Lesson {day} · {index + 1}/{items.length} · {heading}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-foreground md:text-2xl">
            Strengthen the foundation
          </h2>
        </div>
      </div>

      {"situation" in item && item.situation ? (
        <p className="mb-4 whitespace-pre-wrap text-sm text-slate-300">
          {item.situation}
        </p>
      ) : null}

      <p className="text-base font-medium text-foreground">
        {item.type === "true_false" ? item.statement : item.question}
      </p>

      {item.type === "true_false" ? (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setTfChoice(v)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                tfChoice === v
                  ? "border-violet-400/60 bg-violet-500/15 text-violet-100"
                  : "border-white/[0.1] text-slate-300 hover:border-white/20"
              }`}
            >
              {v ? "True" : "False"}
            </button>
          ))}
        </div>
      ) : null}

      {(item.type === "quiz" || item.type === "scenario") && (
        <div className="mt-5 space-y-2">
          {item.options.map((opt, i) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSelected(i)}
              className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                selected === i
                  ? "border-violet-400/60 bg-violet-500/15 text-violet-100"
                  : "border-white/[0.1] text-slate-300 hover:border-white/20"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {(item.type === "short_answer" || item.type === "account_id") && (
        <textarea
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          rows={item.type === "short_answer" ? 4 : 2}
          placeholder="Type your answer…"
          className="mt-5 w-full rounded-xl border border-white/[0.1] bg-[#0b1220] px-4 py-3 text-sm text-slate-100 outline-none focus:border-violet-400/50"
        />
      )}

      {feedback ? (
        <p className="mt-4 text-sm text-amber-200/90">{feedback}</p>
      ) : null}
      {showExplanation ? (
        <p className="mt-3 text-sm text-emerald-200/90">
          {item.type === "short_answer" ? item.model_answer : item.explanation}
        </p>
      ) : null}

      <div className="mt-6">
        <Button
          type="button"
          disabled={!canSubmit || showExplanation}
          onClick={submit}
          className="rounded-xl"
        >
          Check
        </Button>
      </div>
    </div>
  );
}

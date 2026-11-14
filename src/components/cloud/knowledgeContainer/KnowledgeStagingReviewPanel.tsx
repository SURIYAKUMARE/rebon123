/**
 * Admin review: Secondary staging → Third verified Q&A.
 */
import { useMemo, useState } from "react";
import {
  inspectPendingStaging,
  promoteStagingToThird,
  rejectStaging,
  stagingToReviewCard,
  listStaging,
  listThirdQa,
} from "@/data/cloud/knowledgeContainer";
import type { ThirdQaEntry } from "@/types/knowledgeContainer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

async function persistThirdToSupabase(entry: ThirdQaEntry) {
  try {
    await (supabase as any).from("third_container_qa").upsert({
      id: entry.id,
      fingerprint: entry.fingerprint,
      match_patterns: entry.match_patterns,
      question_canonical: entry.question_canonical,
      answer_speech: entry.answer_speech,
      ui_surface: entry.ui_surface,
      actions: entry.actions,
      board_ops: entry.board_ops,
      lesson_id: entry.lesson_id,
      service_module: entry.service_module,
      step_id: entry.step_id,
      promoted_from_staging_id: entry.promoted_from_staging_id,
      reviewer_note: entry.reviewer_note,
      reviewed_by: entry.reviewed_by,
      status: entry.status,
      language: entry.language,
      schema_version: entry.schema_version,
    });
  } catch (err) {
    logger.warn("KnowledgeStagingReviewPanel", "third_container_qa upsert skipped", err);
  }
}

export function KnowledgeStagingReviewPanel() {
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<"pending" | "third">("pending");

  const pending = useMemo(() => {
    void tick;
    return inspectPendingStaging().map(stagingToReviewCard);
  }, [tick]);

  const all = useMemo(() => {
    void tick;
    return listStaging();
  }, [tick]);

  const thirdRows = useMemo(() => {
    void tick;
    return listThirdQa({ status: "active" });
  }, [tick]);

  const refresh = () => setTick((n) => n + 1);

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-[#0a0f18] p-5 text-slate-200">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-300">
          Knowledge flywheel · Secondary → Third
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Review Gemini paths into Q&amp;A store
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          {pending.length} pending · {all.length} staged · {thirdRows.length}{" "}
          verified in Third
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`rounded-md px-3 py-1.5 text-xs ${
            tab === "pending"
              ? "bg-violet-500/20 text-violet-200"
              : "text-slate-400 hover:bg-white/5"
          }`}
        >
          Pending review
        </button>
        <button
          type="button"
          onClick={() => setTab("third")}
          className={`rounded-md px-3 py-1.5 text-xs ${
            tab === "third"
              ? "bg-emerald-500/20 text-emerald-200"
              : "text-slate-400 hover:bg-white/5"
          }`}
        >
          Third Q&amp;A
        </button>
      </div>

      {tab === "third" ? (
        thirdRows.length === 0 ? (
          <p className="text-sm text-slate-500">
            No verified Q&amp;A yet. Approve a pending staging entry to populate
            Third.
          </p>
        ) : (
          <ul className="space-y-3">
            {thirdRows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
              >
                <p className="text-[10px] font-mono text-slate-500">
                  {row.lesson_id} · {row.id.slice(0, 8)}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  <span className="text-slate-500">Q:</span>{" "}
                  {row.question_canonical}
                </p>
                <p className="mt-2 text-sm text-emerald-100">
                  <span className="text-slate-500">A:</span> {row.answer_speech}
                </p>
                {row.actions.length > 0 && (
                  <p className="mt-2 font-mono text-[11px] text-amber-200/90">
                    {row.actions.join(" → ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )
      ) : pending.length === 0 ? (
        <p className="text-sm text-slate-500">
          No pending entries. Unmapped student questions land here after Gemini
          answers them.
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((card) => (
            <li
              key={card.id}
              className="rounded-xl border border-white/10 bg-black/30 p-4"
            >
              <p className="text-[10px] font-mono text-slate-500">
                {card.lesson_id} · step {card.step_index} · {card.ui_surface}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                <span className="text-slate-500">Student:</span> {card.user_asked}
              </p>
              <p className="mt-2 text-sm text-violet-100">
                <span className="text-slate-500">Ren:</span> {card.ren_said}
              </p>
              {card.actions.length > 0 && (
                <p className="mt-2 font-mono text-[11px] text-amber-200/90">
                  {card.actions.join(" → ")}
                </p>
              )}
              <ul className="mt-3 list-disc space-y-0.5 pl-4 text-[11px] text-slate-500">
                {card.safety_checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                  onClick={() => {
                    const result = promoteStagingToThird({
                      staging_id: card.id,
                      lesson_id: card.lesson_id,
                      match_patterns: [card.user_asked],
                      reviewer_note: "Approved via KnowledgeStagingReviewPanel",
                    });
                    if (result.ok) {
                      void persistThirdToSupabase(result.entry);
                      void fetch("/api/knowledge-promote", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          staging_id: card.id,
                          lesson_id: card.lesson_id,
                          match_patterns: [card.user_asked],
                          reviewer_note:
                            "Approved via KnowledgeStagingReviewPanel",
                          staging_snapshot: {
                            session_id: "review-panel",
                            user_input: card.user_asked,
                            gemini_response_text: card.ren_said,
                            generated_actions: card.actions,
                            ui_surface: card.ui_surface,
                            step_index: card.step_index,
                          },
                        }),
                      }).catch(() => {
                        /* server seed best-effort */
                      });
                    }
                    refresh();
                  }}
                >
                  Approve → Third Q&amp;A
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15"
                  onClick={() => {
                    rejectStaging(card.id, "Rejected via review panel");
                    refresh();
                  }}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="ghost"
        className="text-xs text-slate-400"
        onClick={refresh}
      >
        Refresh
      </Button>
    </div>
  );
}

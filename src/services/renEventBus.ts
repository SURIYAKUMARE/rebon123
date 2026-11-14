/**
 * Ren event bus — frontend dispatch for BOARD / CONSOLE orchestration.
 * Aligns OrchestratorPayload with whiteboard ops + ACTION_MAP execution.
 */
import { executeAction } from "@/components/cloud/awsConsole/actionMap/executeAction";
import type {
  BoardOp,
  ConsoleActionTag,
  OrchestratorPayload,
  RenUiSurface,
} from "@/types/knowledgeContainer";
import { logger } from "@/lib/logger";

export type RenBusEvent =
  | { type: "ui_surface"; surface: RenUiSurface }
  | { type: "speech"; text: string; source: OrchestratorPayload["source"] }
  | { type: "board_ops"; ops: BoardOp[] }
  | { type: "actions_start"; actions: ConsoleActionTag[] }
  | {
      type: "action_result";
      code: string;
      ok: boolean;
      reason?: string;
    }
  | { type: "actions_done"; okCount: number; failCount: number }
  | { type: "orchestrator_done"; payload: OrchestratorPayload };

type Listener = (event: RenBusEvent) => void;

const listeners = new Set<Listener>();

export function subscribeRenBus(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: RenBusEvent) {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch (err) {
      logger.error("renEventBus", "listener error", err);
    }
  }
}

export type DispatchOptions = {
  /** Delay between ACTION_MAP codes (ms). */
  actionGapMs?: number;
  /** Skip executeAction (dry-run / mock). */
  dryRun?: boolean;
};

function sleep(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms));
}

/**
 * Dispatch a full orchestrator payload onto the UI event bus.
 * 1) Switch BOARD/CONSOLE surface
 2) Emit speech for TTS
 * 3) Apply board ops
 * 4) Run ACTION_MAP codes in order via executeAction
 */
export async function dispatchOrchestratorPayload(
  payload: OrchestratorPayload,
  options: DispatchOptions = {}
): Promise<{ okCount: number; failCount: number }> {
  const gap = options.actionGapMs ?? 450;

  emit({ type: "ui_surface", surface: payload.ui_surface });
  emit({
    type: "speech",
    text: payload.speech,
    source: payload.source,
  });

  if (payload.board_ops?.length) {
    emit({ type: "board_ops", ops: payload.board_ops });
  }

  const actions = payload.actions || [];
  emit({ type: "actions_start", actions });

  let okCount = 0;
  let failCount = 0;

  for (const code of actions) {
    if (options.dryRun) {
      emit({ type: "action_result", code, ok: true });
      okCount += 1;
      await sleep(gap);
      continue;
    }

    try {
      const result = await executeAction(code);
      if (result.ok === true) {
        okCount += 1;
        emit({ type: "action_result", code, ok: true });
      } else {
        failCount += 1;
        emit({
          type: "action_result",
          code,
          ok: false,
          reason: "reason" in result ? result.reason : "Action failed",
        });
      }
    } catch (err) {
      failCount += 1;
      emit({
        type: "action_result",
        code,
        ok: false,
        reason: err instanceof Error ? err.message : "dispatch failed",
      });
    }
    await sleep(gap);
  }

  emit({ type: "actions_done", okCount, failCount });
  emit({ type: "orchestrator_done", payload });
  return { okCount, failCount };
}

/** Mock / test helper — synthesizes a payload and dry-runs the bus. */
export async function mockDispatchDemo(query: string) {
  const payload: OrchestratorPayload = {
    speech: `Demo response for: ${query.slice(0, 80)}`,
    ui_surface: "CONSOLE",
    actions: ["NAV:iam-users", "HIGHLIGHT:btn-create-user"],
    board_ops: [
      { type: "write_heading", text: "Alternate path (demo)" },
      {
        type: "write_points",
        points: ["Cached miss → Gemini", "Actions staged for review"],
      },
    ],
    source: "gemini_fallback",
    staging_id: "mock-staging",
  };
  return dispatchOrchestratorPayload(payload, { dryRun: true, actionGapMs: 200 });
}

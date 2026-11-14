/**
 * Seed example Primary query_cache entries for PM-0.1.
 * These demonstrate Primary hits (no Gemini) for common alternate-path questions.
 */
import { upsertPrimaryQueryCache, normalizeQueryFingerprint } from "./primaryStore";
import type { PrimaryQueryCacheEntry } from "@/types/knowledgeContainer";

export function seedPrimaryDemoCache(): void {
  const lessonId = "PM-0.1";
  const now = new Date().toISOString();

  const entries: Omit<PrimaryQueryCacheEntry, "fingerprint">[] = [
    {
      match_patterns: [
        "how do i find my account id",
        "where is account id",
        "show account number",
      ],
      response: {
        speech:
          "Top right — open the account menu. Your twelve-digit Account ID sits right under the account name. That is the number you paste into every ticket.",
        ui_surface: "CONSOLE",
        actions: ["HIGHLIGHT:nav-search"],
        source: "primary",
        staging_id: null,
      },
      step_id: "S3",
      updated_at: now,
    },
    {
      match_patterns: [
        "cli instead of console",
        "how with aws cli",
        "show me the cli way",
      ],
      response: {
        speech:
          "Same idea on the CLI: aws sts get-caller-identity prints your Account ID and ARN. In this lesson we stay on the console so you build muscle memory for the UI — but I will log that CLI path for review.",
        ui_surface: "BOARD",
        actions: [],
        board_ops: [
          { type: "write_heading", text: "CLI alternate (preview)" },
          {
            type: "write_points",
            points: [
              "aws sts get-caller-identity",
              "Returns Account, UserId, Arn",
              "Console path still preferred in this lesson",
            ],
          },
        ],
        source: "primary",
        staging_id: null,
      },
      updated_at: now,
    },
  ];

  for (const e of entries) {
    upsertPrimaryQueryCache(
      lessonId,
      {
        ...e,
        fingerprint: normalizeQueryFingerprint(e.match_patterns[0]),
      },
      "english"
    );
  }
}

/** Auto-seed once on module load (dev / client). */
if (typeof window !== "undefined") {
  try {
    seedPrimaryDemoCache();
  } catch {
    /* ignore */
  }
}

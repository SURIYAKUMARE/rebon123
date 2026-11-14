-- Third Knowledge Container — verified Q&A / doubts store.
-- Human-approved Secondary staging rows promote here (not into Primary lessons).

CREATE TABLE IF NOT EXISTS public.third_container_qa (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  match_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_canonical TEXT NOT NULL,
  answer_speech TEXT NOT NULL,
  ui_surface TEXT NOT NULL DEFAULT 'NONE'
    CHECK (ui_surface IN ('BOARD', 'CONSOLE', 'NONE')),
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  board_ops JSONB,
  lesson_id TEXT NOT NULL,
  service_module TEXT,
  step_id TEXT,
  promoted_from_staging_id TEXT UNIQUE,
  reviewer_note TEXT,
  reviewed_by TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  language TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_third_qa_lesson
  ON public.third_container_qa (lesson_id);

CREATE INDEX IF NOT EXISTS idx_third_qa_fingerprint
  ON public.third_container_qa (fingerprint);

CREATE INDEX IF NOT EXISTS idx_third_qa_status
  ON public.third_container_qa (status);

ALTER TABLE public.third_container_qa ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active verified Q&A for lesson playback.
CREATE POLICY "Authenticated read third qa"
  ON public.third_container_qa
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Inserts/updates from authenticated reviewers (tighten to admin role later).
CREATE POLICY "Authenticated write third qa"
  ON public.third_container_qa
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update third qa"
  ON public.third_container_qa
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

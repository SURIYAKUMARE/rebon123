-- Secondary Knowledge Container — staging buffer for Gemini-generated alternate paths.
-- Data flywheel: pending_review → approved → promote into Primary query_cache.

CREATE TABLE IF NOT EXISTS public.secondary_container_staging (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  step_index INTEGER NOT NULL DEFAULT 0,
  step_id TEXT,
  user_input TEXT NOT NULL,
  gemini_response_text TEXT NOT NULL,
  generated_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ui_surface TEXT NOT NULL DEFAULT 'NONE'
    CHECK (ui_surface IN ('BOARD', 'CONSOLE', 'NONE')),
  board_ops JSONB,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  current_route TEXT,
  language TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secondary_staging_status
  ON public.secondary_container_staging (status);

CREATE INDEX IF NOT EXISTS idx_secondary_staging_lesson
  ON public.secondary_container_staging (lesson_id);

CREATE INDEX IF NOT EXISTS idx_secondary_staging_created
  ON public.secondary_container_staging (created_at DESC);

ALTER TABLE public.secondary_container_staging ENABLE ROW LEVEL SECURITY;

-- Students can insert their own staging rows and read their own.
CREATE POLICY "Users insert own secondary staging"
  ON public.secondary_container_staging
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users read own secondary staging"
  ON public.secondary_container_staging
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Updates (review / promote) — authenticated users for now; tighten to admin role later.
CREATE POLICY "Users update secondary staging"
  ON public.secondary_container_staging
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

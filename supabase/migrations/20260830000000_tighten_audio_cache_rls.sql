-- Tighten voice-cache RLS: public read-only from browser; writes via service role only.
-- Service role bypasses RLS, so edge functions (rebon-voice-cache) keep working.

DROP POLICY IF EXISTS "Allow service role or auth to manage audio_files"
  ON public.audio_files;

DROP POLICY IF EXISTS "Allow service role or auth to manage qa_voice_cache"
  ON public.qa_voice_cache;

-- Keep existing SELECT policies:
--   "Allow public read access to audio_files"
--   "Allow public read access to qa_voice_cache"

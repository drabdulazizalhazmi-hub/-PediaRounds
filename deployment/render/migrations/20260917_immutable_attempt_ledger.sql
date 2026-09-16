-- Append-only audit history for every answered progress mutation.
-- Browser roles have no table privileges; rows are written only by the trigger.
CREATE TABLE IF NOT EXISTS public.pediarounds_render_attempts (
  attempt_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL CHECK (length(question_id) BETWEEN 1 AND 200 AND question_id !~ '[[:cntrl:]]'),
  correct boolean,
  attempted_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pediarounds_render_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pediarounds_render_attempts FROM PUBLIC, anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.pediarounds_render_log_attempt() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.answered IS TRUE AND TG_OP = 'INSERT' THEN
    INSERT INTO public.pediarounds_render_attempts(user_id, question_id, correct, attempted_at)
    VALUES (NEW.user_id, NEW.question_id, NEW.correct, COALESCE(NEW.answered_at, now()));
  ELSIF NEW.answered IS TRUE AND TG_OP = 'UPDATE' THEN
    INSERT INTO public.pediarounds_render_attempts(user_id, question_id, correct, attempted_at)
    VALUES (NEW.user_id, NEW.question_id, NEW.correct, COALESCE(NEW.answered_at, now()));
  END IF;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION private.pediarounds_render_log_attempt() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS pediarounds_render_progress_attempt ON public.pediarounds_render_progress;
CREATE TRIGGER pediarounds_render_progress_attempt
AFTER INSERT OR UPDATE OF answered, correct, answered_at ON public.pediarounds_render_progress
FOR EACH ROW EXECUTE FUNCTION private.pediarounds_render_log_attempt();

CREATE INDEX IF NOT EXISTS pediarounds_render_attempts_user_time_idx
ON public.pediarounds_render_attempts(user_id, attempted_at DESC);

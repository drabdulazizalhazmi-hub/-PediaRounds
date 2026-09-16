-- now() is transaction-stable, so repeated answer RPCs in one transaction can
-- share answered_at. Log every answered UPDATE rather than comparing time.
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

-- Transactional regression probe; all fixture rows are rolled back.
BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-00000000a711',
  'authenticated', 'authenticated', 'attempt-ledger-probe@example.invalid', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000a711","role":"authenticated","is_anonymous":false}',
  true
);
SET LOCAL ROLE authenticated;

SELECT public.pediarounds_render_save_progress(
  '[{"questionId":"__attempt_ledger_probe__","correct":false}]'::jsonb,
  '["__attempt_ledger_probe__"]'::jsonb
);
SELECT public.pediarounds_render_save_progress(
  '[{"questionId":"__attempt_ledger_probe__","correct":true}]'::jsonb,
  '["__attempt_ledger_probe__"]'::jsonb
);

RESET ROLE;
DO $$
DECLARE attempts integer; wrong_count integer; right_count integer;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE correct IS FALSE), count(*) FILTER (WHERE correct IS TRUE)
  INTO attempts, wrong_count, right_count
  FROM public.pediarounds_render_attempts
  WHERE user_id = '00000000-0000-4000-8000-00000000a711'
    AND question_id = '__attempt_ledger_probe__';
  IF attempts <> 2 OR wrong_count <> 1 OR right_count <> 1 THEN
    RAISE EXCEPTION 'immutable attempt ledger assertion failed';
  END IF;
END $$;

ROLLBACK;

SELECT jsonb_build_object(
  'auth_rows_after_rollback', (SELECT count(*) FROM auth.users WHERE email = 'attempt-ledger-probe@example.invalid'),
  'progress_rows_after_rollback', (SELECT count(*) FROM public.pediarounds_render_progress WHERE question_id = '__attempt_ledger_probe__'),
  'attempt_rows_after_rollback', (SELECT count(*) FROM public.pediarounds_render_attempts WHERE question_id = '__attempt_ledger_probe__')
) AS cleanup;

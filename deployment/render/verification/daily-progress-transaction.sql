-- Manual Supabase regression probe for the daily progress ledger.
-- Run as the project database administrator. Every fixture and write is rolled
-- back; the final query must report three zeroes.
BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-00000000d411',
  'authenticated', 'authenticated', 'daily-progress-probe@example.invalid', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000d411","role":"authenticated","is_anonymous":false}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  qid text := '__daily_progress_transaction_probe__';
  first_time timestamptz;
  second_time timestamptz;
  daily_rows integer;
  distinct_days integer;
  visible_total integer;
  blocked_future boolean := false;
  payload jsonb;
BEGIN
  first_time := (
    ((timezone('Asia/Riyadh', now()))::date - 2)::timestamp
      + time '23:59:59.999'
  ) AT TIME ZONE 'Asia/Riyadh';
  second_time := (
    ((timezone('Asia/Riyadh', now()))::date - 1)::timestamp
  ) AT TIME ZONE 'Asia/Riyadh';

  payload := jsonb_build_array(
    jsonb_build_object('questionId', qid, 'correct', false, 'reviewedAt', first_time),
    jsonb_build_object('questionId', qid, 'correct', true, 'reviewedAt', second_time)
  );

  -- Replaying the same payload represents a lost response or a second device.
  PERFORM public.pediarounds_render_save_progress(payload, jsonb_build_array(qid));
  PERFORM public.pediarounds_render_save_progress(payload, jsonb_build_array(qid));

  SELECT count(*), count(DISTINCT review_date)
    INTO daily_rows, distinct_days
  FROM public.pediarounds_render_daily_reviews
  WHERE user_id = auth.uid() AND question_id = qid;
  IF daily_rows <> 2 OR distinct_days <> 2 THEN
    RAISE EXCEPTION 'daily deduplication or Riyadh boundary assertion failed';
  END IF;

  SELECT COALESCE(sum((row->>'reviewedCount')::integer), 0)
    INTO visible_total
  FROM jsonb_array_elements(
    public.pediarounds_render_read_progress()->'dailyProgress'
  ) AS row;
  IF visible_total <> 2 THEN
    RAISE EXCEPTION 'daily aggregation assertion failed';
  END IF;

  BEGIN
    INSERT INTO public.pediarounds_render_daily_reviews(user_id, review_date, question_id, reviewed_at)
    VALUES (
      auth.uid(),
      (timezone('Asia/Riyadh', now()))::date + 1,
      '__future_review_probe__',
      ((((timezone('Asia/Riyadh', now()))::date + 1)::timestamp) AT TIME ZONE 'Asia/Riyadh')
    );
  EXCEPTION WHEN insufficient_privilege THEN
    blocked_future := true;
  END;
  IF NOT blocked_future THEN
    RAISE EXCEPTION 'future-day RLS assertion failed';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-00000000d412","role":"authenticated","is_anonymous":false}',
    true
  );
  SELECT count(*) INTO visible_total
  FROM public.pediarounds_render_daily_reviews
  WHERE question_id = qid;
  IF visible_total <> 0 THEN
    RAISE EXCEPTION 'cross-user isolation assertion failed';
  END IF;
END $$;

ROLLBACK;

SELECT jsonb_build_object(
  'auth_rows_after_rollback', (SELECT count(*) FROM auth.users WHERE email = 'daily-progress-probe@example.invalid'),
  'progress_rows_after_rollback', (SELECT count(*) FROM public.pediarounds_render_progress WHERE question_id = '__daily_progress_transaction_probe__'),
  'daily_rows_after_rollback', (SELECT count(*) FROM public.pediarounds_render_daily_reviews WHERE question_id LIKE '__%probe__')
) AS cleanup;

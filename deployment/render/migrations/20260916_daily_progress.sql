BEGIN;

-- Add a durable, per-day review ledger without changing existing progress semantics.
CREATE TABLE IF NOT EXISTS public.pediarounds_render_daily_reviews (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_date date NOT NULL,
  question_id text NOT NULL CHECK (length(question_id) BETWEEN 1 AND 200 AND question_id !~ '[[:cntrl:]]'),
  reviewed_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, review_date, question_id),
  CHECK (review_date = (reviewed_at AT TIME ZONE 'Asia/Riyadh')::date)
);

ALTER TABLE public.pediarounds_render_daily_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pediarounds_render_daily_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.pediarounds_render_daily_reviews TO authenticated;

DROP POLICY IF EXISTS own_daily_reviews_select ON public.pediarounds_render_daily_reviews;
CREATE POLICY own_daily_reviews_select ON public.pediarounds_render_daily_reviews FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id AND COALESCE((SELECT auth.jwt())->>'is_anonymous', 'false') = 'false');

DROP POLICY IF EXISTS own_daily_reviews_insert ON public.pediarounds_render_daily_reviews;
CREATE POLICY own_daily_reviews_insert ON public.pediarounds_render_daily_reviews FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id
  AND COALESCE((SELECT auth.jwt())->>'is_anonymous', 'false') = 'false'
  AND reviewed_at >= timestamptz '2020-01-01 00:00:00+00'
  AND reviewed_at <= now() + interval '5 minutes'
  AND review_date <= (timezone('Asia/Riyadh', now()))::date);

-- Existing storage has only the latest answer timestamp per question. Preserve that
-- last known day as a best-effort starting point; future days are captured immutably.
INSERT INTO public.pediarounds_render_daily_reviews(user_id, review_date, question_id, reviewed_at)
SELECT user_id, (answered_at AT TIME ZONE 'Asia/Riyadh')::date, question_id, answered_at
FROM public.pediarounds_render_progress
WHERE answered IS TRUE AND answered_at IS NOT NULL
ON CONFLICT(user_id, review_date, question_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.pediarounds_render_read_progress() RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(auth.jwt()->>'is_anonymous', 'false') <> 'false' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'reviewedCount', count(*) FILTER (WHERE answered),
    'done', COALESCE(jsonb_agg(jsonb_build_object('questionId', question_id, 'correct', correct,
      'completedAt', floor(extract(epoch FROM answered_at) * 1000))) FILTER (WHERE answered), '[]'::jsonb),
    'seen', COALESCE(jsonb_agg(question_id), '[]'::jsonb),
    'dailyProgress', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', calendar.day::text,
        'reviewedCount', COALESCE(counts.reviewed_count, 0)
      ) ORDER BY calendar.day DESC), '[]'::jsonb)
      FROM (
        SELECT generate_series(
          (timezone('Asia/Riyadh', now()))::date - 29,
          (timezone('Asia/Riyadh', now()))::date,
          interval '1 day'
        )::date AS day
      ) calendar
      LEFT JOIN (
        SELECT review_date, count(*)::int AS reviewed_count
        FROM public.pediarounds_render_daily_reviews
        WHERE user_id = auth.uid()
          AND review_date >= (timezone('Asia/Riyadh', now()))::date - 29
        GROUP BY review_date
      ) counts ON counts.review_date = calendar.day
    )) INTO result
  FROM public.pediarounds_render_progress WHERE user_id = auth.uid();
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.pediarounds_render_save_progress(completed jsonb DEFAULT '[]'::jsonb, seen jsonb DEFAULT '[]'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE item jsonb; qid text; value boolean; reviewed_time timestamptz;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(auth.jwt()->>'is_anonymous', 'false') <> 'false' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF completed IS NULL OR seen IS NULL OR jsonb_typeof(completed) <> 'array' OR jsonb_typeof(seen) <> 'array' THEN
    RAISE EXCEPTION 'Invalid progress arrays' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(completed) > 500 OR jsonb_array_length(seen) > 500 THEN
    RAISE EXCEPTION 'Batch limit exceeded' USING ERRCODE = '22023';
  END IF;
  FOR item IN SELECT jsonb_array_elements(seen) LOOP
    IF jsonb_typeof(item) <> 'string' THEN RAISE EXCEPTION 'Invalid question ID' USING ERRCODE = '22023'; END IF;
    qid := item #>> '{}';
    INSERT INTO public.pediarounds_render_progress(user_id, question_id) VALUES(auth.uid(), qid)
    ON CONFLICT(user_id, question_id) DO NOTHING;
  END LOOP;
  FOR item IN SELECT jsonb_array_elements(completed) LOOP
    IF jsonb_typeof(item) <> 'object' OR NOT (item ? 'correct') OR jsonb_typeof(item->'questionId') IS DISTINCT FROM 'string'
       OR jsonb_typeof(item->'correct') NOT IN ('boolean', 'null')
       OR (item ? 'reviewedAt' AND jsonb_typeof(item->'reviewedAt') IS DISTINCT FROM 'string')
       OR (item - 'questionId' - 'correct' - 'reviewedAt') <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Invalid completion' USING ERRCODE = '22023';
    END IF;
    qid := item->>'questionId'; value := (item->>'correct')::boolean;
    reviewed_time := CASE WHEN item ? 'reviewedAt' THEN (item->>'reviewedAt')::timestamptz ELSE NULL END;
    IF reviewed_time IS NOT NULL AND (reviewed_time < timestamptz '2020-01-01 00:00:00+00' OR reviewed_time > now() + interval '5 minutes') THEN
      RAISE EXCEPTION 'Invalid review time' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.pediarounds_render_progress(user_id, question_id, answered, correct, answered_at)
    VALUES(auth.uid(), qid, true, value, now())
    ON CONFLICT(user_id, question_id) DO UPDATE SET answered = true,
      correct = CASE WHEN public.pediarounds_render_progress.correct IS TRUE OR EXCLUDED.correct IS TRUE THEN true
        ELSE COALESCE(EXCLUDED.correct, public.pediarounds_render_progress.correct) END,
      answered_at = GREATEST(public.pediarounds_render_progress.answered_at, EXCLUDED.answered_at);
    IF reviewed_time IS NOT NULL THEN
      INSERT INTO public.pediarounds_render_daily_reviews(user_id, review_date, question_id, reviewed_at)
      VALUES(auth.uid(), (reviewed_time AT TIME ZONE 'Asia/Riyadh')::date, qid, reviewed_time)
      ON CONFLICT(user_id, review_date, question_id) DO NOTHING;
    END IF;
  END LOOP;
  RETURN public.pediarounds_render_read_progress();
END; $$;

REVOKE ALL ON FUNCTION public.pediarounds_render_read_progress(),
  public.pediarounds_render_save_progress(jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pediarounds_render_read_progress(),
  public.pediarounds_render_save_progress(jsonb,jsonb) TO authenticated;

COMMIT;

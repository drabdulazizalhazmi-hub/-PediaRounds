BEGIN;

-- The browser receives review time from the authenticated answer endpoint. Keep
-- direct table access subject to the same integrity window as the RPC.
DROP POLICY IF EXISTS own_daily_reviews_insert ON public.pediarounds_render_daily_reviews;
CREATE POLICY own_daily_reviews_insert ON public.pediarounds_render_daily_reviews FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id
  AND COALESCE((SELECT auth.jwt())->>'is_anonymous', 'false') = 'false'
  AND reviewed_at >= timestamptz '2020-01-01 00:00:00+00'
  AND reviewed_at <= now() + interval '5 minutes'
  AND review_date <= (timezone('Asia/Riyadh', now()))::date);

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

REVOKE ALL ON FUNCTION public.pediarounds_render_save_progress(jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pediarounds_render_save_progress(jsonb,jsonb) TO authenticated;

COMMIT;

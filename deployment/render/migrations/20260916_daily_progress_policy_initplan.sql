BEGIN;

-- Keep auth lookups as init plans so PostgreSQL evaluates them once per statement.
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

COMMIT;

-- Defense-in-depth policy for the append-only ledger. Table privileges remain
-- revoked, so browser roles still cannot read, insert, update or delete rows.
CREATE POLICY own_attempts_read ON public.pediarounds_render_attempts
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id
  AND COALESCE((SELECT auth.jwt())->>'is_anonymous', 'false') = 'false');

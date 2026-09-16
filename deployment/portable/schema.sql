-- Run once in a SEPARATE PostgreSQL database as its owner. No Sites connection.
BEGIN;
CREATE ROLE pediarounds_portable_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA pediarounds_portable;
REVOKE ALL ON SCHEMA pediarounds_portable FROM PUBLIC;
GRANT USAGE ON SCHEMA pediarounds_portable TO pediarounds_portable_runtime;
CREATE TABLE pediarounds_portable.account_links (
  external_user_id uuid PRIMARY KEY, legacy_user_id text NOT NULL UNIQUE,
  proof_method text NOT NULL CHECK(proof_method IN ('both_accounts_verified','owner_verified_recovery')),
  verified_at timestamptz NOT NULL, proof_reference text NOT NULL
);
CREATE TABLE pediarounds_portable.user_profiles (user_id text PRIMARY KEY,email text NOT NULL,display_name text,created_at bigint NOT NULL,updated_at bigint NOT NULL);
CREATE TABLE pediarounds_portable.done_questions (user_id text NOT NULL,question_id text NOT NULL,correct integer CHECK(correct IN(0,1)),completed_at bigint NOT NULL,PRIMARY KEY(user_id,question_id));
CREATE TABLE pediarounds_portable.seen_questions (user_id text NOT NULL,question_id text NOT NULL,seen_at bigint NOT NULL,PRIMARY KEY(user_id,question_id));
CREATE TABLE pediarounds_portable.question_annotations (user_id text NOT NULL,question_id text NOT NULL,marked integer NOT NULL DEFAULT 0 CHECK(marked IN(0,1)),confidence text,updated_at bigint NOT NULL,PRIMARY KEY(user_id,question_id));
CREATE TABLE pediarounds_portable.study_sessions (user_id text PRIMARY KEY,payload text NOT NULL,revision bigint NOT NULL,updated_at bigint NOT NULL);
CREATE TABLE pediarounds_portable.spaced_review_sessions (user_id text NOT NULL,bank text NOT NULL,payload text NOT NULL,revision bigint NOT NULL,updated_at bigint NOT NULL,PRIMARY KEY(user_id,bank));
CREATE TABLE pediarounds_portable.mock_exam_attempts (user_id text PRIMARY KEY,payload text NOT NULL,revision bigint NOT NULL,updated_at bigint NOT NULL);
CREATE TABLE pediarounds_portable.custom_exam_attempts (user_id text PRIMARY KEY,payload text NOT NULL,revision bigint NOT NULL,updated_at bigint NOT NULL);
ALTER TABLE pediarounds_portable.account_links ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON pediarounds_portable.account_links TO pediarounds_portable_runtime;
CREATE POLICY own_link ON pediarounds_portable.account_links TO pediarounds_portable_runtime
  USING (external_user_id::text=current_setting('pediarounds.external_user_id',true));
DO $schema$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['user_profiles','done_questions','seen_questions','question_annotations','study_sessions','spaced_review_sessions','mock_exam_attempts','custom_exam_attempts'] LOOP
    EXECUTE format('ALTER TABLE pediarounds_portable.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON pediarounds_portable.%I TO pediarounds_portable_runtime',name);
    EXECUTE format('CREATE POLICY own_rows ON pediarounds_portable.%I TO pediarounds_portable_runtime USING(user_id=current_setting(''pediarounds.user_id'',true)) WITH CHECK(user_id=current_setting(''pediarounds.user_id'',true))',name);
  END LOOP;
END $schema$;
COMMIT;
-- Provision a separate LOGIN role and grant it ONLY pediarounds_portable_runtime.
-- Keep its credentials in PEDIAROUNDS_DATABASE_URL; never use the database owner.
-- Do not populate account_links by matching email strings. Each mapping needs verified ownership.

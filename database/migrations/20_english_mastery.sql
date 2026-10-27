-- Additive EMH domain only. Apply once to an approved, backed-up staging target.
BEGIN;
DO $migration$
DECLARE name text;
BEGIN
  FOREACH name IN ARRAY ARRAY['curriculum','permissions','content_versions','publications','reviews','attempts','writing_versions','review_queue','lesson_progress','recordings','ratings','exam_profiles','audit','rate_limits'] LOOP
    EXECUTE format('CREATE TABLE public.emh_%I (
      id text PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 240),
      owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
      data jsonb NOT NULL CHECK (jsonb_typeof(data) = ''object''),
      revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
      created_at timestamptz NOT NULL DEFAULT now()
    )', name);
    EXECUTE format('ALTER TABLE public.emh_%I ENABLE ROW LEVEL SECURITY', name);
    EXECUTE format('REVOKE ALL ON public.emh_%I FROM PUBLIC, anon, authenticated', name);
    EXECUTE format('GRANT ALL ON public.emh_%I TO service_role', name);
    EXECUTE format('CREATE INDEX ON public.emh_%I (owner_id)', name);
  END LOOP;
END $migration$;

ALTER TABLE public.emh_content_versions
  ADD COLUMN stable_id text GENERATED ALWAYS AS (data->>'stableId') STORED NOT NULL,
  ADD COLUMN version text GENERATED ALWAYS AS (data->>'version') STORED NOT NULL,
  ADD COLUMN unit_id text GENERATED ALWAYS AS (data->>'unitId') STORED NOT NULL,
  ADD CONSTRAINT emh_version_unique UNIQUE(stable_id,version),
  ADD CONSTRAINT emh_content_checksum CHECK (data->>'checksum' ~ '^[a-f0-9]{64}$');
ALTER TABLE public.emh_attempts
  ADD COLUMN content_id text GENERATED ALWAYS AS (data->'snapshot'->>'contentVersionId') STORED NOT NULL
    REFERENCES public.emh_content_versions(id) ON DELETE RESTRICT;
ALTER TABLE public.emh_reviews
  ADD COLUMN content_id text GENERATED ALWAYS AS (data->>'versionId') STORED NOT NULL
    REFERENCES public.emh_content_versions(id) ON DELETE RESTRICT;
ALTER TABLE public.emh_publications
  ADD CONSTRAINT emh_publication_content FOREIGN KEY(id) REFERENCES public.emh_content_versions(id) ON DELETE RESTRICT;
ALTER TABLE public.emh_recordings
  ADD COLUMN attempt_id text GENERATED ALWAYS AS (data->>'attemptId') STORED NOT NULL
    REFERENCES public.emh_attempts(id) ON DELETE RESTRICT;
ALTER TABLE public.emh_writing_versions
  ADD COLUMN attempt_id text GENERATED ALWAYS AS (data->>'attemptId') STORED NOT NULL
    REFERENCES public.emh_attempts(id) ON DELETE RESTRICT;
ALTER TABLE public.emh_ratings
  ADD COLUMN attempt_id text GENERATED ALWAYS AS (data->>'attemptId') STORED NOT NULL
    REFERENCES public.emh_attempts(id) ON DELETE RESTRICT;
CREATE INDEX ON public.emh_attempts(content_id);
CREATE INDEX ON public.emh_reviews(content_id);
CREATE INDEX ON public.emh_recordings(attempt_id);
CREATE INDEX ON public.emh_writing_versions(attempt_id);
CREATE INDEX ON public.emh_ratings(attempt_id);

CREATE FUNCTION public.emh_attempt_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id
    OR OLD.data->'snapshot' IS DISTINCT FROM NEW.data->'snapshot'
    OR OLD.data->'items' IS DISTINCT FROM NEW.data->'items'
    OR OLD.data->>'mode' IS DISTINCT FROM NEW.data->>'mode'
    OR OLD.data->>'status' = 'SUBMITTED' THEN
    RAISE EXCEPTION 'EMH_FROZEN_ATTEMPT';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER emh_freeze_attempt BEFORE UPDATE ON public.emh_attempts
FOR EACH ROW EXECUTE FUNCTION public.emh_attempt_guard();
REVOKE ALL ON FUNCTION public.emh_attempt_guard() FROM PUBLIC, anon, authenticated;

-- Learners may read their own safe records, never keys, review notes or grants of others.
DO $policies$
DECLARE name text;
BEGIN
  FOREACH name IN ARRAY ARRAY['permissions','attempts','writing_versions','review_queue','lesson_progress','recordings'] LOOP
    EXECUTE format('GRANT SELECT ON public.emh_%I TO authenticated', name);
    EXECUTE format('CREATE POLICY emh_owner_read ON public.emh_%I FOR SELECT TO authenticated USING (owner_id = auth.uid())', name);
  END LOOP;
END $policies$;

CREATE FUNCTION public.emh_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'EMH_IMMUTABLE_VERSION'; END $$;
DO $triggers$
DECLARE name text;
BEGIN
  FOREACH name IN ARRAY ARRAY['content_versions','publications','reviews','writing_versions','exam_profiles','ratings','audit'] LOOP
    EXECUTE format('CREATE TRIGGER emh_no_mutation BEFORE UPDATE OR DELETE ON public.emh_%I FOR EACH ROW EXECUTE FUNCTION public.emh_immutable()', name);
  END LOOP;
END $triggers$;

-- Serialize review/publication against the content row: no stale approval race.
-- Published versions are frozen; revisions require a new content version and reviews.
CREATE FUNCTION public.emh_release_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE content jsonb; required text[]; kind text; review_record record; target text;
BEGIN
  target := CASE WHEN TG_TABLE_NAME = 'emh_reviews' THEN NEW.data->>'versionId' ELSE NEW.id END;
  SELECT data INTO content FROM public.emh_content_versions WHERE id=target FOR UPDATE;
  IF content IS NULL THEN RAISE EXCEPTION 'EMH_CONTENT_REQUIRED'; END IF;
  IF TG_TABLE_NAME = 'emh_reviews' THEN
    IF EXISTS(SELECT 1 FROM public.emh_publications WHERE id=target) THEN
      RAISE EXCEPTION 'EMH_PUBLISHED_VERSION_FROZEN';
    END IF;
    IF NEW.data->>'checksum' IS DISTINCT FROM content->>'checksum'
      OR NEW.data->>'reviewerId' IS DISTINCT FROM NEW.owner_id::text
      OR NEW.owner_id::text = content->>'createdBy' THEN RAISE EXCEPTION 'EMH_INVALID_REVIEW'; END IF;
    RETURN NEW;
  END IF;
  IF content->>'version'='0.5.0' OR content->>'sourceVerified' IS DISTINCT FROM 'true'
    OR content->'payload'->'provenance' IS NULL
    OR NEW.data->>'checksum' IS DISTINCT FROM content->>'checksum'
    OR NEW.data->>'state' IS DISTINCT FROM 'PUBLISHED' THEN RAISE EXCEPTION 'EMH_RELEASE_BLOCKED'; END IF;
  required := ARRAY['ACADEMIC','LANGUAGE','THAI','CONSTRUCT','LEVEL','FAIRNESS','KEY_DISTRACTOR','COPYRIGHT'];
  IF content->'payload'->>'audioStatus'='QC_COMPLETE' THEN
    required := required || ARRAY['AUDIO_TECHNICAL','PRONUNCIATION_PROSODY'];
  END IF;
  FOR review_record IN
    SELECT DISTINCT ON (data->>'type') id,data FROM public.emh_reviews
    WHERE content_id=target ORDER BY data->>'type',created_at DESC,id DESC
  LOOP
    IF review_record.data->>'decision' IS DISTINCT FROM 'APPROVE'
      OR review_record.data->>'attestation' IS DISTINCT FROM 'true'
      OR review_record.data->'blockingFlags' IS DISTINCT FROM '[]'::jsonb
      OR NOT COALESCE(NEW.data->'reviewIds' ? review_record.id,false) THEN RAISE EXCEPTION 'EMH_REVIEW_REQUIRED'; END IF;
    required := array_remove(required,review_record.data->>'type');
  END LOOP;
  IF cardinality(required)>0 THEN RAISE EXCEPTION 'EMH_REVIEW_REQUIRED'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER emh_review_release_guard BEFORE INSERT ON public.emh_reviews
FOR EACH ROW EXECUTE FUNCTION public.emh_release_guard();
CREATE TRIGGER emh_publication_release_guard BEFORE INSERT ON public.emh_publications
FOR EACH ROW EXECUTE FUNCTION public.emh_release_guard();
REVOKE ALL ON FUNCTION public.emh_release_guard() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.emh_release_guard() TO service_role;

-- Narrow trusted-server transaction boundary. Never expose this RPC to browser JWTs.
-- Expected revision -1 = insert only; otherwise compare-and-swap. Entire batch rolls back on conflict.
CREATE FUNCTION public.emh_commit(changes jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE change jsonb; tbl text; affected integer;
BEGIN
  IF jsonb_typeof(changes) <> 'array' OR jsonb_array_length(changes) > 300 THEN
    RAISE EXCEPTION 'EMH_INVALID_BATCH';
  END IF;
  FOR change IN SELECT value FROM jsonb_array_elements(changes) LOOP
    tbl := change->>'table';
    IF NOT tbl = ANY(ARRAY['curriculum','permissions','content_versions','publications','reviews','attempts','writing_versions','review_queue','lesson_progress','recordings','ratings','exam_profiles','audit','rate_limits']) THEN
      RAISE EXCEPTION 'EMH_TABLE_DENIED';
    END IF;
    IF (change->>'expected')::integer = -1 THEN
      EXECUTE format('INSERT INTO public.emh_%I(id,owner_id,data) VALUES($1,$2,$3)',tbl)
        USING change->>'id', (change->>'owner')::uuid, change->'data';
    ELSE
      EXECUTE format('UPDATE public.emh_%I SET data=$1, revision=revision+1 WHERE id=$2 AND revision=$3 AND owner_id IS NOT DISTINCT FROM $4',tbl)
        USING change->'data', change->>'id', (change->>'expected')::integer, (change->>'owner')::uuid;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 1 THEN RAISE EXCEPTION 'EMH_REVISION_CONFLICT'; END IF;
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.emh_commit(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emh_commit(jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.emh_immutable() FROM PUBLIC, anon, authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('emh-learner-recordings','emh-learner-recordings',false,3145728,ARRAY['audio/webm','audio/ogg','audio/wav','audio/mp4','audio/mpeg']);
-- Restrictive policy also prevents legacy permissive storage policies exposing EMH audio.
CREATE POLICY emh_no_direct_audio ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (bucket_id <> 'emh-learner-recordings') WITH CHECK (bucket_id <> 'emh-learner-recordings');
COMMIT;

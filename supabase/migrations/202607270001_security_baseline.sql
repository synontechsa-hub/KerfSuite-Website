-- KerfSuite security baseline migration
-- Schema target: 1.2.0
-- Apply after schema.sql 1.1.0, or to the current development database.

BEGIN;

-- Bridge the original development schema, which stored stock enums as TEXT.
-- Fresh databases already have these enum types from the initial migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'asset_type_enum'
  ) THEN
    CREATE TYPE public.asset_type_enum AS ENUM ('full_sheet', 'remnant', 'offcut', 'custom');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'asset_status_enum'
  ) THEN
    CREATE TYPE public.asset_status_enum AS ENUM (
      'available', 'reserved', 'consumed', 'disposed', 'damaged', 'missing'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'event_type_enum'
  ) THEN
    CREATE TYPE public.event_type_enum AS ENUM (
      'purchased', 'moved', 'cut', 'renamed', 'reserved', 'released',
      'consumed', 'disposed', 'damaged', 'missing', 'recovered',
      'received_from_kerfcut', 'conflict_rejected', 'tag_added',
      'tag_removed', 'note_added', 'workspace_provisioned'
    );
  END IF;
END;
$$;

ALTER TABLE public.assets ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.assets
  ALTER COLUMN asset_type TYPE public.asset_type_enum
  USING asset_type::public.asset_type_enum,
  ALTER COLUMN status TYPE public.asset_status_enum
  USING status::public.asset_status_enum;
ALTER TABLE public.assets ALTER COLUMN status SET DEFAULT 'available'::public.asset_status_enum;

ALTER TABLE public.asset_events
  ALTER COLUMN event_type TYPE public.event_type_enum
  USING event_type::public.event_type_enum;
-- ---------------------------------------------------------------------------
-- 1. Domain constraints
-- ---------------------------------------------------------------------------

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'member'));

ALTER TABLE public.license_slots DROP CONSTRAINT IF EXISTS license_slots_app_check;
ALTER TABLE public.license_slots
  ADD CONSTRAINT license_slots_app_check CHECK (app IN ('kerfcut', 'kerfstock'));

ALTER TABLE public.license_slots DROP CONSTRAINT IF EXISTS license_slots_status_check;
ALTER TABLE public.license_slots
  ADD CONSTRAINT license_slots_status_check CHECK (status IN ('waiting', 'active', 'revoked'));

ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_allowed_apps_check;
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_allowed_apps_check
  CHECK (allowed_apps <@ ARRAY['kerfcut', 'kerfstock']::TEXT[]);

ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_dimensions_check;
ALTER TABLE public.materials
  ADD CONSTRAINT materials_dimensions_check CHECK (thickness IS NULL OR thickness > 0);

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_dimensions_check;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_dimensions_check CHECK (width > 0 AND height > 0);

-- ---------------------------------------------------------------------------
-- 2. Cross-workspace relational integrity
-- ---------------------------------------------------------------------------

ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_workspace_id_id_key;
ALTER TABLE public.materials
  ADD CONSTRAINT materials_workspace_id_id_key UNIQUE (workspace_id, id);

ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_workspace_id_id_key;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_workspace_id_id_key UNIQUE (workspace_id, id);

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_workspace_id_id_key;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_workspace_id_id_key UNIQUE (workspace_id, id);

ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_parent_id_fkey;
ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_workspace_parent_fkey;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_workspace_parent_fkey
  FOREIGN KEY (workspace_id, parent_id)
  REFERENCES public.locations (workspace_id, id)
  ON DELETE CASCADE;

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_material_id_fkey;
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_workspace_material_fkey;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_workspace_material_fkey
  FOREIGN KEY (workspace_id, material_id)
  REFERENCES public.materials (workspace_id, id)
  ON DELETE RESTRICT;

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_location_id_fkey;
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_workspace_location_fkey;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_workspace_location_fkey
  FOREIGN KEY (workspace_id, location_id)
  REFERENCES public.locations (workspace_id, id)
  ON DELETE SET NULL (location_id);

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_source_asset_id_fkey;
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_workspace_source_fkey;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_workspace_source_fkey
  FOREIGN KEY (workspace_id, source_asset_id)
  REFERENCES public.assets (workspace_id, id)
  ON DELETE SET NULL (source_asset_id);

ALTER TABLE public.asset_events DROP CONSTRAINT IF EXISTS asset_events_asset_id_fkey;
ALTER TABLE public.asset_events DROP CONSTRAINT IF EXISTS asset_events_workspace_asset_fkey;
ALTER TABLE public.asset_events
  ADD CONSTRAINT asset_events_workspace_asset_fkey
  FOREIGN KEY (workspace_id, asset_id)
  REFERENCES public.assets (workspace_id, id)
  ON DELETE CASCADE;

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_workspace_system_name_key;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_workspace_system_name_key UNIQUE (workspace_id, system_name);

-- Concurrency-safe per-workspace asset numbering.
CREATE TABLE IF NOT EXISTS public.asset_counters (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  asset_type public.asset_type_enum NOT NULL,
  last_value BIGINT NOT NULL DEFAULT 0 CHECK (last_value >= 0),
  PRIMARY KEY (workspace_id, asset_type)
);

INSERT INTO public.asset_counters (workspace_id, asset_type, last_value)
SELECT workspace_id, asset_type, COUNT(*)::BIGINT
FROM public.assets
GROUP BY workspace_id, asset_type
ON CONFLICT (workspace_id, asset_type) DO UPDATE
SET last_value = GREATEST(public.asset_counters.last_value, EXCLUDED.last_value);

ALTER TABLE public.asset_counters ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Secure helper functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_workspace()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT workspace_id
  FROM public.users
  WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.workspace_allows_app(p_app TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE id = public.get_user_workspace()
      AND p_app = ANY(allowed_apps)
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users view own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Admins update own workspace" ON public.workspaces;
CREATE POLICY "Users view own workspace"
ON public.workspaces FOR SELECT TO authenticated
USING (id = public.get_user_workspace());
CREATE POLICY "Admins update own workspace"
ON public.workspaces FOR UPDATE TO authenticated
USING (id = public.get_user_workspace() AND public.is_user_admin())
WITH CHECK (id = public.get_user_workspace() AND public.is_user_admin());

DROP POLICY IF EXISTS "Users view workspace peers" ON public.users;
DROP POLICY IF EXISTS "Admins update workspace users" ON public.users;
CREATE POLICY "Users view workspace peers"
ON public.users FOR SELECT TO authenticated
USING (workspace_id = public.get_user_workspace());

DROP POLICY IF EXISTS "Members view workspace licenses" ON public.license_slots;
DROP POLICY IF EXISTS "Admins manage workspace licenses" ON public.license_slots;
CREATE POLICY "Members view workspace licenses"
ON public.license_slots FOR SELECT TO authenticated
USING (workspace_id = public.get_user_workspace());
CREATE POLICY "Admins insert entitled licenses"
ON public.license_slots FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = public.get_user_workspace()
  AND public.is_user_admin()
  AND public.workspace_allows_app(app)
);
CREATE POLICY "Admins update entitled licenses"
ON public.license_slots FOR UPDATE TO authenticated
USING (workspace_id = public.get_user_workspace() AND public.is_user_admin())
WITH CHECK (
  workspace_id = public.get_user_workspace()
  AND public.is_user_admin()
  AND public.workspace_allows_app(app)
);
CREATE POLICY "Admins delete workspace licenses"
ON public.license_slots FOR DELETE TO authenticated
USING (workspace_id = public.get_user_workspace() AND public.is_user_admin());

DROP POLICY IF EXISTS "Users view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Members insert audit logs" ON public.audit_logs;
CREATE POLICY "Users view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (workspace_id = public.get_user_workspace());
CREATE POLICY "Users insert own audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = public.get_user_workspace()
  AND actor_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Workspace Isolation" ON public.materials;
DROP POLICY IF EXISTS "Members view workspace materials" ON public.materials;
DROP POLICY IF EXISTS "Admins insert workspace materials" ON public.materials;
DROP POLICY IF EXISTS "Admins update workspace materials" ON public.materials;
DROP POLICY IF EXISTS "Admins delete workspace materials" ON public.materials;
CREATE POLICY "Members view workspace materials"
ON public.materials FOR SELECT TO authenticated
USING (workspace_id = public.get_user_workspace());
CREATE POLICY "Admins insert workspace materials"
ON public.materials FOR INSERT TO authenticated
WITH CHECK (workspace_id = public.get_user_workspace() AND public.is_user_admin());
CREATE POLICY "Admins update workspace materials"
ON public.materials FOR UPDATE TO authenticated
USING (workspace_id = public.get_user_workspace() AND public.is_user_admin())
WITH CHECK (workspace_id = public.get_user_workspace() AND public.is_user_admin());
CREATE POLICY "Admins delete workspace materials"
ON public.materials FOR DELETE TO authenticated
USING (workspace_id = public.get_user_workspace() AND public.is_user_admin());

DROP POLICY IF EXISTS "Workspace Isolation" ON public.locations;
DROP POLICY IF EXISTS "Members view workspace locations" ON public.locations;
DROP POLICY IF EXISTS "Admins insert workspace locations" ON public.locations;
DROP POLICY IF EXISTS "Admins update workspace locations" ON public.locations;
DROP POLICY IF EXISTS "Admins delete workspace locations" ON public.locations;
CREATE POLICY "Members view workspace locations"
ON public.locations FOR SELECT TO authenticated
USING (workspace_id = public.get_user_workspace());
CREATE POLICY "Admins insert workspace locations"
ON public.locations FOR INSERT TO authenticated
WITH CHECK (workspace_id = public.get_user_workspace() AND public.is_user_admin());
CREATE POLICY "Admins update workspace locations"
ON public.locations FOR UPDATE TO authenticated
USING (workspace_id = public.get_user_workspace() AND public.is_user_admin())
WITH CHECK (workspace_id = public.get_user_workspace() AND public.is_user_admin());
CREATE POLICY "Admins delete workspace locations"
ON public.locations FOR DELETE TO authenticated
USING (workspace_id = public.get_user_workspace() AND public.is_user_admin());

DROP POLICY IF EXISTS "Workspace Isolation" ON public.assets;
DROP POLICY IF EXISTS "Members view workspace assets" ON public.assets;
DROP POLICY IF EXISTS "Members insert workspace assets" ON public.assets;
DROP POLICY IF EXISTS "Members update workspace assets" ON public.assets;
DROP POLICY IF EXISTS "Admins delete workspace assets" ON public.assets;
CREATE POLICY "Members view workspace assets"
ON public.assets FOR SELECT TO authenticated
USING (workspace_id = public.get_user_workspace());
CREATE POLICY "Members insert workspace assets"
ON public.assets FOR INSERT TO authenticated
WITH CHECK (workspace_id = public.get_user_workspace());
CREATE POLICY "Members update workspace assets"
ON public.assets FOR UPDATE TO authenticated
USING (workspace_id = public.get_user_workspace())
WITH CHECK (workspace_id = public.get_user_workspace());
CREATE POLICY "Admins delete workspace assets"
ON public.assets FOR DELETE TO authenticated
USING (workspace_id = public.get_user_workspace() AND public.is_user_admin());

DROP POLICY IF EXISTS "Workspace Isolation" ON public.asset_events;
DROP POLICY IF EXISTS "Members view workspace asset events" ON public.asset_events;
DROP POLICY IF EXISTS "Members insert own asset events" ON public.asset_events;
CREATE POLICY "Members view workspace asset events"
ON public.asset_events FOR SELECT TO authenticated
USING (workspace_id = public.get_user_workspace());
CREATE POLICY "Members insert own asset events"
ON public.asset_events FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = public.get_user_workspace()
  AND performed_by = (SELECT auth.uid())
);

-- No client role receives direct access to trials or counters.
DROP POLICY IF EXISTS "Public trials access" ON public.trials;
DROP POLICY IF EXISTS "Allow anon insert trials" ON public.trials;
DROP POLICY IF EXISTS "Allow anon read trials" ON public.trials;
DROP POLICY IF EXISTS "Allow anon update trials" ON public.trials;

-- ---------------------------------------------------------------------------
-- 5. Portal RPCs
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_workspace_users(UUID);
CREATE FUNCTION public.get_workspace_users(p_workspace_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  workspace_id UUID,
  created_at TIMESTAMPTZ,
  confirmed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = (SELECT auth.uid())
      AND users.workspace_id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.role,
    u.workspace_id,
    u.created_at,
    (au.email_confirmed_at IS NOT NULL)
  FROM public.users AS u
  JOIN auth.users AS au ON au.id = u.id
  WHERE u.workspace_id = p_workspace_id
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_workspace_user_role(
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_workspace_id UUID;
  v_target_role TEXT;
BEGIN
  IF p_new_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM public.users
  WHERE id = v_actor_id AND role = 'admin';

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  IF p_user_id = v_actor_id THEN
    RAISE EXCEPTION 'CANNOT_CHANGE_OWN_ROLE';
  END IF;

  SELECT role INTO v_target_role
  FROM public.users
  WHERE id = p_user_id AND workspace_id = v_workspace_id
  FOR UPDATE;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  -- Serialize all administrator demotions within the workspace.
  PERFORM 1
  FROM public.users
  WHERE workspace_id = v_workspace_id AND role = 'admin'
  ORDER BY id
  FOR UPDATE;
  IF v_target_role = 'admin' AND p_new_role = 'member' AND (
    SELECT COUNT(*) FROM public.users
    WHERE workspace_id = v_workspace_id AND role = 'admin'
  ) <= 1 THEN
    RAISE EXCEPTION 'LAST_ADMIN';
  END IF;

  UPDATE public.users
  SET role = p_new_role
  WHERE id = p_user_id AND workspace_id = v_workspace_id;
END;
$$;

DROP FUNCTION IF EXISTS public.create_asset(UUID, NUMERIC, NUMERIC, public.asset_type_enum, TEXT, UUID, public.asset_status_enum);
CREATE FUNCTION public.create_asset(
  p_material_id UUID,
  p_width NUMERIC,
  p_height NUMERIC,
  p_asset_type public.asset_type_enum,
  p_display_name TEXT DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_status public.asset_status_enum DEFAULT 'available'
)
RETURNS public.assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_workspace_id UUID := public.get_user_workspace();
  v_user_id UUID := (SELECT auth.uid());
  v_number BIGINT;
  v_prefix TEXT;
  v_asset public.assets;
BEGIN
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_width <= 0 OR p_height <= 0 THEN
    RAISE EXCEPTION 'INVALID_DIMENSIONS';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.materials
    WHERE id = p_material_id AND workspace_id = v_workspace_id AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'INVALID_MATERIAL';
  END IF;

  IF p_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = p_location_id AND workspace_id = v_workspace_id
  ) THEN
    RAISE EXCEPTION 'INVALID_LOCATION';
  END IF;

  v_prefix := CASE p_asset_type
    WHEN 'full_sheet' THEN 'SHEET'
    WHEN 'remnant' THEN 'REMNANT'
    WHEN 'offcut' THEN 'OFFCUT'
    WHEN 'custom' THEN 'CUSTOM'
  END;

  INSERT INTO public.asset_counters (workspace_id, asset_type, last_value)
  VALUES (v_workspace_id, p_asset_type, 1)
  ON CONFLICT (workspace_id, asset_type) DO UPDATE
  SET last_value = public.asset_counters.last_value + 1
  RETURNING last_value INTO v_number;

  INSERT INTO public.assets (
    workspace_id, material_id, system_name, display_name, width, height,
    asset_type, status, location_id, created_by, updated_by
  ) VALUES (
    v_workspace_id, p_material_id,
    v_prefix || '-' || LPAD(v_number::TEXT, 4, '0'),
    NULLIF(BTRIM(p_display_name), ''), p_width, p_height,
    p_asset_type, p_status, p_location_id, v_user_id, v_user_id
  )
  RETURNING * INTO v_asset;

  INSERT INTO public.asset_events (
    asset_id, workspace_id, event_type, performed_by, notes
  ) VALUES (
    v_asset.id, v_workspace_id, 'purchased', v_user_id,
    'Initial asset creation via portal'
  );

  RETURN v_asset;
END;
$$;

-- ---------------------------------------------------------------------------
-- Database invariant: a live workspace must always retain an administrator.
CREATE OR REPLACE FUNCTION public.prevent_last_workspace_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_removes_admin BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_removes_admin := OLD.role = 'admin';
  ELSE
    v_removes_admin := OLD.role = 'admin' AND NEW.role <> 'admin';
  END IF;

  IF v_removes_admin
     AND EXISTS (
       SELECT 1 FROM public.workspaces WHERE id = OLD.workspace_id
     )
     AND (
       SELECT COUNT(*) FROM public.users
       WHERE workspace_id = OLD.workspace_id AND role = 'admin'
     ) <= 1 THEN
    RAISE EXCEPTION 'LAST_ADMIN';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_last_workspace_admin ON public.users;
CREATE TRIGGER protect_last_workspace_admin
  BEFORE UPDATE OF role OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_workspace_admin();
-- 6. Server-only desktop RPCs
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.increment_trial_run(TEXT);
DROP FUNCTION IF EXISTS public.increment_trial_run(TEXT, TEXT);
CREATE FUNCTION public.increment_trial_run(p_machine_id TEXT, p_ip TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_record public.trials;
BEGIN
  IF NULLIF(BTRIM(p_machine_id), '') IS NULL THEN
    RAISE EXCEPTION 'INVALID_MACHINE_ID';
  END IF;

  INSERT INTO public.trials (machine_id, runs_count, started_from_ip, last_ip)
  VALUES (p_machine_id, 1, p_ip, p_ip)
  ON CONFLICT (machine_id) DO UPDATE
  SET runs_count = public.trials.runs_count + 1,
      last_ip = COALESCE(p_ip, public.trials.last_ip),
      updated_at = now()
  RETURNING * INTO v_record;

  RETURN json_build_object(
    'runs_count', v_record.runs_count,
    'days_left', GREATEST(
      0,
      90 - FLOOR(EXTRACT(EPOCH FROM (now() - v_record.started_at)) / 86400)::INT
    )
  );
END;
$$;

DROP FUNCTION IF EXISTS public.verify_license(TEXT);
DROP FUNCTION IF EXISTS public.verify_license(TEXT, TEXT);
CREATE FUNCTION public.verify_license(p_cdkey TEXT, p_app TEXT)
RETURNS TABLE (
  id UUID,
  status TEXT,
  bound_machine_id TEXT,
  workspace_id UUID,
  app TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_app NOT IN ('kerfcut', 'kerfstock') THEN
    RAISE EXCEPTION 'INVALID_APP';
  END IF;

  v_hash := encode(public.digest(p_cdkey, 'sha256'), 'hex');

  RETURN QUERY
  SELECT l.id, l.status, l.bound_machine_id, l.workspace_id, l.app
  FROM public.license_slots AS l
  WHERE (l.cdkey_hash = v_hash OR l.cdkey = p_cdkey)
    AND l.app = p_app;
END;
$$;

DROP FUNCTION IF EXISTS public.bind_machine(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.bind_machine(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.bind_machine(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE FUNCTION public.bind_machine(
  p_cdkey TEXT,
  p_machine_id TEXT,
  p_app TEXT,
  p_app_version TEXT DEFAULT NULL,
  p_os_info TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
  v_bound_machine_id TEXT;
  v_license_id UUID;
  v_hash TEXT;
BEGIN
  IF p_app NOT IN ('kerfcut', 'kerfstock') THEN
    RAISE EXCEPTION 'INVALID_APP';
  END IF;

  v_hash := encode(public.digest(p_cdkey, 'sha256'), 'hex');

  SELECT status, bound_machine_id, id
  INTO v_status, v_bound_machine_id, v_license_id
  FROM public.license_slots
  WHERE (cdkey_hash = v_hash OR cdkey = p_cdkey)
    AND app = p_app
  FOR UPDATE;

  IF v_license_id IS NULL THEN
    RAISE EXCEPTION 'LICENSE_NOT_FOUND';
  END IF;

  IF v_status = 'revoked' THEN
    RAISE EXCEPTION 'LICENSE_REVOKED';
  END IF;

  IF v_bound_machine_id IS NOT NULL AND v_bound_machine_id <> p_machine_id THEN
    RAISE EXCEPTION 'LICENSE_ALREADY_BOUND';
  END IF;

  UPDATE public.license_slots
  SET status = 'active',
      bound_machine_id = p_machine_id,
      redeemed_at = COALESCE(redeemed_at, now()),
      last_seen_at = now(),
      last_ip = COALESCE(p_ip, last_ip),
      app_version = COALESCE(p_app_version, app_version),
      os_info = COALESCE(p_os_info, os_info)
  WHERE id = v_license_id;

  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.commit_kerfcut_job(UUID, TEXT, UUID[], JSONB);
CREATE FUNCTION public.commit_kerfcut_job(
  p_workspace_id UUID,
  p_job_reference TEXT,
  p_consumed_assets UUID[],
  p_generated_remnants JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated_count INTEGER;
  v_remnant JSONB;
  v_asset_type public.asset_type_enum;
  v_prefix TEXT;
  v_number BIGINT;
  v_created_asset public.assets;
  v_created_remnants JSONB := '[]'::JSONB;
  v_material_id UUID;
  v_location_id UUID;
  v_source_asset_id UUID;
  v_width NUMERIC;
  v_height NUMERIC;
BEGIN
  IF p_workspace_id IS NULL OR NULLIF(BTRIM(p_job_reference), '') IS NULL THEN
    RAISE EXCEPTION 'INVALID_JOB';
  END IF;

  IF p_consumed_assets IS NULL OR CARDINALITY(p_consumed_assets) = 0 THEN
    RAISE EXCEPTION 'INVALID_CONSUMED_ASSETS';
  END IF;

  IF (SELECT COUNT(DISTINCT value) FROM UNNEST(p_consumed_assets) AS value)
      <> CARDINALITY(p_consumed_assets) THEN
    RAISE EXCEPTION 'DUPLICATE_CONSUMED_ASSETS';
  END IF;

  IF p_generated_remnants IS NOT NULL
     AND jsonb_typeof(p_generated_remnants) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_REMNANTS';
  END IF;

  PERFORM id
  FROM public.assets
  WHERE workspace_id = p_workspace_id
    AND id = ANY(p_consumed_assets)
  ORDER BY id
  FOR UPDATE;

  UPDATE public.assets
  SET status = 'consumed',
      job_reference = p_job_reference,
      updated_at = now(),
      updated_by = NULL
  WHERE workspace_id = p_workspace_id
    AND id = ANY(p_consumed_assets)
    AND status = 'available';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count <> CARDINALITY(p_consumed_assets) THEN
    RAISE EXCEPTION 'CONFLICT: One or more assets are unavailable';
  END IF;

  FOR v_remnant IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_generated_remnants, '[]'::JSONB))
  LOOP
    v_material_id := (v_remnant->>'material_id')::UUID;
    v_location_id := NULLIF(v_remnant->>'location_id', '')::UUID;
    v_source_asset_id := (v_remnant->>'source_asset_id')::UUID;
    v_width := (v_remnant->>'width')::NUMERIC;
    v_height := (v_remnant->>'height')::NUMERIC;

    IF v_width <= 0 OR v_height <= 0 THEN
      RAISE EXCEPTION 'INVALID_REMNANT_DIMENSIONS';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.materials
      WHERE id = v_material_id
        AND workspace_id = p_workspace_id
        AND is_deleted = false
    ) THEN
      RAISE EXCEPTION 'INVALID_REMNANT_MATERIAL';
    END IF;

    IF v_location_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.locations
      WHERE id = v_location_id AND workspace_id = p_workspace_id
    ) THEN
      RAISE EXCEPTION 'INVALID_REMNANT_LOCATION';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.assets
      WHERE id = v_source_asset_id
        AND workspace_id = p_workspace_id
        AND id = ANY(p_consumed_assets)
        AND material_id = v_material_id
    ) THEN
      RAISE EXCEPTION 'INVALID_REMNANT_SOURCE';
    END IF;

    IF v_width * v_height < 400 * 400 THEN
      v_asset_type := 'offcut';
      v_prefix := 'OFFCUT';
    ELSE
      v_asset_type := 'remnant';
      v_prefix := 'REMNANT';
    END IF;

    INSERT INTO public.asset_counters (workspace_id, asset_type, last_value)
    VALUES (p_workspace_id, v_asset_type, 1)
    ON CONFLICT (workspace_id, asset_type) DO UPDATE
    SET last_value = public.asset_counters.last_value + 1
    RETURNING last_value INTO v_number;

    INSERT INTO public.assets (
      workspace_id, material_id, system_name, width, height, asset_type,
      status, location_id, source_asset_id, job_reference
    ) VALUES (
      p_workspace_id, v_material_id,
      v_prefix || '-' || LPAD(v_number::TEXT, 4, '0'),
      v_width, v_height, v_asset_type, 'available', v_location_id,
      v_source_asset_id, p_job_reference
    )
    RETURNING * INTO v_created_asset;

    INSERT INTO public.asset_events (
      asset_id, workspace_id, event_type, performed_by, notes, metadata
    ) VALUES (
      v_created_asset.id, p_workspace_id, 'received_from_kerfcut', NULL,
      'Generated from KerfCut job ' || p_job_reference,
      jsonb_build_object('job_reference', p_job_reference)
    );

    v_created_remnants := v_created_remnants || jsonb_build_array(
      jsonb_build_object(
        'id', v_created_asset.id,
        'system_name', v_created_asset.system_name,
        'width', v_created_asset.width,
        'height', v_created_asset.height,
        'asset_type', v_created_asset.asset_type
      )
    );
  END LOOP;

  INSERT INTO public.asset_events (
    asset_id, workspace_id, event_type, performed_by, notes, metadata
  )
  SELECT
    id, p_workspace_id, 'cut', NULL,
    'Consumed in KerfCut job ' || p_job_reference,
    jsonb_build_object('job_reference', p_job_reference)
  FROM public.assets
  WHERE workspace_id = p_workspace_id AND id = ANY(p_consumed_assets);

  RETURN jsonb_build_object(
    'status', 'committed',
    'consumed_count', v_updated_count,
    'remnants_created', v_created_remnants
  );
END;
$$;

-- New public signups always receive a new personal workspace. Caller-controlled
-- user metadata is never trusted for workspace membership or administrative role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  INSERT INTO public.workspaces (name)
  VALUES (COALESCE(NULLIF(BTRIM(new.raw_user_meta_data->>'workspace_name'), ''), 'My Workshop'))
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.users (id, workspace_id, email, role)
  VALUES (new.id, v_workspace_id, new.email, 'admin');

  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- Server-only reassignment used after Supabase creates an invited Auth user.
CREATE OR REPLACE FUNCTION public.assign_invited_user(
  p_user_id UUID,
  p_workspace_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provisional_workspace_id UUID;
BEGIN
  IF (SELECT auth.role()) <> 'service_role' THEN
    RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED';
  END IF;

  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = p_workspace_id) THEN
    RAISE EXCEPTION 'WORKSPACE_NOT_FOUND';
  END IF;

  SELECT workspace_id INTO v_provisional_workspace_id
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_provisional_workspace_id IS NULL THEN
    RAISE EXCEPTION 'USER_PROFILE_NOT_FOUND';
  END IF;

  -- Move first without changing role, then remove the empty personal workspace.
  -- The final role update is evaluated inside the destination workspace.
  UPDATE public.users
  SET workspace_id = p_workspace_id
  WHERE id = p_user_id;

  IF v_provisional_workspace_id <> p_workspace_id THEN
    DELETE FROM public.workspaces
    WHERE id = v_provisional_workspace_id
      AND NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE workspace_id = v_provisional_workspace_id
      );
  END IF;

  UPDATE public.users
  SET role = p_role
  WHERE id = p_user_id AND workspace_id = p_workspace_id;
END;
$$;
-- 7. Explicit privileges: public and anon receive no privileged RPC access
-- ---------------------------------------------------------------------------

REVOKE ALL ON public.workspaces, public.users, public.license_slots,
  public.trials, public.audit_logs, public.materials, public.locations,
  public.assets, public.asset_events, public.asset_counters
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_user_workspace() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_user_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workspace_allows_app(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_workspace_users(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_workspace_user_role(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_asset(UUID, NUMERIC, NUMERIC, public.asset_type_enum, TEXT, UUID, public.asset_status_enum) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_last_workspace_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_invited_user(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_trial_run(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_license(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bind_machine(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_kerfcut_job(UUID, TEXT, UUID[], JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.workspaces TO authenticated;
GRANT UPDATE (name) ON public.workspaces TO authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_slots TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT SELECT ON public.assets TO authenticated;
GRANT SELECT ON public.asset_events TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_allows_app(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_workspace_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_asset(UUID, NUMERIC, NUMERIC, public.asset_type_enum, TEXT, UUID, public.asset_status_enum) TO authenticated;

GRANT EXECUTE ON FUNCTION public.assign_invited_user(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_trial_run(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_license(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.bind_machine(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_kerfcut_job(UUID, TEXT, UUID[], JSONB) TO service_role;

COMMIT;

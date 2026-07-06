-- ==========================================================
-- KERFSUITE MASTER DATABASE SCHEMA
-- Version: 1.1.0
-- Description: Consolidated schema including KerfPortal,
--              KerfCut, and KerfStock inventory.
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMERATIONS
DO $$ BEGIN
    CREATE TYPE public.asset_type_enum AS ENUM ('full_sheet', 'remnant', 'offcut', 'custom');
    CREATE TYPE public.asset_status_enum AS ENUM ('available', 'reserved', 'consumed', 'disposed', 'damaged', 'missing');
    CREATE TYPE public.event_type_enum AS ENUM ('purchased', 'moved', 'cut', 'renamed', 'reserved', 'released', 'consumed', 'disposed', 'damaged', 'missing', 'recovered', 'received_from_kerfcut', 'conflict_rejected', 'tag_added', 'tag_removed', 'note_added', 'workspace_provisioned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CORE TABLES

-- Workspaces (Tenants)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'My Workshop',
    allowed_apps TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (Links auth.users to workspaces)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- License Slots (CDKeys)
CREATE TABLE IF NOT EXISTS public.license_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    app TEXT NOT NULL DEFAULT 'kerfcut', -- 'kerfcut', 'kerfstock'
    cdkey TEXT UNIQUE,
    cdkey_hash TEXT UNIQUE,
    label TEXT, -- Human-readable name for the machine
    status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'revoked'
    bound_machine_id TEXT, -- Populated when a machine redeems the key
    redeemed_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    last_ip TEXT,
    app_version TEXT,
    os_info TEXT,
    abuse_score INTEGER NOT NULL DEFAULT 0,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_license_slots_cdkey_hash ON public.license_slots(cdkey_hash);

-- Trials (For desktop app tracking)
CREATE TABLE IF NOT EXISTS public.trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id TEXT UNIQUE NOT NULL,
    runs_count INTEGER NOT NULL DEFAULT 0,
    started_from_ip TEXT,
    last_ip TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs (General Portal/System Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_email TEXT,
    action_type TEXT NOT NULL,
    target_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. STOCK / INVENTORY TABLES (KerfStock)

CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    thickness NUMERIC,
    unit TEXT NOT NULL DEFAULT 'mm',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
    system_name TEXT NOT NULL, -- e.g. SHEET-0001
    display_name TEXT,
    width NUMERIC NOT NULL,
    height NUMERIC NOT NULL,
    asset_type public.asset_type_enum NOT NULL DEFAULT 'full_sheet',
    status public.asset_status_enum NOT NULL DEFAULT 'available',
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    source_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    job_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.asset_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event_type public.event_type_enum NOT NULL,
    performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    metadata JSONB
);

-- 5. SECURITY: ENABLE RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_events ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES

-- Workspaces: Users view own workspace only
DROP POLICY IF EXISTS "Users view own workspace" ON public.workspaces;
CREATE POLICY "Users view own workspace" ON public.workspaces FOR SELECT
USING (id IN (SELECT workspace_id FROM public.users WHERE users.id = auth.uid()));

-- Users: Users view workspace peers
DROP POLICY IF EXISTS "Users view workspace peers" ON public.users;
CREATE POLICY "Users view workspace peers" ON public.users FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE users.id = auth.uid()));

-- License Slots: Members can view, only Admins can write
DROP POLICY IF EXISTS "Members view workspace licenses" ON public.license_slots;
CREATE POLICY "Members view workspace licenses" ON public.license_slots FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage workspace licenses" ON public.license_slots;
CREATE POLICY "Admins manage workspace licenses" ON public.license_slots FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Audit Logs: Members can view and insert
DROP POLICY IF EXISTS "Users view audit logs" ON public.audit_logs;
CREATE POLICY "Users view audit logs" ON public.audit_logs FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "Members insert audit logs" ON public.audit_logs;
CREATE POLICY "Members insert audit logs" ON public.audit_logs FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.users WHERE users.id = auth.uid()));

-- Stock Policies: Strict Workspace Isolation
-- Hardened for Suite Integration (Allows Portal users and KerfCut Service Role)
CREATE POLICY "Workspace Isolation" ON public.materials FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE users.id = auth.uid()) OR auth.role() = 'service_role');
CREATE POLICY "Workspace Isolation" ON public.locations FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE users.id = auth.uid()) OR auth.role() = 'service_role');
CREATE POLICY "Workspace Isolation" ON public.assets FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE users.id = auth.uid()) OR auth.role() = 'service_role');
CREATE POLICY "Workspace Isolation" ON public.asset_events FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.users WHERE users.id = auth.uid()) OR auth.role() = 'service_role');

-- Trials: Strict RPC-only access (No direct table access for anon/authenticated)
DROP POLICY IF EXISTS "Public trials access" ON public.trials;
DROP POLICY IF EXISTS "Allow anon insert trials" ON public.trials;
DROP POLICY IF EXISTS "Allow anon read trials" ON public.trials;
DROP POLICY IF EXISTS "Allow anon update trials" ON public.trials;

-- 7. FUNCTIONS & RPCs

-- Atomic Trial Increment
CREATE OR REPLACE FUNCTION public.increment_trial_run(p_machine_id TEXT, p_ip TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_record public.trials;
BEGIN
    INSERT INTO public.trials (machine_id, runs_count, started_from_ip, last_ip)
    VALUES (p_machine_id, 1, p_ip, p_ip)
    ON CONFLICT (machine_id) DO UPDATE
    SET runs_count = trials.runs_count + 1,
        last_ip = COALESCE(p_ip, trials.last_ip),
        updated_at = now()
    RETURNING * INTO v_record;

    RETURN json_build_object(
        'runs_count', v_record.runs_count,
        'days_left', GREATEST(0, 14 - (EXTRACT(EPOCH FROM (now() - v_record.started_at)) / 86400)::INT)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Secure License Verification
CREATE OR REPLACE FUNCTION public.verify_license(p_cdkey TEXT)
RETURNS TABLE (id UUID, cdkey TEXT, status TEXT, bound_machine_id TEXT, workspace_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_hash TEXT;
BEGIN
    v_hash := encode(digest(p_cdkey, 'sha256'), 'hex');

    RETURN QUERY
    SELECT l.id, l.cdkey, l.status, l.bound_machine_id, l.workspace_id
    FROM public.license_slots l
    WHERE l.cdkey_hash = v_hash OR l.cdkey = p_cdkey;
END;
$$;

-- Secure License Binding
CREATE OR REPLACE FUNCTION public.bind_machine(
    p_cdkey TEXT,
    p_machine_id TEXT,
    p_app_version TEXT DEFAULT NULL,
    p_os_info TEXT DEFAULT NULL,
    p_ip TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_status TEXT;
    v_bound TEXT;
    v_id UUID;
    v_hash TEXT;
BEGIN
    v_hash := encode(digest(p_cdkey, 'sha256'), 'hex');

    SELECT status, bound_machine_id, id INTO v_status, v_bound, v_id
    FROM public.license_slots
    WHERE cdkey_hash = v_hash OR cdkey = p_cdkey;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'License not found';
    END IF;

    IF v_status = 'revoked' THEN
        RAISE EXCEPTION 'License is revoked';
    END IF;

    IF v_bound IS NOT NULL AND v_bound != p_machine_id THEN
        RAISE EXCEPTION 'License is already bound to another machine';
    END IF;

    UPDATE public.license_slots
    SET status = 'active',
        bound_machine_id = p_machine_id,
        redeemed_at = COALESCE(redeemed_at, now()),
        last_seen_at = now(),
        last_ip = COALESCE(p_ip, last_ip),
        app_version = COALESCE(p_app_version, app_version),
        os_info = COALESCE(p_os_info, os_info)
    WHERE id = v_id;

    RETURN true;
END;
$$;

-- Secure Fetch Workspace Users (Fixes N+1)
CREATE OR REPLACE FUNCTION public.get_workspace_users(p_workspace_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    confirmed BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Security check: only allow members of the workspace to call this
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.workspace_id = p_workspace_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.email,
        u.role,
        u.created_at,
        (au.email_confirmed_at IS NOT NULL)
    FROM public.users u
    JOIN auth.users au ON u.id = au.id
    WHERE u.workspace_id = p_workspace_id
    ORDER BY u.created_at DESC;
END;
$$;

-- Auto-create User Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_workspace_id UUID;
    target_role TEXT;
BEGIN
    target_workspace_id := (new.raw_user_meta_data->>'workspace_id')::UUID;

    -- If no workspace is provided (direct signup), create a personal workspace
    IF target_workspace_id IS NULL THEN
        INSERT INTO public.workspaces (name) 
        VALUES (COALESCE(new.raw_user_meta_data->>'workspace_name', 'My Workshop')) 
        RETURNING id INTO target_workspace_id;
        
        target_role := 'admin';
    ELSE
        -- Read role from metadata, default to 'member'
        target_role := COALESCE(new.raw_user_meta_data->>'role', 'member');
    END IF;
    
    INSERT INTO public.users (id, workspace_id, email, role)
    VALUES (new.id, target_workspace_id, new.email, target_role);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. PERMISSIONS (Strict hardening)

-- Revoke all from PUBLIC by default
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Grant to Authenticated (standard portal users)
GRANT SELECT ON public.workspaces TO authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE (role) ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_slots TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_events TO authenticated;

-- Revoke from Authenticated (desktop app RPCs don't need portal user access)
REVOKE EXECUTE ON FUNCTION public.increment_trial_run(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_license(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bind_machine(TEXT, TEXT) FROM authenticated;

-- Grant to Anon (desktop app via RPC)
GRANT EXECUTE ON FUNCTION public.increment_trial_run(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_license(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.bind_machine(TEXT, TEXT) TO anon;

-- 9. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.license_slots
  ADD COLUMN IF NOT EXISTS cdkey_hash TEXT,
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_ip TEXT,
  ADD COLUMN IF NOT EXISTS app_version TEXT,
  ADD COLUMN IF NOT EXISTS os_info TEXT,
  ADD COLUMN IF NOT EXISTS abuse_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.license_slots
  ALTER COLUMN cdkey DROP NOT NULL;

UPDATE public.license_slots
SET cdkey_hash = encode(extensions.digest(cdkey, 'sha256'), 'hex')
WHERE cdkey_hash IS NULL
  AND cdkey IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_license_slots_cdkey_hash
  ON public.license_slots(cdkey_hash);

ALTER TABLE public.license_slots
  DROP CONSTRAINT IF EXISTS license_slots_app_check;
ALTER TABLE public.license_slots
  ADD CONSTRAINT license_slots_app_check
  CHECK (app IN ('kerfcut', 'kerfstock'));

ALTER TABLE public.license_slots
  DROP CONSTRAINT IF EXISTS license_slots_status_check;
ALTER TABLE public.license_slots
  ADD CONSTRAINT license_slots_status_check
  CHECK (status IN ('waiting', 'active', 'revoked'));

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

  v_hash := encode(extensions.digest(p_cdkey, 'sha256'), 'hex');

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

  v_hash := encode(extensions.digest(p_cdkey, 'sha256'), 'hex');

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

REVOKE ALL ON FUNCTION public.verify_license(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bind_machine(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.verify_license(TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.bind_machine(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

COMMIT;
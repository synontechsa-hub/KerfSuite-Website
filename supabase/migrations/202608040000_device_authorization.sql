BEGIN;

CREATE TABLE IF NOT EXISTS public.desktop_authorization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code_hash TEXT NOT NULL UNIQUE,
  user_code_hash TEXT NOT NULL UNIQUE,
  app TEXT NOT NULL CHECK (app IN ('kerfcut', 'kerfstock')),
  machine_id TEXT NOT NULL,
  app_version TEXT,
  os_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'consumed', 'denied')),
  license_slot_id UUID REFERENCES public.license_slots(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_desktop_authorization_pending ON public.desktop_authorization_requests(status, expires_at);
ALTER TABLE public.desktop_authorization_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.approve_desktop_authorization(p_user_code_hash TEXT, p_license_slot_id UUID, p_actor_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_request public.desktop_authorization_requests%ROWTYPE; v_slot public.license_slots%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM public.desktop_authorization_requests WHERE user_code_hash = p_user_code_hash FOR UPDATE;
  IF v_request.id IS NULL OR v_request.status <> 'pending' OR v_request.expires_at <= now() THEN RAISE EXCEPTION 'AUTHORIZATION_NOT_PENDING'; END IF;
  SELECT * INTO v_slot FROM public.license_slots WHERE id = p_license_slot_id FOR UPDATE;
  IF v_slot.id IS NULL OR v_slot.app <> v_request.app OR v_slot.status = 'revoked' THEN RAISE EXCEPTION 'LICENSE_NOT_ELIGIBLE'; END IF;
  IF v_slot.bound_machine_id IS NOT NULL AND v_slot.bound_machine_id <> v_request.machine_id THEN RAISE EXCEPTION 'LICENSE_ALREADY_BOUND'; END IF;
  UPDATE public.license_slots SET status = 'active', bound_machine_id = v_request.machine_id, redeemed_at = COALESCE(redeemed_at, now()), last_seen_at = now(), app_version = COALESCE(v_request.app_version, app_version), os_info = COALESCE(v_request.os_info, os_info) WHERE id = v_slot.id;
  UPDATE public.desktop_authorization_requests SET status = 'approved', license_slot_id = v_slot.id, approved_by = p_actor_id, approved_at = now() WHERE id = v_request.id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_desktop_authorization(p_device_code_hash TEXT)
RETURNS TABLE (license_slot_id UUID, workspace_id UUID, app TEXT, machine_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_request public.desktop_authorization_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM public.desktop_authorization_requests WHERE device_code_hash = p_device_code_hash FOR UPDATE;
  IF v_request.id IS NULL OR v_request.status <> 'approved' OR v_request.expires_at <= now() THEN RETURN; END IF;
  UPDATE public.desktop_authorization_requests SET status = 'consumed', consumed_at = now() WHERE id = v_request.id;
  RETURN QUERY SELECT l.id, l.workspace_id, l.app, v_request.machine_id FROM public.license_slots l WHERE l.id = v_request.license_slot_id AND l.status = 'active';
END;
$$;

REVOKE ALL ON TABLE public.desktop_authorization_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_desktop_authorization(TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_desktop_authorization(TEXT) FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.desktop_authorization_requests TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_desktop_authorization(TEXT, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_desktop_authorization(TEXT) TO service_role;

COMMIT;

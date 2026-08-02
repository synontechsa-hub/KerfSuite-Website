BEGIN;

-- Workspace invitations are delivered by the administrator through any channel
-- they choose. Only a SHA-256 digest is stored, so a database read cannot reveal
-- a usable invitation link.
CREATE TABLE public.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT workspace_invites_normalized_email
    CHECK (email = LOWER(BTRIM(email))),
  CONSTRAINT workspace_invites_expiry_after_creation
    CHECK (expires_at > created_at),
  CONSTRAINT workspace_invites_claim_state
    CHECK (
      (claimed_at IS NULL AND claimed_by IS NULL)
      OR (claimed_at IS NOT NULL AND claimed_by IS NOT NULL)
    )
);

CREATE UNIQUE INDEX workspace_invites_active_email_key
ON public.workspace_invites (workspace_id, email)
WHERE claimed_at IS NULL;

CREATE INDEX workspace_invites_workspace_created_idx
ON public.workspace_invites (workspace_id, created_at DESC);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view workspace invitations"
ON public.workspace_invites FOR SELECT TO authenticated
USING (
  workspace_id = public.get_user_workspace()
  AND public.is_user_admin()
);

CREATE POLICY "Admins revoke workspace invitations"
ON public.workspace_invites FOR DELETE TO authenticated
USING (
  workspace_id = public.get_user_workspace()
  AND public.is_user_admin()
);

-- Creation is an atomic authenticated RPC. Browser roles cannot insert directly,
-- and the JWT assurance level is checked again inside the database.
CREATE FUNCTION public.create_workspace_invite(
  p_email TEXT,
  p_token_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_workspace_id UUID;
  v_invite_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  IF COALESCE(auth.jwt()->>'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'MFA_REQUIRED';
  END IF;

  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  IF p_email IS NULL
     OR p_email <> LOWER(BTRIM(p_email))
     OR CHAR_LENGTH(p_email) > 320
     OR STRPOS(p_email, '@') <= 1 THEN
    RAISE EXCEPTION 'INVALID_EMAIL';
  END IF;

  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'INVALID_TOKEN_HASH';
  END IF;

  v_workspace_id := public.get_user_workspace();
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'WORKSPACE_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users AS existing_user
    WHERE existing_user.workspace_id = v_workspace_id
      AND LOWER(existing_user.email) = p_email
  ) THEN
    RAISE EXCEPTION 'USER_ALREADY_IN_WORKSPACE';
  END IF;

  DELETE FROM public.workspace_invites AS old_invite
  WHERE old_invite.workspace_id = v_workspace_id
    AND old_invite.email = p_email
    AND old_invite.claimed_at IS NULL;

  INSERT INTO public.workspace_invites (
    workspace_id,
    email,
    role,
    token_hash,
    created_by,
    expires_at
  ) VALUES (
    v_workspace_id,
    p_email,
    'member',
    p_token_hash,
    v_actor_id,
    now() + INTERVAL '7 days'
  )
  RETURNING id INTO v_invite_id;

  RETURN v_invite_id;
END;
$$;
-- Claiming is authenticated but does not require the claimant to already belong
-- to the destination workspace. The function validates the verified Auth email,
-- locks the invitation, and only permits an untouched personal workspace to move.
CREATE FUNCTION public.claim_workspace_invite(p_token TEXT)
RETURNS TABLE (workspace_id UUID, workspace_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_email_confirmed_at TIMESTAMPTZ;
  v_token_hash TEXT;
  v_invite public.workspace_invites%ROWTYPE;
  v_current_workspace_id UUID;
  v_current_role TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  IF p_token IS NULL OR p_token !~ '^[A-Za-z0-9_-]{43}$' THEN
    RAISE EXCEPTION 'INVALID_INVITATION';
  END IF;

  SELECT LOWER(email), email_confirmed_at
  INTO v_user_email, v_email_confirmed_at
  FROM auth.users
  WHERE id = v_user_id;

  IF v_user_email IS NULL OR v_email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'VERIFIED_EMAIL_REQUIRED';
  END IF;

  v_token_hash := encode(public.digest(p_token, 'sha256'), 'hex');

  SELECT *
  INTO v_invite
  FROM public.workspace_invites
  WHERE token_hash = v_token_hash
  FOR UPDATE;

  IF NOT FOUND OR v_invite.claimed_at IS NOT NULL OR v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'INVITATION_EXPIRED_OR_INVALID';
  END IF;

  IF v_invite.email <> v_user_email THEN
    RAISE EXCEPTION 'INVITATION_EMAIL_MISMATCH';
  END IF;

  SELECT u.workspace_id, u.role
  INTO v_current_workspace_id, v_current_role
  FROM public.users AS u
  WHERE u.id = v_user_id
  FOR UPDATE;

  IF v_current_workspace_id IS NULL THEN
    RAISE EXCEPTION 'USER_PROFILE_NOT_FOUND';
  END IF;

  IF v_current_workspace_id = v_invite.workspace_id THEN
    UPDATE public.workspace_invites
    SET claimed_at = now(), claimed_by = v_user_id
    WHERE id = v_invite.id;

    RETURN QUERY
    SELECT w.id, w.name
    FROM public.workspaces AS w
    WHERE w.id = v_invite.workspace_id;
    RETURN;
  END IF;

  IF v_current_role <> 'admin'
     OR (SELECT COUNT(*) FROM public.users AS member WHERE member.workspace_id = v_current_workspace_id) <> 1
     OR EXISTS (SELECT 1 FROM public.license_slots AS slot WHERE slot.workspace_id = v_current_workspace_id)
     OR EXISTS (SELECT 1 FROM public.materials AS material WHERE material.workspace_id = v_current_workspace_id)
     OR EXISTS (SELECT 1 FROM public.locations AS location WHERE location.workspace_id = v_current_workspace_id)
     OR EXISTS (SELECT 1 FROM public.assets AS asset WHERE asset.workspace_id = v_current_workspace_id) THEN
    RAISE EXCEPTION 'EXISTING_WORKSPACE_CANNOT_BE_REPLACED';
  END IF;

  -- Moving first leaves the provisional workspace empty. Updating the role
  -- afterwards lets the last-admin trigger evaluate the destination workspace.
  UPDATE public.users
  SET workspace_id = v_invite.workspace_id
  WHERE id = v_user_id;

  UPDATE public.users
  SET role = v_invite.role
  WHERE id = v_user_id;

  UPDATE public.workspace_invites
  SET claimed_at = now(), claimed_by = v_user_id
  WHERE id = v_invite.id;

  DELETE FROM public.workspaces
  WHERE id = v_current_workspace_id
    AND NOT EXISTS (
      SELECT 1 FROM public.users AS remaining_user
      WHERE remaining_user.workspace_id = v_current_workspace_id
    );

  INSERT INTO public.audit_logs (
    workspace_id,
    actor_id,
    actor_email,
    action_type,
    target_id,
    description
  ) VALUES (
    v_invite.workspace_id,
    v_user_id,
    v_user_email,
    'workspace_invite_claimed',
    v_invite.id::TEXT,
    'Workspace invitation accepted'
  );

  RETURN QUERY
  SELECT w.id, w.name
  FROM public.workspaces AS w
  WHERE w.id = v_invite.workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace_invite(TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.workspace_invites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_workspace_invite(TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_workspace_invite(TEXT, TEXT) TO authenticated;
GRANT SELECT, DELETE ON public.workspace_invites TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_workspace_invite(TEXT) TO authenticated;

COMMIT;

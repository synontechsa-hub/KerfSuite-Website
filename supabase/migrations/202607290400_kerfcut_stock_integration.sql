BEGIN;

CREATE TABLE IF NOT EXISTS public.kerfcut_stock_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  commit_token UUID NOT NULL,
  job_reference TEXT NOT NULL,
  consumed_assets JSONB NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, commit_token)
);

ALTER TABLE public.kerfcut_stock_commits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.kerfcut_stock_commits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.commit_kerfcut_stock_job(
  p_workspace_id UUID,
  p_commit_token UUID,
  p_job_reference TEXT,
  p_consumed_assets JSONB,
  p_generated_remnants JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item JSONB;
  v_remnant JSONB;
  v_asset public.assets;
  v_created public.assets;
  v_asset_id UUID;
  v_quantity INTEGER;
  v_remaining INTEGER;
  v_total INTEGER := 0;
  v_batches INTEGER := 0;
  v_material_id UUID;
  v_location_id UUID;
  v_source_asset_id UUID;
  v_width NUMERIC;
  v_height NUMERIC;
  v_type public.asset_type_enum;
  v_prefix TEXT;
  v_number BIGINT;
  v_remnants JSONB := '[]'::JSONB;
  v_result JSONB;
BEGIN
  IF p_workspace_id IS NULL OR p_commit_token IS NULL
     OR NULLIF(BTRIM(p_job_reference), '') IS NULL THEN
    RAISE EXCEPTION 'INVALID_JOB';
  END IF;
  IF p_consumed_assets IS NULL OR jsonb_typeof(p_consumed_assets) <> 'array'
     OR jsonb_array_length(p_consumed_assets) = 0 THEN
    RAISE EXCEPTION 'INVALID_CONSUMED_ASSETS';
  END IF;
  IF p_generated_remnants IS NULL OR jsonb_typeof(p_generated_remnants) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_REMNANTS';
  END IF;

  SELECT result INTO v_result
  FROM public.kerfcut_stock_commits
  WHERE workspace_id = p_workspace_id AND commit_token = p_commit_token;
  IF FOUND THEN
    RETURN v_result || jsonb_build_object('idempotent_replay', true);
  END IF;

  IF (SELECT COUNT(DISTINCT value->>'asset_id') FROM jsonb_array_elements(p_consumed_assets))
     <> jsonb_array_length(p_consumed_assets) THEN
    RAISE EXCEPTION 'DUPLICATE_CONSUMED_ASSETS';
  END IF;

  INSERT INTO public.kerfcut_stock_commits (
    workspace_id, commit_token, job_reference, consumed_assets
  ) VALUES (
    p_workspace_id, p_commit_token, BTRIM(p_job_reference), p_consumed_assets
  ) ON CONFLICT (workspace_id, commit_token) DO NOTHING;

  IF NOT FOUND THEN
    SELECT result INTO v_result FROM public.kerfcut_stock_commits
    WHERE workspace_id = p_workspace_id AND commit_token = p_commit_token;
    RETURN v_result || jsonb_build_object('idempotent_replay', true);
  END IF;

  PERFORM asset.id
  FROM public.assets asset
  JOIN (
    SELECT (value->>'asset_id')::UUID id FROM jsonb_array_elements(p_consumed_assets)
  ) requested ON requested.id = asset.id
  WHERE asset.workspace_id = p_workspace_id
  ORDER BY asset.id
  FOR UPDATE OF asset;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_consumed_assets)
  LOOP
    BEGIN
      v_asset_id := (v_item->>'asset_id')::UUID;
      v_quantity := (v_item->>'quantity')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'INVALID_CONSUMED_ASSET';
    END;
    IF v_quantity < 1 OR v_quantity > 100000 THEN
      RAISE EXCEPTION 'INVALID_CONSUMPTION_QUANTITY';
    END IF;

    v_asset := NULL;
    SELECT * INTO v_asset FROM public.assets
    WHERE id = v_asset_id AND workspace_id = p_workspace_id FOR UPDATE;
    IF v_asset.id IS NULL OR v_asset.status <> 'available' THEN
      RAISE EXCEPTION 'CONFLICT: Asset % is unavailable', v_asset_id;
    END IF;
    IF v_asset.quantity < v_quantity THEN
      RAISE EXCEPTION 'CONFLICT: Asset % only has % sheet(s) available', v_asset.system_name, v_asset.quantity;
    END IF;
    IF v_asset.job_reference IS NOT NULL
       AND BTRIM(v_asset.job_reference) <> BTRIM(p_job_reference) THEN
      RAISE EXCEPTION 'CONFLICT: Asset % is allocated to job %', v_asset.system_name, v_asset.job_reference;
    END IF;

    v_remaining := v_asset.quantity - v_quantity;
    UPDATE public.assets
    SET quantity = CASE WHEN v_remaining = 0 THEN quantity ELSE v_remaining END,
        status = CASE WHEN v_remaining = 0 THEN 'consumed'::public.asset_status_enum ELSE status END,
        job_reference = CASE WHEN v_remaining = 0 THEN BTRIM(p_job_reference) ELSE job_reference END,
        updated_at = now(), updated_by = NULL
    WHERE id = v_asset_id;

    INSERT INTO public.asset_events (
      asset_id, workspace_id, event_type, performed_by, notes, metadata
    ) VALUES (
      v_asset_id, p_workspace_id, 'cut', NULL,
      'Consumed ' || v_quantity || ' sheet(s) in KerfCut job ' || BTRIM(p_job_reference),
      jsonb_build_object('job_reference', BTRIM(p_job_reference), 'commit_token', p_commit_token,
        'quantity_consumed', v_quantity, 'quantity_remaining', v_remaining)
    );
    v_total := v_total + v_quantity;
    v_batches := v_batches + 1;
  END LOOP;

  FOR v_remnant IN SELECT value FROM jsonb_array_elements(p_generated_remnants)
  LOOP
    BEGIN
      v_material_id := (v_remnant->>'material_id')::UUID;
      v_location_id := NULLIF(v_remnant->>'location_id', '')::UUID;
      v_source_asset_id := (v_remnant->>'source_asset_id')::UUID;
      v_width := (v_remnant->>'width')::NUMERIC;
      v_height := (v_remnant->>'height')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'INVALID_REMNANT';
    END;
    IF v_width <= 0 OR v_height <= 0 THEN RAISE EXCEPTION 'INVALID_REMNANT_DIMENSIONS'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.materials WHERE id = v_material_id
      AND workspace_id = p_workspace_id AND is_deleted = false) THEN
      RAISE EXCEPTION 'INVALID_REMNANT_MATERIAL';
    END IF;
    IF v_location_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.locations
      WHERE id = v_location_id AND workspace_id = p_workspace_id AND is_deleted = false) THEN
      RAISE EXCEPTION 'INVALID_REMNANT_LOCATION';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_consumed_assets) consumed
      WHERE (consumed->>'asset_id')::UUID = v_source_asset_id) THEN
      RAISE EXCEPTION 'INVALID_REMNANT_SOURCE';
    END IF;

    IF v_width * v_height < 400 * 400 THEN v_type := 'offcut'; v_prefix := 'OFFCUT';
    ELSE v_type := 'remnant'; v_prefix := 'REMNANT'; END IF;

    INSERT INTO public.asset_counters (workspace_id, asset_type, last_value)
    VALUES (p_workspace_id, v_type, 1)
    ON CONFLICT (workspace_id, asset_type) DO UPDATE
    SET last_value = public.asset_counters.last_value + 1 RETURNING last_value INTO v_number;

    INSERT INTO public.assets (workspace_id, material_id, system_name, width, height, quantity,
      asset_type, status, location_id, source_asset_id, job_reference)
    VALUES (p_workspace_id, v_material_id, v_prefix || '-' || LPAD(v_number::TEXT, 4, '0'),
      v_width, v_height, 1, v_type, 'available', v_location_id, v_source_asset_id, BTRIM(p_job_reference))
    RETURNING * INTO v_created;

    INSERT INTO public.asset_events (asset_id, workspace_id, event_type, performed_by, notes, metadata)
    VALUES (v_created.id, p_workspace_id, 'received_from_kerfcut', NULL,
      'Generated from KerfCut job ' || BTRIM(p_job_reference),
      jsonb_build_object('job_reference', BTRIM(p_job_reference), 'commit_token', p_commit_token));
    v_remnants := v_remnants || jsonb_build_array(jsonb_build_object('id', v_created.id,
      'system_name', v_created.system_name, 'width', v_created.width,
      'height', v_created.height, 'asset_type', v_created.asset_type));
  END LOOP;

  v_result := jsonb_build_object('status', 'committed', 'commit_token', p_commit_token,
    'sheets_consumed', v_total, 'batches_updated', v_batches,
    'remnants_created', v_remnants, 'idempotent_replay', false);
  UPDATE public.kerfcut_stock_commits SET result = v_result
  WHERE workspace_id = p_workspace_id AND commit_token = p_commit_token;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.commit_kerfcut_stock_job(UUID, UUID, TEXT, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_kerfcut_stock_job(UUID, UUID, TEXT, JSONB, JSONB)
  TO service_role;

COMMIT;

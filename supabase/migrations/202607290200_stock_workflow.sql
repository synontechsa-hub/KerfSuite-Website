BEGIN;

-- Locations are retired rather than deleted so historical asset records retain
-- their physical context. Job assignment remains optional for general stock.
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS job_reference TEXT,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_locations_workspace_active
  ON public.locations (workspace_id, is_deleted, name);

CREATE OR REPLACE FUNCTION public.create_assets_batch(
  p_material_id UUID,
  p_width NUMERIC,
  p_height NUMERIC,
  p_asset_type public.asset_type_enum,
  p_quantity INTEGER DEFAULT 1,
  p_display_name TEXT DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_status public.asset_status_enum DEFAULT 'available',
  p_job_reference TEXT DEFAULT NULL
)
RETURNS SETOF public.assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_asset public.assets;
  v_index INTEGER;
BEGIN
  IF p_quantity < 1 OR p_quantity > 500 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  FOR v_index IN 1..p_quantity LOOP
    SELECT * INTO v_asset
    FROM public.create_asset(
      p_material_id,
      p_width,
      p_height,
      p_asset_type,
      p_display_name,
      p_location_id,
      p_status
    );

    IF NULLIF(BTRIM(p_job_reference), '') IS NOT NULL THEN
      UPDATE public.assets
      SET job_reference = BTRIM(p_job_reference)
      WHERE id = v_asset.id
      RETURNING * INTO v_asset;
    END IF;

    RETURN NEXT v_asset;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_asset_details(
  p_asset_id UUID,
  p_material_id UUID,
  p_width NUMERIC,
  p_height NUMERIC,
  p_display_name TEXT,
  p_location_id UUID,
  p_status public.asset_status_enum,
  p_job_reference TEXT
)
RETURNS public.assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_workspace_id UUID := public.get_user_workspace();
  v_user_id UUID := (SELECT auth.uid());
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
    WHERE id = p_material_id
      AND workspace_id = v_workspace_id
      AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'INVALID_MATERIAL';
  END IF;

  IF p_location_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = p_location_id
      AND workspace_id = v_workspace_id
      AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'INVALID_LOCATION';
  END IF;

  UPDATE public.assets
  SET material_id = p_material_id,
      width = p_width,
      height = p_height,
      display_name = NULLIF(BTRIM(p_display_name), ''),
      location_id = p_location_id,
      status = p_status,
      job_reference = NULLIF(BTRIM(p_job_reference), ''),
      updated_at = now(),
      updated_by = v_user_id
  WHERE id = p_asset_id
    AND workspace_id = v_workspace_id
  RETURNING * INTO v_asset;

  IF v_asset.id IS NULL THEN
    RAISE EXCEPTION 'ASSET_NOT_FOUND';
  END IF;

  INSERT INTO public.asset_events (
    asset_id, workspace_id, event_type, performed_by, notes
  ) VALUES (
    v_asset.id, v_workspace_id, 'note_added', v_user_id,
    'Asset details updated via KerfStock'
  );

  RETURN v_asset;
END;
$$;

REVOKE ALL ON FUNCTION public.create_assets_batch(
  UUID, NUMERIC, NUMERIC, public.asset_type_enum, INTEGER, TEXT, UUID,
  public.asset_status_enum, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_asset_details(
  UUID, UUID, NUMERIC, NUMERIC, TEXT, UUID, public.asset_status_enum, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_assets_batch(
  UUID, NUMERIC, NUMERIC, public.asset_type_enum, INTEGER, TEXT, UUID,
  public.asset_status_enum, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_asset_details(
  UUID, UUID, NUMERIC, NUMERIC, TEXT, UUID, public.asset_status_enum, TEXT
) TO authenticated;

COMMIT;

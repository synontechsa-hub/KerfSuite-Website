BEGIN;

-- Inventory rows represent batches of interchangeable sheets. Quantity is kept
-- on the batch instead of creating one database row per physical sheet.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0);

CREATE OR REPLACE FUNCTION public.create_inventory_asset(
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
RETURNS public.assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_asset public.assets;
BEGIN
  IF p_quantity < 1 OR p_quantity > 100000 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

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

  UPDATE public.assets
  SET quantity = p_quantity,
      job_reference = NULLIF(BTRIM(p_job_reference), '')
  WHERE id = v_asset.id
  RETURNING * INTO v_asset;

  RETURN v_asset;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_asset(
  p_asset_id UUID,
  p_material_id UUID,
  p_width NUMERIC,
  p_height NUMERIC,
  p_quantity INTEGER,
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

  IF p_quantity < 1 OR p_quantity > 100000 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
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
      quantity = p_quantity,
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
    'Asset details or quantity updated via KerfStock'
  );

  RETURN v_asset;
END;
$$;

-- Retire inventory batches instead of deleting them so stock IDs and history
-- remain intact. Retired rows are hidden from the normal inventory view.
CREATE OR REPLACE FUNCTION public.archive_asset(p_asset_id UUID)
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

  UPDATE public.assets
  SET status = 'disposed',
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
    v_asset.id, v_workspace_id, 'disposed', v_user_id,
    'Inventory batch removed via KerfStock'
  );

  RETURN v_asset;
END;
$$;

REVOKE ALL ON FUNCTION public.create_inventory_asset(
  UUID, NUMERIC, NUMERIC, public.asset_type_enum, INTEGER, TEXT, UUID,
  public.asset_status_enum, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_inventory_asset(
  UUID, UUID, NUMERIC, NUMERIC, INTEGER, TEXT, UUID,
  public.asset_status_enum, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_asset(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_inventory_asset(
  UUID, NUMERIC, NUMERIC, public.asset_type_enum, INTEGER, TEXT, UUID,
  public.asset_status_enum, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_inventory_asset(
  UUID, UUID, NUMERIC, NUMERIC, INTEGER, TEXT, UUID,
  public.asset_status_enum, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_asset(UUID) TO authenticated;

COMMIT;
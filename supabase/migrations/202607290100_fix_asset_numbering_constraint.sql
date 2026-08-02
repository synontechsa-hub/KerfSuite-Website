BEGIN;

-- Preserve the intended tenant-scoped invariant before removing the legacy
-- global constraint left by the original schema.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.assets'::regclass
      AND conname = 'assets_workspace_system_name_key'
  ) THEN
    ALTER TABLE public.assets
      ADD CONSTRAINT assets_workspace_system_name_key
      UNIQUE (workspace_id, system_name);
  END IF;
END
$$;

-- Synchronize counters with existing names so the next generated value cannot
-- collide with inventory created before asset_counters was introduced.
LOCK TABLE public.assets IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO public.asset_counters (workspace_id, asset_type, last_value)
SELECT
  workspace_id,
  asset_type,
  GREATEST(
    COUNT(*)::BIGINT,
    COALESCE(MAX((SUBSTRING(system_name FROM '([0-9]+)$'))::BIGINT), 0)
  )
FROM public.assets
GROUP BY workspace_id, asset_type
ON CONFLICT (workspace_id, asset_type) DO UPDATE
SET last_value = GREATEST(public.asset_counters.last_value, EXCLUDED.last_value);

-- The original schema made system_name globally unique. Names are intentionally
-- unique per workspace, enforced by assets_workspace_system_name_key above.
ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_system_name_key;

COMMIT;

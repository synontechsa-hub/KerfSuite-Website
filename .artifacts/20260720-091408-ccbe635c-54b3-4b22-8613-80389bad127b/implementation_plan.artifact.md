# Implementation Plan - Reliability & Security Hardening

This plan addresses critical race conditions in inventory management and security vulnerabilities related to secret exposure in audit logs.

## User Review Required

> [!IMPORTANT]
> **Sequential Naming Change:** Switching from code-based naming (SHEET-0001) to database-driven naming. This ensures uniqueness but means `system_name` will be generated *at the moment of insertion* in the database, not predicted in the UI before saving.

## Proposed Changes

### 1. Database Layer (Schema & Logic)
Move naming logic and atomic operations into PostgreSQL to ensure ACID compliance and prevent race conditions.

#### [schema.sql](file:///D:/Coding/Synontech/Websites/Kerf_Suite/schema.sql)
- Add `generate_asset_name` function to handle `SHEET-0001` logic atomically using a per-workspace/type counter.
- Add `commit_kerfcut_job` RPC to handle asset consumption and remnant creation in a single transaction.
- Update `audit_logs` RLS to restrict `SELECT` to admins only (or mask sensitive data in a view).

```sql
-- New Function for Atomic Naming
CREATE OR REPLACE FUNCTION public.get_next_asset_number(p_workspace_id UUID, p_asset_type asset_type_enum)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Using a simple count for now but within the same transaction as the insert
    -- or a dedicated counters table for high-scale.
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.assets
    WHERE workspace_id = p_workspace_id AND asset_type = p_asset_type;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2. API Layer (Hardening)
Refactor API routes to use the new RPCs and enforce stricter validation.

#### [assets/route.ts](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/api/stock/assets/route.ts)
- Remove the code-based naming logic.
- Let the database handle the `system_name` generation.

#### [kerfcut/commit/route.ts](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/api/stock/kerfcut/commit/route.ts)
- Replace multi-step Supabase calls with a single call to the `commit_kerfcut_job` RPC.

---

### 3. Security & Audit
Fix data leakage and timing attack vulnerabilities.

#### [actions.ts](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/portal/actions.ts)
- Mask CDKey in `revokeKey` audit log (e.g., `...ABCD`).

#### [provision/route.ts](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/api/provision/route.ts)
- Use `crypto.timingSafeEqual` for secret comparison.

## Verification Plan

### Automated Tests
- `npm test tests/stock/commit.test.ts` (Existing)
- New test: `tests/security/audit_leak.test.ts` to verify CDKeys aren't logged raw.
- New test: `tests/stock/naming_concurrency.test.ts` (Simulate parallel POSTs to verify unique `system_name`).

### Manual Verification
- Generate and revoke a key, check `Audit Log` page to ensure it's masked.
- Add an asset manually in the UI, verify it gets the correct sequential name.
- Trigger a KerfCut commit via Postman/Curl and verify all changes (assets, remnants, events) appear correctly.

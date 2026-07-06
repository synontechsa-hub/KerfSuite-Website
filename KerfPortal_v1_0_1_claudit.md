# KerfPortal v1.0.1 — Claude Audit (claudit.md)

**Reviewer:** Claude
**Scope:** Full snapshot (63 files) — schema.sql, all API routes, server actions, middleware/proxy, auth flow, license/trial system, components
**Date:** July 2026

Overall take: this is a tight codebase, not a sloppy one. RLS is applied consistently, admin actions are MFA-gated, workspace scoping is double-checked at the app layer on top of RLS, and there's real thought put into abuse detection on the license system. The issues below are specific and fixable, not architectural rewrites.

---

## 🔴 Critical

### 1. `LEASE_SECRET` has a hardcoded, guessable fallback
**File:** `src/app/api/v1/licenses/verify/route.ts`
```ts
const leaseSecret = process.env.LEASE_SECRET || 'dev-industrial-secret-change-me'
```
If `LEASE_SECRET` is ever unset in production (deploy misconfig, new environment, typo'd env var name), this silently falls back to a fixed string that's now also sitting in your source snapshot. Since this secret HMAC-signs the offline lease token that KerfCut trusts for license verification, anyone with the fallback string can forge valid leases without a real license.

**Fix:** Fail loudly if the env var is missing — throw on module load / return 500 — rather than falling back to any default value.

### 2. Raw CDKeys leak into `audit_logs`, readable by every workspace member (not just admins)
**Files:** `src/app/actions.ts` (`generateKey`), `schema.sql` (RLS on `audit_logs`), `src/app/audit/page.tsx`

You deliberately avoid storing the raw CDKey in `license_slots` (`cdkey: null // SECURITY: Never store raw keys`) — good instinct. But `generateKey()` then does:
```ts
description: `Generated ${app} key: ${cdkey}`
```
straight into `audit_logs`. The RLS policy `"Users view audit logs"` is `FOR SELECT` for **any** workspace member, and `/audit/page.tsx` has no role check at all — the Sidebar just doesn't link to it for non-admins, which is security-through-obscurity, not access control. Any member can navigate to `/audit` directly and read every CDKey ever generated in the workspace. This fully undermines the hash-only storage decision.

**Fix:** Don't put the raw key in the log description — log the license ID or last 4 characters only. Additionally, either restrict the `audit_logs` SELECT policy to admins, or add an explicit role check in `audit/page.tsx`.

---

## 🟠 High

### 3. Possible PostgREST filter injection in `license-auth.ts`
**File:** `src/utils/license-auth.ts`
```ts
.or(`cdkey.eq.${cdkey},cdkey_hash.eq.${cdkeyHash}`)
```
`cdkey` comes directly from the client-supplied `x-license-key` header and is string-interpolated into a raw `.or()` filter. Supabase's `.or()` parses that string for its own operator syntax (commas, dots, parens carry meaning). A crafted header value could inject extra filter clauses rather than just being searched for literally.

**Fix:** Drop the raw `cdkey` branch entirely — `cdkey_hash` is a deterministic SHA-256 hex digest, so query by hash only (`.eq('cdkey_hash', cdkeyHash)`), no `.or()` needed.

### 4. Mass assignment on `POST /api/stock/assets`
**File:** `src/app/api/stock/assets/route.ts`
```ts
.insert({ ...body, workspace_id: userData.workspace_id, system_name, created_by: user.id })
```
Any authenticated member can pass arbitrary extra columns through `body` (e.g. `status: 'consumed'`, bogus `width`/`height`). Only `workspace_id`, `system_name`, and `created_by` get overridden after the spread — everything else from the client request body passes straight to the insert.

**Fix:** Add a Zod schema whitelisting exactly which fields are accepted from the client, same pattern already used in `actions.ts` and the license/trial routes.

---

## 🟡 Medium

### 5. Open redirect via `x-forwarded-host` in the auth callback
**File:** `src/app/auth/callback/route.ts`
```ts
const forwardedHost = request.headers.get('x-forwarded-host')
...
if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${path}`)
```
This header is trusted unconditionally to build the post-auth redirect. Depending on what sits in front of the app, this could send a freshly authenticated user off to an attacker-controlled domain right after login/invite acceptance — high-trust moment for a phishing redirect.

**Fix:** Validate `forwardedHost` against a known allowlist (e.g. compare to the host in `NEXT_PUBLIC_SITE_URL`) before using it.

### 6. Non-constant-time secret comparison on `/api/provision`
**File:** `src/app/api/provision/route.ts`
```ts
if (!PROVISIONING_SECRET || secret !== PROVISIONING_SECRET) { ... }
```
Timing-attack-able in principle. Low real-world risk given the 5/min rate limit and presumed high entropy, but this endpoint creates workspaces and invites admin users — worth the one-line fix.

**Fix:** `crypto.timingSafeEqual` instead of `!==`.

### 7. Dead/misleading grant: `GRANT UPDATE (role) ON public.users TO authenticated`
**File:** `schema.sql`

This grant exists but `public.users` has no matching RLS `UPDATE` policy — only two `SELECT` policies. With RLS enabled and no policy for a command, that command is a no-op regardless of the grant. `changeUserRole()` in `actions.ts` goes through the admin client with its own manual authz check anyway (which is correct), so this grant does nothing functional today — it's leftover config that could create false confidence there's a client-writable path here if someone revisits this later.

**Fix:** Remove the grant, or add the corresponding RLS policy if a direct-update path is ever intended.

---

## 🟢 Low / Nice-to-haves

- **CSP allows `'unsafe-inline' 'unsafe-eval'`** on `script-src` (`next.config.ts`), which significantly weakens what CSP protects against for XSS. A nonce-based CSP would be stronger if you want to invest the time.
- **No `Strict-Transport-Security` header** set in `next.config.ts` — cheap addition.
- **Repeated auth+workspace-lookup boilerplate** across `stock/assets`, `stock/locations`, `stock/materials` GET handlers — not a bug, but worth extracting into a shared `getAuthedWorkspace()` helper before a 5th copy-paste introduces a real bug.
- **`/api/v1/trials/status` has no rate limit**, unlike `/api/v1/trials/run`. Read-only, low stakes, but allows unlimited polling of trial state per machine_id.

---

## What's solid (worth naming, not just flagging problems)

- MFA (`aal2`) required for all admin actions via `ensureAdminWithMFA`.
- Consistent workspace scoping: RLS *and* explicit `.eq('workspace_id', ...)` checks at the app layer — real defense in depth.
- "Cannot remove/demote the last admin" guards in `removeUser` and `changeUserRole`.
- Abuse-score / IP-shift detection on license binding with auto-flagging at threshold.
- The offline lease-token model for KerfCut verification is a sound design — it just needs its secret handled correctly (#1).
- Rate limiting is deliberately asymmetric (fail-open for license verification vs. fail-closed for trials) — a real, considered trade-off rather than a one-size-fits-all default.

---

*Companion review to `GPT_audit.md` and `gemini_pro_audit.md` — cross-check before fixing in case of overlap.*

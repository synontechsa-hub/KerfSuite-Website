# KerfSuite Website — Senior Engineering Review Export

**Review date:** 30 July 2026  
**Scope:** KerfSuite website, Portal, APIs, authentication, licensing, Supabase database, KerfStock/KerfCut web integration, deployment and market readiness  
**Review mode:** Read-only analysis. No application code, migrations, production data or configuration was changed.

## Executive Summary

KerfSuite has a credible product and engineering foundation. The optimiser, inventory workflow, workspace isolation and transactional Stock integration are real implementations rather than prototypes.

The system is suitable for a controlled beta with known testers. It is not ready for an unrestricted paid public launch because the commercial entitlement system, public release boundary, privacy controls, licensing protection, backup process and scale behaviour are incomplete.

### Readiness assessment

| Area | Assessment |
|---|---|
| KerfCut core logic | Strong beta quality |
| KerfStock functionality | Promising early beta |
| Website and Portal | Functional, but requires commercial and privacy hardening |
| Authentication | Generally well structured |
| Database design | Strong foundation with operational gaps |
| Security | Not sufficient for a paid public launch yet |
| Stability | Good development builds; public release path is unreliable |
| Scaling | Suitable for early testers, not yet for large inventories or many workshops |
| Commercial readiness | Billing and entitlements are not implemented end to end |
| Technical debt | Moderate to high, but repairable without a rewrite |

## Work Completed

The following were inspected:

- Website repository structure and Git state
- Public marketing site and downloads page
- Authenticated Portal as a normal workspace member
- Authentication, MFA, invitations and workspace isolation
- Licence generation, hashing, activation, machine binding and leases
- KerfStock API authentication and realtime behaviour
- KerfCut quantity-aware Stock import and commit integration
- Supabase tables, constraints, RLS policies, functions, grants and migrations
- Database backup tooling
- Public GitHub release metadata and installer availability
- Windows installer signatures
- Dependency advisories and package currency
- Automated tests, coverage, lint and production builds
- Release/version consistency across development, release and live environments

All repositories were clean after the review.

## Verification Results

### KerfSuite Website

- 117 tests passed.
- ESLint passed.
- The Next.js production build passed.
- Actual coverage is approximately:
  - Statements: 9.7%
  - Branches: 12.25%
  - Functions: 13.76%
  - Lines: 9.4%
- The Jest configuration requires 80% coverage, but the normal `npm test` script explicitly disables coverage. The configured gate is therefore hidden during ordinary testing.
- No browser-level end-to-end suite was found.
- The current website repository has no CI workflow.

### KerfCut 1.1 Development

- 73 of 73 tests passed.
- Overall coverage: 52%.
- Optimiser coverage: 95%.
- Model coverage: 97%.
- Persistence coverage: 87%.
- Stock API coverage: 73%.
- Authentication coverage: 29%.
- PDF export coverage: 0%.
- Main window coverage: 49%.

The core optimiser and data model are the strongest parts of the system. Licensing, PDF export and complete UI lifecycle behaviour need more testing.

### KerfStock 1.0.1

- Flutter static analysis completed with no issues.
- 14 of 14 tests passed.
- Tests currently focus on models, payload construction, URL handling and a login smoke test.
- Licence storage, Supabase integration, realtime recovery, permissions, concurrent edits, installer upgrades and complete UI workflows are not adequately covered.

### Dependency review

- The website has three high-severity production advisory entries involving the Next.js dependency chain, PostCSS and Sharp/libvips.
- KerfStock has 19 packages that can be upgraded within the current dependency resolution.
- KerfCut uses broad `>=` Python dependency requirements without a reproducible lockfile or package hashes.

## Critical Launch Blockers

### 1. Public KerfCut uses an obsolete licence URL

The published KerfCut 1.0.1 source defaults to:

```text
https://synontech.vercel.app/kerfsuite/api/v1
```

That endpoint returned HTTP 404 during the review.

The working KerfCut 1.1 development build uses:

```text
https://kerfsuite.vercel.app/api/v1
```

The public GitHub release predates the KerfStock integration. The integration tested locally is therefore not present in the product customers currently download.

### 2. KerfCut contains a trivial licence bypass

The release and development sources contain:

- `KERFCUT_DEV_LICENSE`
- `KERFCUT_FORCE_TRIAL`
- The hard-coded development key `KERFCUT-DEV-99`

A user can enable the bypass using an environment variable. Desktop DRM can never be impossible to crack, but a production build should not retain a documented configuration bypass.

### 3. Payment and provisioning are not connected

The KerfCut purchase form submits directly to PayPal using browser-controlled hidden fields, including the price.

No verified PayPal webhook/IPN pipeline was found that:

- Confirms the payment server-side
- Records the transaction
- Creates an entitlement
- Applies the correct plan and seat allowance
- Handles refunds, disputes or cancellations
- Renews or expires the licence

A customer can currently pay without receiving automatic entitlement provisioning.

### 4. Annual plans are not represented in the data model

The database supports workspace application access and licence slots, but does not store:

- Plan/tier
- Payment provider customer or transaction IDs
- Subscription status
- Purchase date
- Renewal date
- Expiration date
- Seat allowance
- Machine allowance
- Refund or cancellation state

An entitled administrator can generate unlimited keys. Active licences do not expire after the advertised year.

### 5. Canonical migration history is incomplete

KerfStock queries the `users.permissions` column.

The current Website migration directory does not add that column. The missing permissions migration exists only in:

```text
_Development/KerfPortal/KerfPortal_v1.0.2/
```

This indicates schema/repository drift. A clean environment cannot be recreated confidently from the canonical Website repository alone.

### 6. Portal code has divergent sources of truth

The live Website repository and the older versioned Portal development directory have substantially diverged.

Examples:

- Sentry PII scrubbing exists only in the older Portal development copy.
- Granular Stock permissions and their migration exist only in that copy.
- The current Website repository contains the newer KerfCut/Stock integration.

Future copying or merging risks losing security fixes or database changes.

## Security Assessment

### Strong controls

- RLS is enabled on tenant-owned tables.
- Cross-workspace composite foreign keys protect relational isolation.
- SQL constraints enforce dimensions, statuses, roles and supported applications.
- Sensitive `SECURITY DEFINER` functions use an empty search path.
- Dangerous function permissions are explicitly revoked from `PUBLIC`, `anon` and `authenticated`.
- Service-only licence and KerfCut commit functions are granted only to `service_role`.
- New licence keys are hash-only and are displayed once.
- Invitation tokens are hashed, locked, email-bound and time-limited.
- MFA protects licence generation and important administrative actions.
- KerfStock requires a Supabase user session and a valid KerfStock licence.
- KerfCut Stock commits use row locking, transactions and an idempotency ledger.
- API payloads are generally validated with Zod.

### Security gaps

#### Member privacy and RBAC

A normal member can currently view:

- Audit history
- Other users' email addresses
- Machine identifiers and labels
- Operating-system information
- Last-known IP addresses
- Revoked licence records

Workshop Setup rejects a member server-side, but the sidebar still shows the link. Account settings also display controls that members cannot use.

#### Permanent KerfCut API credential

KerfCut uses the permanent licence key and machine identifier as its Stock API credential. It does not require an employee login for Stock access.

If the key and machine ID are copied from a licensed machine, they can be replayed to read or modify the associated workspace inventory.

A safer long-term design is an exchange of the licence credential for a short-lived, scoped server token.

#### KerfStock session persistence

KerfStock stores the licence key with secure storage. Supabase is initialised with its default Flutter session persistence, which uses shared preferences on desktop unless a custom storage implementation is supplied.

The authentication refresh token therefore does not receive the same protection as the licence key.

#### Sentry and privacy

The live client configuration has:

- `tracesSampleRate: 1`
- Logging enabled
- `sendDefaultPii: true`

No customer-facing privacy policy, telemetry disclosure or consent mechanism was found.

#### Installer trust

All inspected KerfCut and KerfStock installers returned `NotSigned` from Windows Authenticode verification.

Unsigned installers:

- Trigger SmartScreen/reputation warnings
- Reduce customer confidence
- Do not provide strong publisher identity
- Make malicious replacement harder for users to identify

#### Supply-chain controls

- Python production dependencies are not locked or hash-pinned.
- The website has unresolved high-severity advisory entries.
- No comprehensive dependency, SAST, DAST or secret-scanning pipeline protects all authoritative repositories.

## Database Review

### What is solid

- Tenant isolation is designed around `workspace_id`.
- RLS policies consistently restrict authenticated users to their workspace.
- Cross-workspace material, location, source-asset and event relationships are rejected by composite foreign keys.
- Asset types and statuses use enums.
- Asset quantities and dimensions have SQL constraints.
- Per-workspace asset counters are concurrency safe.
- The last workspace administrator is protected.
- Invitation claims use row locking.
- KerfCut consumption checks allocation, availability and quantity.
- KerfCut commits are atomic and idempotent.
- Retired assets remain for historical traceability.

### Data reliability and concurrency risks

#### Unpaginated inventory

The website and KerfStock fetch all assets without pagination.

Supabase projects normally limit a response to 1,000 rows. Larger inventories can therefore return an incomplete view unless the project limit was manually changed. Increasing the server limit alone would create unnecessarily large responses; explicit pagination is required.

#### Missing query indexes

Important queries filter and sort using:

- `workspace_id`
- `status`
- `is_deleted`
- `created_at`
- `location_id`
- `parent_id`

The migration sequence defines few supporting composite indexes. Query performance will degrade as assets, events, licences and audit logs grow.

#### Realtime refresh amplification

Every asset change causes each connected KerfStock client to reload the entire inventory.

For a workshop with 15 connected workers, one change may trigger 15 complete inventory downloads. Realtime events should update a specific row or trigger a paginated/delta refresh.

#### Lost updates

Manual inventory updates are last-write-wins. There is no revision/version value or expected previous quantity.

If two workers edit the same batch, the second update can silently overwrite the first.

#### Location-retirement race

Location retirement:

1. Counts active stock and child locations.
2. Performs a separate update marking the location deleted.

A concurrent stock placement can occur between the check and update. This workflow should be moved into one locked database transaction.

### Backup and recovery

The repository backup script is not a complete disaster-recovery solution.

It omits:

- `asset_counters`
- `workspace_invites`
- `kerfcut_stock_commits`

It also:

- Copies the obsolete root `schema.sql`
- Does not take a transactionally consistent snapshot
- Has no restore script
- Has no automated restore test
- Cannot independently restore Supabase Auth password hashes from the exported Auth metadata

Managed Supabase backups may provide additional protection depending on the active plan, but that configuration and a successful restore drill were not verifiable from the repository.

## Application Stability

### KerfCut

The optimiser and persistence formats are well tested. Important remaining risks:

- Job files are written directly over the destination file.
- A crash, full disk or power loss during `json.dump()` may corrupt the existing file.
- No atomic temporary-file replacement is used.
- No autosave or recovery file exists.
- Authentication and PDF export have insufficient automated coverage.
- No automated update mechanism exists.

### KerfStock

The main tested workflows function, but production stability is not demonstrated for:

- Realtime disconnect/reconnect
- Offline operation
- Session expiry and refresh failures
- Licence expiry/revocation while the app is open
- Concurrent receivers
- Upgrade installs
- Large inventories
- Permission combinations

KerfStock is currently dependent on a usable network connection. It does not provide offline receiving with later synchronisation.

### Website

The production build is healthy and live routes load. Remaining stability issues include:

- Data getters that discard Supabase errors and return empty arrays
- Raw internal error messages returned by some API routes
- No end-to-end browser/API/database tests
- No current Website CI workflow
- No automated production smoke test

## Scale Assessment

### Suitable now

- A controlled beta
- One or a few workshops
- Approximately 15 users per workshop
- Hundreds of asset batches
- Moderate daily stock changes

### Requires hardening

- Thousands of inventory batches
- Many simultaneous receivers
- Dozens of workshops
- High-frequency stock updates
- Large audit/event histories

### Not yet designed for

- Hundreds or thousands of workshops
- Millions of inventory and event rows
- Enterprise availability requirements
- Formal disaster-recovery guarantees

The managed Vercel, Supabase and Upstash infrastructure can scale. The current unpaginated queries, missing indexes and full-refresh realtime strategy are the immediate bottlenecks.

## Product and Market Gaps

### Website

- KerfStock is still described as under development and `v0.8.2`.
- The actual KerfStock release source is `1.0.1-beta.3`.
- The Portal links to an unsupported/incorrect KerfStock mobile destination.
- KerfCut/Stock integration claims are ahead of the public KerfCut installer.
- No privacy policy, terms, refund policy or support page is provided.
- Product versions and download URLs are hard-coded across multiple files.
- Coming-soon buttons remain focusable dead controls.
- The paid purchase process is not trustworthy.

### KerfStock

Features that would improve market viability:

- Barcode/QR scanner workflow
- Offline receiving and queued sync
- CSV import/export
- Bulk delivery entry
- Explicit stock-adjustment events
- Material editing and retirement
- Supplier, cost, grade, finish, lot and purchase-order data
- Optimistic concurrency controls
- Granular employee permissions
- Reports and low-stock alerts

### KerfCut

Features and operational improvements:

- Atomic save and crash recovery
- Signed installer
- Automatic update/check mechanism
- Customer documentation and onboarding
- Privacy-conscious crash reporting
- Performance benchmarks for large production jobs
- Release-only licensing build configuration

## Technical Debt

The most significant debt is process and release debt rather than optimiser code quality:

- Full application copies for each version
- Divergent Portal codebases
- Manual development-to-release copying
- Missing canonical migrations
- Hard-coded URLs and versions
- No automated authoritative release pipeline
- No signed artifacts
- No complete restore procedure
- Inconsistent product, pricing and legal language
- Sparse integration coverage

The separate development and release repositories are workable, but only if one canonical source is identified and the release copy is produced automatically and verified.

## Recommended Repair Order

### Phase 1 — Establish one source of truth

1. Select the current Website repository as the canonical Portal/API/database source.
2. Reconcile the missing permissions migration and Sentry scrubber from the older Portal copy.
3. Verify that a clean database can be created entirely from canonical migrations.
4. Record the applied migration versions in production.
5. Stop manually merging divergent Portal folders.

### Phase 2 — Repair licensing and the public release

1. Remove development licence/trial bypasses from release builds.
2. Publish KerfCut 1.1 using the correct API endpoint.
3. Include and regression-test the KerfStock integration.
4. Replace permanent integration credentials with short-lived scoped tokens.
5. Secure KerfStock's Supabase session storage.
6. Sign both installers.

### Phase 3 — Implement commercial entitlements

1. Create plan, subscription, payment and entitlement records.
2. Enforce seat and machine allowances server-side.
3. Add renewal/expiration behaviour.
4. Integrate a verified payment webhook.
5. Make provisioning idempotent.
6. Handle refunds, disputes and cancellations.
7. Disable the existing direct PayPal form until this exists.

### Phase 4 — Privacy and Portal RBAC

1. Restrict audit logs and machine telemetry to authorised roles.
2. Remove IP/OS information from ordinary member views.
3. Hide admin-only navigation and forms from members.
4. Complete and enforce granular Stock permissions server-side.
5. Reduce Sentry sampling and disable default PII.
6. Add privacy, terms, refund and support pages.

### Phase 5 — Data reliability and scale

1. Add server-side inventory pagination.
2. Add workspace/status/date/location indexes.
3. Replace complete realtime reloads with delta updates.
4. Add optimistic concurrency for inventory edits.
5. Make location retirement transactional.
6. Add retention/archival strategies for events and audit logs.

### Phase 6 — Quality and operations

1. Add CI to the Website, KerfCut and release repositories.
2. Add disposable-database migration and RLS tests.
3. Add end-to-end tests for login, licence activation, Stock CRUD and KerfCut commit.
4. Restore honest coverage gates.
5. Add atomic KerfCut saves and recovery.
6. Implement complete backup and restore tooling.
7. Perform and document a restore drill.
8. Add production smoke checks and release rollback instructions.

## Final Recommendation

KerfSuite should continue into a controlled beta. The products are useful enough to attract early adopters, especially because the KerfCut-to-KerfStock workflow differentiates the suite.

The next engineering phase should prioritise:

1. Canonical source and migrations
2. Public release correctness
3. Licensing and payment integrity
4. Privacy and role enforcement
5. Backup/restore reliability
6. Pagination, concurrency and operational testing

This is a launch-hardening project, not a rewrite. The underlying product is worth taking forward, but additional feature development should temporarily take second place to release engineering and security.

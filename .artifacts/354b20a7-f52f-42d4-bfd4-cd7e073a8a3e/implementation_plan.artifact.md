# Implementation Plan - Professionalism & Safety Sweep

This plan addresses technical debt, hydration bugs, and design inconsistencies identified during the safety audit. The goal is to bring the codebase up to professional production standards.

## User Review Required

> [!WARNING]
> **Breaking Test Changes:** I will be refactoring the BDD tests to use actual mocks. This ensures they verify the *implementation* (service calls) rather than just the *logic* (simulations).

## Proposed Changes

### 1. Hydration & Rendering Fixes
Fix "impure" rendering and hydration mismatches to ensure a stable UI.

#### [MODIFY] [FormattedDate.tsx](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/components/FormattedDate.tsx)
- Add a `mounted` state to ensure the date only renders on the client. This prevents the "Hydration failed" error in Next.js.

#### [MODIFY] [LicenseRoster.tsx](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/components/LicenseRoster.tsx)
- Refactor the "isLive" logic to calculate the status inside an effect or a safe component, avoiding `Date.now()` during the render phase.

---

### 2. Interaction Logic Cleanup
Simplify the event model for better performance and clarity.

#### [MODIFY] [RevokeButton.tsx](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/components/RevokeButton.tsx)
- Remove the redundant `<form>` wrapper. Since we now use a custom modal for confirmation, a direct button click handler is cleaner and more reliable.

---

### 3. Linting & Type Safety
Eliminate "code rot" and improve developer experience by fixing the 30+ linting errors.

#### [MODIFY] [portal.ts](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/models/portal.ts)
- Define proper `DbRow` interfaces for each database table to replace `any` in the mapping functions.

#### [MODIFY] [jest.config.js](file:///D:/Coding/Synontech/Websites/Kerf_Suite/jest.config.js)
- Fix the `require()` warnings by using standard imports or specifically disabling the lint rule for the config file.

#### [MODIFY] [AddAssetModal.tsx](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/portal/inventory/AddAssetModal.tsx)
- Replace `any[]` with `Material[]` and `Location[]` for strict prop-type checking.

---

### 4. BDD Strength Integration
Make the feature tests "meaningful" by verifying actual data access.

#### [MODIFY] [inventory.steps.test.ts](file:///D:/Coding/Synontech/Websites/Kerf_Suite/tests/features/steps/inventory.steps.test.ts)
- Use `createMockSupabase` to verify that `PortalService.createAsset` is called with the correct parameters during the "When the admin adds a sheet" step.

## Verification Plan

### Automated Tests
- `npm run lint`: Confirm **0 errors**.
- `npm test -- --coverage`: Confirm **100% test pass rate** and verified coverage.

### Manual Verification
- **Interaction Check:** Verify that clicking "Revoke" on a license still triggers the industrial modal and correctly revokes the key.
- **Console Check:** Verify that navigating the dashboard no longer logs "Hydration mismatch" errors in the browser console.

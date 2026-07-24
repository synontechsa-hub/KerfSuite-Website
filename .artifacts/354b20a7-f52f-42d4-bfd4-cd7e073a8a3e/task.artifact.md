# Professionalism & Safety Sweep Task List

- `[/]` Hydration & Rendering Fixes
    - `[ ]` Fix `FormattedDate.tsx` setState in effect
    - `[ ]` Fix `LicenseRoster.tsx` impure Date.now() in render
- `[/]` Interaction Logic Cleanup
    - `[ ]` Remove redundant form from `RevokeButton.tsx`
- `[/]` Linting & Type Safety
    - `[ ]` Define strict DB row interfaces in `portal.ts`
    - `[ ]` Disable lint rule inline for `jest.config.js`
    - `[ ]` Fix `any[]` types in `AddAssetModal.tsx`
- `[ ]` BDD Strength Integration
    - `[ ]` Refactor `inventory.steps.test.ts` to use real service mocks
- `[ ]` Final Verification
    - `[ ]` Run `npm run lint`
    - `[ ]` Run `npm test -- --coverage`

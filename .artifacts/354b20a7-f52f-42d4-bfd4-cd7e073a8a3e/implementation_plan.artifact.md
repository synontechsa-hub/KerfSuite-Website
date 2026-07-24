# Implementation Plan - Industrial Optimization & UI Testing

This plan focuses on high-level performance optimization (Next.js Image), hardening the infrastructure, and introducing UI component testing to ensure a professional, stable production environment.

## User Review Required

> [!TIP]
> **Performance Optimization:** Switching to `next/image` will improve page load speeds and SEO by automatically serving optimized image formats and sizes. I will need to determine fixed dimensions or layout strategies for existing marketing images.

## Proposed Changes

### 1. Performance & Linting (Next.js Image Migration)
Standardize image delivery and resolve remaining build warnings.

#### [MODIFY] Marketing Components
- **[page.tsx](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/(marketing)/page.tsx):** Replace all `<img>` tags with `<Image />`.
- **[CtaSlideshow.tsx](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/(marketing)/components/CtaSlideshow.tsx):** Migrate background frames and slide images to `<Image />`.
- **[downloads/page.tsx](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/(marketing)/downloads/page.tsx):** Update technical documentation images.

#### [MODIFY] API & Cleanup
- Resolve "unused variable" warnings in `src/app/api/stock/kerfcut/commit/route.ts` and other reported files.

### 2. Infrastructure & Auth Hardening
Remove remaining `any` types and improve error resilience.

#### [MODIFY] [proxy.ts](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/proxy.ts)
- Replace `any` in catch blocks with `unknown` and proper type checks.
- Enhance rate-limiting logs to include masked IPs for debugging without PII exposure.

### 3. UI Component Testing
Establish a quality baseline for the frontend.

#### [NEW] `tests/components/IndustrialModal.test.tsx`
- Test suite to verify the custom modal lifecycle (open, close, confirm callbacks).

#### [NEW] `tests/components/FormattedDate.test.tsx`
- Test suite to verify hydration safety and locale rendering.

### 4. Advanced Audit Filtering
Enhance the portal's diagnostic capabilities.

#### [MODIFY] [portal/audit/page.tsx](file:///D:/Coding/Synontech/Websites/Kerf_Suite/src/app/portal/audit/page.tsx)
- Implement a filter UI to categorize logs by "System", "License", "Security", and "User" events.

## Verification Plan

### Automated Tests
- `npm run lint`: Target **0 warnings**.
- `npm test`: Run unified logic and UI test suite.
- `npm run build`: Final production build verification.

### Manual Verification
- **Lighthouse Check:** Confirm "Image" warnings are gone and LCP (Largest Contentful Paint) is improved.
- **Audit Stress Test:** Verify filters work correctly with large log datasets.

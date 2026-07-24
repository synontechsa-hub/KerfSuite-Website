/**
 * Shared trial configuration and tier logic.
 * Kept in one place so the /api/v1/trials/status and /run endpoints agree.
 */

export const TRIAL_MAX_DAYS = 14
export const TRIAL_MAX_RUNS = 20

export type TrialTier = 'trial' | 'free'

/** Remaining trial runs, clamped at zero. */
export function runsLeft(runsCount: number): number {
  return Math.max(0, TRIAL_MAX_RUNS - runsCount)
}

/** Remaining trial days given the number of elapsed days, clamped at zero. */
export function daysLeft(elapsedDays: number): number {
  return Math.max(0, TRIAL_MAX_DAYS - elapsedDays)
}

/** Whole days elapsed between `startedAt` and `now`. */
export function elapsedDays(startedAt: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24))
}

/** A machine is on the `trial` tier while both runs and days remain. */
export function computeTrialTier(runsRemaining: number, daysRemaining: number): TrialTier {
  return runsRemaining > 0 && daysRemaining > 0 ? 'trial' : 'free'
}

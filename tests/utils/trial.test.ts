import {
  TRIAL_MAX_DAYS,
  TRIAL_MAX_RUNS,
  computeTrialTier,
  daysLeft,
  elapsedDays,
  runsLeft,
} from '@/utils/trial'

describe('trial utils', () => {
  test('runsLeft clamps at zero and counts down', () => {
    expect(runsLeft(0)).toBe(TRIAL_MAX_RUNS)
    expect(runsLeft(5)).toBe(TRIAL_MAX_RUNS - 5)
    expect(runsLeft(TRIAL_MAX_RUNS + 3)).toBe(0)
  })

  test('daysLeft clamps at zero and counts down', () => {
    expect(daysLeft(0)).toBe(TRIAL_MAX_DAYS)
    expect(daysLeft(TRIAL_MAX_DAYS)).toBe(0)
    expect(daysLeft(TRIAL_MAX_DAYS + 10)).toBe(0)
  })

  test('elapsedDays returns whole days between two dates', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const now = new Date('2026-01-04T12:00:00Z')
    expect(elapsedDays(start, now)).toBe(3)
  })

  test('computeTrialTier is trial only while runs AND days remain', () => {
    expect(computeTrialTier(5, 5)).toBe('trial')
    expect(computeTrialTier(0, 5)).toBe('free')
    expect(computeTrialTier(5, 0)).toBe('free')
    expect(computeTrialTier(0, 0)).toBe('free')
  })
})

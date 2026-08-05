import {
  DeviceAuthorizationConfigurationError,
  createDeviceAuthorizationCodes,
  hashAuthorizationCode,
  normalizeUserCode,
  readDeviceAuthorizationConfiguration
} from '@/utils/entitlements/device-authorization'

describe('device authorization codes', () => {
  const configuration = { codePepper: 'x'.repeat(32) }

  it('requires a sufficiently long server-side pepper', () => {
    expect(() => readDeviceAuthorizationConfiguration({})).toThrow(DeviceAuthorizationConfigurationError)
    expect(() => readDeviceAuthorizationConfiguration({ DEVICE_AUTH_CODE_PEPPER: 'short' })).toThrow(DeviceAuthorizationConfigurationError)
  })

  it('normalizes a typed code and never uses a plain-code database value', () => {
    expect(normalizeUserCode('abcd-ef12 3456')).toBe('ABCDEF123456')
    expect(hashAuthorizationCode('ABCDEF123456', configuration)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('creates a high-entropy desktop secret and a human-enterable code', () => {
    const codes = createDeviceAuthorizationCodes()
    expect(codes.deviceCode).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(codes.userCode).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/)
    expect(codes.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })
})

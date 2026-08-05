import { createHmac, randomBytes } from 'crypto'

const CODE_TTL_SECONDS = 10 * 60

export type DeviceAuthorizationConfiguration = { codePepper: string }

export class DeviceAuthorizationConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeviceAuthorizationConfigurationError'
  }
}

export function readDeviceAuthorizationConfiguration(
  environment: Record<string, string | undefined> = process.env
): DeviceAuthorizationConfiguration {
  const codePepper = environment.DEVICE_AUTH_CODE_PEPPER
  if (!codePepper || codePepper.length < 32) {
    throw new DeviceAuthorizationConfigurationError('Device authorization is not configured')
  }
  return { codePepper }
}

export function normalizeUserCode(value: string): string {
  return value.replace(/[-\s]/g, '').toUpperCase()
}

export function hashAuthorizationCode(value: string, configuration: DeviceAuthorizationConfiguration): string {
  return createHmac('sha256', configuration.codePepper).update(value).digest('hex')
}

export function createDeviceAuthorizationCodes() {
  const deviceCode = randomBytes(32).toString('base64url')
  const compactUserCode = randomBytes(8).toString('hex').toUpperCase()
  const userCode = compactUserCode.match(/.{1,4}/g)!.join('-')
  return { deviceCode, userCode, expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000) }
}

import { createPrivateKey, randomUUID, sign, type KeyObject } from 'crypto'

export type KerfEntitlementApp = 'kerfcut' | 'kerfstock'

export type KerfEntitlementLeaseClaims = {
  lease_version: '1'
  iss: 'kerfportal'
  aud: KerfEntitlementApp
  sub: string
  workspace_id: string
  machine_id: string
  tier: 'licensed'
  features: string[]
  limits: Record<string, string | number | boolean | null>
  iat: number
  nbf: number
  exp: number
  jti: string
  kid: string
}

export type KerfEntitlementSigningConfiguration = {
  privateKeyPem: string
  keyId: string
  durationHours: number
}

export type KerfEntitlementLeaseInput = {
  app: KerfEntitlementApp
  licenseSlotId: string
  workspaceId: string
  machineId: string
  features?: string[]
  limits?: Record<string, string | number | boolean | null>
  now?: number
}

export type IssuedKerfEntitlementLease = {
  token: string
  claims: KerfEntitlementLeaseClaims
}

const KEY_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/
const MIN_LEASE_HOURS = 1
const MAX_LEASE_HOURS = 24 * 30
const DEFAULT_LEASE_HOURS = 24 * 7

export class KerfEntitlementSigningConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KerfEntitlementSigningConfigurationError'
  }
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function getEd25519PrivateKey(privateKeyPem: string): KeyObject {
  let privateKey: KeyObject

  try {
    privateKey = createPrivateKey(privateKeyPem.replace(/\\n/g, '\n'))
  } catch {
    throw new KerfEntitlementSigningConfigurationError('KEL signing key is invalid')
  }

  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new KerfEntitlementSigningConfigurationError('KEL signing key must be an Ed25519 private key')
  }

  return privateKey
}

export function readKerfEntitlementSigningConfiguration(
  environment: NodeJS.ProcessEnv = process.env
): KerfEntitlementSigningConfiguration {
  const privateKeyPem = environment.KEL_SIGNING_PRIVATE_KEY_PEM
  const keyId = environment.KEL_SIGNING_KEY_ID
  const rawDuration = environment.KEL_DURATION_HOURS

  if (!privateKeyPem || !keyId) {
    throw new KerfEntitlementSigningConfigurationError('KEL signing is not configured')
  }

  if (!KEY_ID_PATTERN.test(keyId)) {
    throw new KerfEntitlementSigningConfigurationError('KEL signing key ID is invalid')
  }

  const durationHours = rawDuration ? Number(rawDuration) : DEFAULT_LEASE_HOURS
  if (!Number.isInteger(durationHours) || durationHours < MIN_LEASE_HOURS || durationHours > MAX_LEASE_HOURS) {
    throw new KerfEntitlementSigningConfigurationError('KEL duration must be a whole number between 1 and 720 hours')
  }

  getEd25519PrivateKey(privateKeyPem)

  return { privateKeyPem, keyId, durationHours }
}

export function issueKerfEntitlementLease(
  input: KerfEntitlementLeaseInput,
  configuration: KerfEntitlementSigningConfiguration
): IssuedKerfEntitlementLease {
  const privateKey = getEd25519PrivateKey(configuration.privateKeyPem)
  const now = input.now ?? Math.floor(Date.now() / 1000)
  const expiresAt = now + configuration.durationHours * 60 * 60

  const claims: KerfEntitlementLeaseClaims = {
    lease_version: '1',
    iss: 'kerfportal',
    aud: input.app,
    sub: input.licenseSlotId,
    workspace_id: input.workspaceId,
    machine_id: input.machineId,
    tier: 'licensed',
    features: input.features ?? [],
    limits: input.limits ?? {},
    iat: now,
    nbf: now,
    exp: expiresAt,
    jti: randomUUID(),
    kid: configuration.keyId
  }

  const protectedHeader = {
    alg: 'EdDSA',
    kid: configuration.keyId,
    typ: 'JWT'
  }

  const signingInput = encodeJson(protectedHeader) + '.' + encodeJson(claims)
  const signature = sign(null, Buffer.from(signingInput), privateKey).toString('base64url')

  return {
    token: signingInput + '.' + signature,
    claims
  }
}
/**
 * @jest-environment node
 */

import { createPublicKey, generateKeyPairSync, verify } from 'crypto'
import {
  KerfEntitlementSigningConfigurationError,
  issueKerfEntitlementLease,
  readKerfEntitlementSigningConfiguration
} from '@/utils/entitlements/kel'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' }).toString()

const configuration = {
  privateKeyPem,
  keyId: 'test-kel-2026-01',
  durationHours: 168
}

describe('Kerf Entitlement Lease issuer', () => {
  it('issues a compact EdDSA JWS that verifies against the matching public key', () => {
    const issued = issueKerfEntitlementLease(
      {
        app: 'kerfcut',
        licenseSlotId: 'slot-1234567890',
        workspaceId: 'workspace-1234567890',
        machineId: 'install-1234567890',
        features: ['nest.unlimited'],
        limits: { 'nest.max_parts': null },
        now: 1_785_830_400
      },
      configuration
    )

    const [encodedHeader, encodedClaims, encodedSignature] = issued.token.split('.')
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'))
    const claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8'))
    const signature = Buffer.from(encodedSignature, 'base64url')

    expect(verify(null, Buffer.from(encodedHeader + '.' + encodedClaims), createPublicKey(publicKeyPem), signature)).toBe(true)
    expect(header).toEqual({ alg: 'EdDSA', kid: 'test-kel-2026-01', typ: 'JWT' })
    expect(claims).toMatchObject({
      lease_version: '1',
      iss: 'kerfportal',
      aud: 'kerfcut',
      sub: 'slot-1234567890',
      workspace_id: 'workspace-1234567890',
      machine_id: 'install-1234567890',
      exp: 1_786_435_200
    })
    expect(claims.jti).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('rejects absent or unsafe signing configuration', () => {
    expect(() => readKerfEntitlementSigningConfiguration({})).toThrow(KerfEntitlementSigningConfigurationError)
    expect(() => readKerfEntitlementSigningConfiguration({
      KEL_SIGNING_PRIVATE_KEY_PEM: privateKeyPem,
      KEL_SIGNING_KEY_ID: 'unsafe key id'
    })).toThrow(KerfEntitlementSigningConfigurationError)
    expect(() => readKerfEntitlementSigningConfiguration({
      KEL_SIGNING_PRIVATE_KEY_PEM: privateKeyPem,
      KEL_SIGNING_KEY_ID: 'test-kel-2026-01',
      KEL_DURATION_HOURS: '0'
    })).toThrow(KerfEntitlementSigningConfigurationError)
  })

  it('accepts escaped PEM configuration and defaults to a seven-day lease', () => {
    const configurationFromEnvironment = readKerfEntitlementSigningConfiguration({
      KEL_SIGNING_PRIVATE_KEY_PEM: privateKeyPem.replace(/\n/g, '\\n'),
      KEL_SIGNING_KEY_ID: 'test-kel-2026-01'
    })

    expect(configurationFromEnvironment.durationHours).toBe(168)
  })
})
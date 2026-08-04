/**
 * @jest-environment node
 */

import { createPublicKey, generateKeyPairSync, verify } from 'crypto'

const createAdminClient = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
  createAdminClient: () => createAdminClient()
}))

import { POST } from '@/app/api/v2/entitlements/lease/route'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' }).toString()
const originalEnvironment = {
  KEL_SIGNING_PRIVATE_KEY_PEM: process.env.KEL_SIGNING_PRIVATE_KEY_PEM,
  KEL_SIGNING_KEY_ID: process.env.KEL_SIGNING_KEY_ID,
  KEL_DURATION_HOURS: process.env.KEL_DURATION_HOURS
}

function request(body: unknown) {
  return new Request('https://portal.test/api/v2/entitlements/lease', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.1' },
    body: JSON.stringify(body)
  })
}

function licenseAdmin() {
  const slot = { id: 'slot-1234567890', workspace_id: 'workspace-1234567890', status: 'waiting' }
  const rpc = jest.fn((name: string) => {
    if (name === 'verify_license') return Promise.resolve({ data: [slot], error: null })
    if (name === 'bind_machine') return Promise.resolve({ error: null })
    throw new Error('Unexpected RPC')
  })
  return { rpc, from: jest.fn(() => ({ insert: jest.fn(() => Promise.resolve({ error: null })) })) }
}

beforeEach(() => {
  createAdminClient.mockReset()
  process.env.KEL_SIGNING_PRIVATE_KEY_PEM = privateKeyPem
  process.env.KEL_SIGNING_KEY_ID = 'test-kel-2026-01'
  process.env.KEL_DURATION_HOURS = '168'
})

afterAll(() => {
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

describe('POST /api/v2/entitlements/lease', () => {
  it('issues a verifiable lease without returning the activation key', async () => {
    const admin = licenseAdmin()
    createAdminClient.mockReturnValue(admin)

    const response = await POST(request({
      activation_key: 'test-activation-key',
      machine_id: 'install-1234567890',
      app: 'kerfcut'
    }))

    const body = await response.json()
    const [header, claims, signature] = body.lease.token.split('.')

    expect(response.status).toBe(200)
    expect(body.lease).toMatchObject({ format: 'compact-jws', alg: 'EdDSA', kid: 'test-kel-2026-01' })
    expect(JSON.stringify(body)).not.toContain('test-activation-key')
    expect(verify(null, Buffer.from(header + '.' + claims), createPublicKey(publicKeyPem), Buffer.from(signature, 'base64url'))).toBe(true)
    expect(admin.rpc).toHaveBeenNthCalledWith(1, 'verify_license', { p_cdkey: 'test-activation-key', p_app: 'kerfcut' })
  })

  it('fails closed before database access when signing is unavailable', async () => {
    delete process.env.KEL_SIGNING_PRIVATE_KEY_PEM

    const response = await POST(request({
      activation_key: 'test-activation-key',
      machine_id: 'install-1234567890',
      app: 'kerfcut'
    }))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Entitlement service unavailable' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })
})
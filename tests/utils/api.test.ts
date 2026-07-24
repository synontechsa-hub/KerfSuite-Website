import { z } from 'zod'
import { errorMessage, firstZodIssue, getClientIp, jsonError, validateBody } from '@/utils/api'

describe('errorMessage', () => {
  test('returns the message of an Error instance', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
  })

  test('returns the fallback for non-Error values', () => {
    expect(errorMessage('nope')).toBe('Internal Server Error')
    expect(errorMessage({ message: 'db' }, 'Custom fallback')).toBe('Custom fallback')
  })
})

describe('firstZodIssue', () => {
  test('returns the first validation issue message', () => {
    const schema = z.object({ email: z.string().email('Invalid email address') })
    const result = schema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(firstZodIssue(result.error)).toBe('Invalid email address')
    }
  })
})

describe('getClientIp', () => {
  test('takes the first forwarded IP', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    })
    expect(getClientIp(request)).toBe('203.0.113.9')
  })

  test('falls back to localhost when header is absent', () => {
    expect(getClientIp(new Request('https://example.com'))).toBe('127.0.0.1')
  })
})

describe('jsonError', () => {
  test('builds a JSON response with the given status and extra fields', async () => {
    const response = jsonError('nope', 403, { status: 'revoked' })
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'nope', status: 'revoked' })
  })
})

describe('validateBody', () => {
  const Schema = z.object({ machine_id: z.string().min(1, 'Missing machine_id') })

  test('returns parsed data on success', () => {
    const parsed = validateBody(Schema, { machine_id: 'abc' })
    expect(parsed).toEqual({ data: { machine_id: 'abc' } })
  })

  test('returns a 400 response on failure', async () => {
    const parsed = validateBody(Schema, { machine_id: '' })
    expect('error' in parsed).toBe(true)
    if ('error' in parsed) {
      expect(parsed.error.status).toBe(400)
      await expect(parsed.error.json()).resolves.toEqual({ error: 'Missing machine_id' })
    }
  })
})

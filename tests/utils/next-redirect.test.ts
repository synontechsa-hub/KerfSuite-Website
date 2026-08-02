import { isNextRedirectError } from '@/utils/next-redirect'

describe('isNextRedirectError', () => {
  test('accepts the structured redirect digest emitted by Next.js', () => {
    expect(
      isNextRedirectError({ digest: 'NEXT_REDIRECT;push;/portal;307;' })
    ).toBe(true)
  })

  test.each([
    [null],
    [new Error('ordinary failure')],
    [{ digest: 'NEXT_NOT_FOUND' }],
    [{ digest: 42 }],
  ])('rejects non-redirect errors', (error) => {
    expect(isNextRedirectError(error)).toBe(false)
  })
})

import { getSafeAuthRedirect } from '@/utils/auth-redirect'

describe('getSafeAuthRedirect', () => {
  it('allows known portal destinations', () => {
    expect(getSafeAuthRedirect('/portal', '/login')).toBe('/portal')
    expect(getSafeAuthRedirect('/portal/account', '/login')).toBe('/portal/account')
  })

  it('allows a correctly formed invitation destination', () => {
    const token = 'a'.repeat(43)
    expect(getSafeAuthRedirect(`/join?token=${token}`, '/portal')).toBe(
      `/join?token=${token}`,
    )
  })

  it.each([
    'https://attacker.example',
    '//attacker.example',
    '/portal/users',
    '/join?token=short',
    '/join?token=' + 'a'.repeat(43) + '&next=https://attacker.example',
  ])('rejects unapproved destination %s', (destination) => {
    expect(getSafeAuthRedirect(destination, '/portal')).toBe('/portal')
  })
})

import { resolveRelation } from '@/utils/supabase-relations'

describe('resolveRelation', () => {
  it('preserves a many-to-one relation returned as an object', () => {
    const material = { name: 'ACM', thickness: 4, unit: 'mm' }

    expect(resolveRelation(material)).toEqual(material)
  })

  it('uses the first relation when PostgREST returns an array', () => {
    const location = { name: 'Crate #11065' }

    expect(resolveRelation([location])).toEqual(location)
  })

  it('normalizes missing and empty relations to null', () => {
    expect(resolveRelation(null)).toBeNull()
    expect(resolveRelation(undefined)).toBeNull()
    expect(resolveRelation([])).toBeNull()
  })
})

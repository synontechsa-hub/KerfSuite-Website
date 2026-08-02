/**
 * Supabase can represent an embedded relation as either an object or an array,
 * depending on the relationship metadata available to PostgREST.
 */
export function resolveRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

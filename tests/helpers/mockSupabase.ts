/**
 * Lightweight mock of the Supabase query builder for unit tests.
 *
 * Every chainable method (`select`, `eq`, `order`, `limit`, `insert`,
 * `update`, `single`, `rpc`, ...) returns the same thenable builder, so an
 * arbitrary chain resolves to a single pre-configured `{ data, error, count }`
 * result. Each call to `from()` / `rpc()` consumes the next result from the
 * queue, allowing methods that issue several queries to be tested.
 */

export type QueryResult = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'in',
  'not',
  'gte',
  'lte',
  'order',
  'limit',
  'single',
  'maybeSingle',
  'match',
] as const;

function makeBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) {
    builder[method] = jest.fn(() => builder);
  }
  // Make the builder awaitable / thenable.
  builder.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

export function createMockSupabase(results: QueryResult[]) {
  let index = 0;
  const next = () => {
    const result = results[index] ?? {};
    index += 1;
    return makeBuilder(result);
  };

  const from = jest.fn(() => next());
  const rpc = jest.fn(() => next());

  const supabase = {
    from,
    rpc,
    consumed: () => index,
  };

  // The real client is a much richer type; casting keeps call sites clean
  // while still exercising the production code paths under test.
  return supabase as typeof supabase & Record<string, unknown>;
}

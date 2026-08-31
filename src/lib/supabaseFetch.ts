import type { PostgrestError } from '@supabase/supabase-js'

// Supabase/PostgREST returns at most 1000 rows per request. For tables that can
// grow beyond that (purchases, sales, ...), a plain .select() silently returns
// only the first 1000 rows, which both hides newer records and under-counts
// every roll-up (P&L, Dashboard, Cash Flow). This helper pages through with
// .range() and returns the full result set.
const PAGE = 1000

interface Rangeable<T> {
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
}

/**
 * Fetch every row of a query, 1000 at a time. `makeQuery` must return a fresh
 * PostgREST builder each call (with its select/order/filters already applied);
 * `.range()` is added here.
 */
export async function fetchAllRows<T>(makeQuery: () => Rangeable<T>): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await makeQuery().range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE) break
  }
  return all
}

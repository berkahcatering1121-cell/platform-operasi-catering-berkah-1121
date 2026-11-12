import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/supabaseFetch'
import type { BankMonthSummary } from './bankSummary'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ── Per-month statement summary (table public.bank_statements) ──────────────
export interface BankStatementRow {
  month_key: string
  opening: number
  closing: number
  total_in: number
  total_out: number
  in_count: number | null
  out_count: number | null
  account_last4: string | null
}

export function bankStatementToSummary(r: BankStatementRow): BankMonthSummary {
  return {
    monthKey: r.month_key,
    opening: r.opening,
    closing: r.closing,
    totalIn: r.total_in,
    totalOut: r.total_out,
    inCount: r.in_count ?? undefined,
    outCount: r.out_count ?? undefined,
    accountLast4: r.account_last4 ?? undefined,
    savedAt: '',
  }
}

export const bankStatementKeys = { all: ['bank_statements'] as const }

export function useBankStatements() {
  return useQuery({
    queryKey: bankStatementKeys.all,
    queryFn: () =>
      fetchAllRows<BankStatementRow>(() =>
        supabase
          .from('bank_statements')
          .select('month_key, opening, closing, total_in, total_out, in_count, out_count, account_last4')
          .order('month_key', { ascending: true }),
      ),
  })
}

// Upsert one month's summary (one row per month_key).
export function useSaveBankStatement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (s: BankMonthSummary) => {
      unwrap(
        await supabase
          .from('bank_statements')
          .upsert(
            {
              month_key: s.monthKey,
              opening: s.opening,
              closing: s.closing,
              total_in: s.totalIn,
              total_out: s.totalOut,
              in_count: s.inCount ?? null,
              out_count: s.outCount ?? null,
              account_last4: s.accountLast4 ?? null,
            },
            { onConflict: 'month_key' },
          )
          .select('month_key'),
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bankStatementKeys.all }),
  })
}

export function useDeleteBankStatement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (monthKey: string) => {
      unwrap(await supabase.from('bank_statements').delete().eq('month_key', monthKey).select('month_key'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bankStatementKeys.all }),
  })
}

// One persisted bank-statement line (table public.bank_transactions).
export interface BankTxnRow {
  id: string
  txn_date: string // YYYY-MM-DD
  description: string
  direction: 'in' | 'out'
  amount: number
  balance: number | null
  month_key: string // YYYY-MM (generated in the DB from txn_date)
  source: string | null
  account_last4: string | null
  dedup_key: string
  recorded: boolean
  recorded_cost_id: string | null
}

export interface BankTxnInsert {
  txn_date: string
  description: string
  direction: 'in' | 'out'
  amount: number
  balance: number | null
  month_key: string
  source: string | null
  account_last4: string | null
  dedup_key: string
}

const SELECT =
  'id, txn_date, description, direction, amount, balance, month_key, source, account_last4, dedup_key, recorded, recorded_cost_id'

export const bankTxnKeys = { all: ['bank_txns'] as const, month: (k: string) => ['bank_txns', k] as const }

export function useBankTxns(monthKey: string) {
  return useQuery({
    queryKey: bankTxnKeys.month(monthKey),
    queryFn: () =>
      fetchAllRows<BankTxnRow>(() =>
        supabase
          .from('bank_transactions')
          .select(SELECT)
          .eq('month_key', monthKey)
          .order('txn_date', { ascending: true }),
      ),
  })
}

// Insert parsed statement rows, skipping any whose dedup_key already exists so
// re-uploading the same statement never duplicates. Returns how many were new.
export function useSaveBankTxns() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rows: BankTxnInsert[]) => {
      if (rows.length === 0) return 0
      // De-duplicate within the batch too (a statement can repeat a key).
      const seen = new Set<string>()
      const unique = rows.filter((r) => (seen.has(r.dedup_key) ? false : (seen.add(r.dedup_key), true)))
      const inserted = unwrap<{ id: string }[]>(
        await supabase
          .from('bank_transactions')
          .upsert(unique, { onConflict: 'dedup_key', ignoreDuplicates: true })
          .select('id'),
      )
      return inserted.length
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bankTxnKeys.all }),
  })
}

export function useMarkBankTxnRecorded() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, recorded_cost_id }: { id: string; recorded_cost_id: string | null }) => {
      unwrap(
        await supabase
          .from('bank_transactions')
          .update({ recorded: true, recorded_cost_id })
          .eq('id', id)
          .select('id'),
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bankTxnKeys.all }),
  })
}

export function useDeleteBankTxnsForMonth() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (monthKey: string) => {
      unwrap(await supabase.from('bank_transactions').delete().eq('month_key', monthKey).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bankTxnKeys.all }),
  })
}

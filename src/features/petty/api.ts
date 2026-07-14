import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PettyEntryView, PettyPeriod } from '@/lib/db'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const pettyKeys = {
  periods: ['petty', 'periods'] as const,
  entries: ['petty', 'entries'] as const,
}

export function usePettyPeriods() {
  return useQuery({
    queryKey: pettyKeys.periods,
    queryFn: async () =>
      unwrap<PettyPeriod[]>(
        await supabase
          .from('petty_cash_periods')
          .select('id, period_month, opening_balance, is_settled')
          .order('period_month', { ascending: false }),
      ),
  })
}

export function usePettyEntries() {
  return useQuery({
    queryKey: pettyKeys.entries,
    queryFn: async () =>
      unwrap<PettyEntryView[]>(
        await supabase
          .from('v_petty_cash_entries')
          .select(
            'id, period_id, entry_date, description, cash_in, cash_out, photos, sort, period_month, opening_balance, is_settled, running_balance',
          )
          .order('entry_date')
          .order('sort'),
      ),
  })
}

// ---- period mutations ------------------------------------------------------
// Note: is_settled is intentionally NOT set here — settle status is an approval
// action controlled separately by Finance (useSetSettle). "Mengisi" periode
// tidak sama dengan "meng-approve settle".
export interface PeriodInput {
  id?: string
  period_month: string // YYYY-MM-01
  opening_balance: number
}

export function useSavePeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PeriodInput) => {
      const { id, ...payload } = input
      if (id) unwrap(await supabase.from('petty_cash_periods').update(payload).eq('id', id).select('id'))
      else unwrap(await supabase.from('petty_cash_periods').insert(payload).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['petty'] }),
  })
}

/** Approve / change settle status — Finance only (also enforced by DB trigger). */
export function useSetSettle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_settled }: { id: string; is_settled: boolean }) => {
      unwrap(await supabase.from('petty_cash_periods').update({ is_settled }).eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['petty'] }),
  })
}

export function useDeletePeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('petty_cash_periods').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['petty'] }),
  })
}

// ---- entry mutations -------------------------------------------------------
export interface EntryInput {
  id?: string
  period_id: string
  entry_date: string
  description: string
  cash_in: number
  cash_out: number
  photos: string[]
}

export function useSaveEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: EntryInput) => {
      const { id, ...payload } = input
      if (id) unwrap(await supabase.from('petty_cash_entries').update(payload).eq('id', id).select('id'))
      else unwrap(await supabase.from('petty_cash_entries').insert(payload).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['petty'] }),
  })
}

export function useDeleteEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('petty_cash_entries').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['petty'] }),
  })
}

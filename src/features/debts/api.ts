import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DebtView } from '@/lib/db'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const debtKeys = { all: ['debts'] as const }

export function useDebts() {
  return useQuery({
    queryKey: debtKeys.all,
    queryFn: async () =>
      unwrap<DebtView[]>(
        await supabase
          .from('v_debts')
          .select('id, debt_date, creditor, debt_type, description, amount, due_date, paid_amount, sisa, status')
          .order('debt_date', { ascending: false }),
      ),
  })
}

export interface DebtInput {
  id?: string
  debt_date: string
  creditor: string
  debt_type: string | null
  description: string | null
  amount: number
  due_date: string | null
  paid_amount: number
}

export function useSaveDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DebtInput) => {
      const { id, ...payload } = input
      if (id) unwrap(await supabase.from('debts').update(payload).eq('id', id).select('id'))
      else unwrap(await supabase.from('debts').insert(payload).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: debtKeys.all }),
  })
}

export function useDeleteDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('debts').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: debtKeys.all }),
  })
}

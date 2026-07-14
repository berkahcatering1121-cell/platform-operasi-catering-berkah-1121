import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OperationalCost } from '@/lib/db'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const opexKeys = { all: ['operational_costs'] as const }

export function useOperationalCosts() {
  return useQuery({
    queryKey: opexKeys.all,
    queryFn: async () =>
      unwrap<OperationalCost[]>(
        await supabase
          .from('operational_costs')
          .select('id, cost_date, description, category, amount, method, notes, photos')
          .order('cost_date', { ascending: true }),
      ),
  })
}

export interface OpexInput {
  id?: string
  cost_date: string
  description: string
  category: string
  amount: number
  method: string | null
  notes: string | null
  photos: string[]
}

export function useSaveOpex() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: OpexInput) => {
      const { id, ...payload } = input
      if (id) unwrap(await supabase.from('operational_costs').update(payload).eq('id', id).select('id'))
      else unwrap(await supabase.from('operational_costs').insert(payload).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: opexKeys.all }),
  })
}

export function useDeleteOpex() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('operational_costs').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: opexKeys.all }),
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AssetView } from '@/lib/db'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const assetKeys = { all: ['assets'] as const }

export function useAssets() {
  return useQuery({
    queryKey: assetKeys.all,
    queryFn: async () =>
      unwrap<AssetView[]>(
        await supabase
          .from('v_assets')
          .select(
            'id, acquisition_date, name, category, acquisition_cost, economic_life_months, residual_value, dep_per_month, months_elapsed, accumulated_depreciation, book_value',
          )
          .order('acquisition_date', { ascending: false }),
      ),
  })
}

export interface AssetInput {
  id?: string
  acquisition_date: string
  name: string
  category: string | null
  acquisition_cost: number
  economic_life_months: number
  residual_value: number
}

export function useSaveAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AssetInput) => {
      const { id, ...payload } = input
      if (id) unwrap(await supabase.from('assets').update(payload).eq('id', id).select('id'))
      else unwrap(await supabase.from('assets').insert(payload).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('assets').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  })
}

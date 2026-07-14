import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PurchaseView } from '@/lib/db'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const purchaseKeys = { all: ['purchases'] as const }

export function usePurchases() {
  return useQuery({
    queryKey: purchaseKeys.all,
    queryFn: async () =>
      unwrap<PurchaseView[]>(
        await supabase
          .from('v_purchases')
          .select(
            'id, purchase_date, material_name, category, supplier_id, supplier_name, qty, unit, unit_price, total, status, pic_employee_id, notes, photos, month_key',
          )
          .order('purchase_date', { ascending: true }),
      ),
  })
}

export interface PurchaseInput {
  id?: string
  purchase_date: string
  material_name: string
  category: string | null
  supplier_id: string | null
  qty: number
  unit: string | null
  unit_price: number
  status: string
  pic_employee_id: string | null
  notes: string | null
  photos: string[]
}

export function useSavePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PurchaseInput) => {
      const { id, ...payload } = input
      if (id) unwrap(await supabase.from('purchases').update(payload).eq('id', id).select('id'))
      else unwrap(await supabase.from('purchases').insert(payload).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
  })
}

export function useDeletePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('purchases').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: purchaseKeys.all }),
  })
}

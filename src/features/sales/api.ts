import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SaleView } from '@/lib/db'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const saleKeys = { all: ['sales'] as const }

export function useSales() {
  return useQuery({
    queryKey: saleKeys.all,
    queryFn: async () =>
      unwrap<SaleView[]>(
        await supabase
          .from('v_sales')
          .select(
            'id, sale_date, customer, menu_category, menu_name, portions, price_per_portion, total, sisa, method, status, paid_amount, pic_employee_id, pic_name, notes, photos, month_key',
          )
          .order('sale_date', { ascending: true }),
      ),
  })
}

export interface SaleInput {
  id?: string
  sale_date: string
  customer: string
  menu_category: string | null
  menu_name: string | null
  portions: number
  price_per_portion: number
  method: string | null
  status: string
  paid_amount: number
  pic_employee_id: string | null
  notes: string | null
  photos: string[]
}

export function useSaveSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaleInput) => {
      const { id, ...payload } = input
      if (id) unwrap(await supabase.from('sales').update(payload).eq('id', id).select('id'))
      else unwrap(await supabase.from('sales').insert(payload).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: saleKeys.all }),
  })
}

export function useDeleteSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('sales').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: saleKeys.all }),
  })
}

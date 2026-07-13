import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// One row per month (1..12) as returned by the get_pnl(year) SQL function.
export interface PnlMonth {
  month_no: number
  pendapatan: number
  hpp: number
  laba_kotor: number
  margin_kotor: number
  beban_gaji: number
  beban_sewa: number
  beban_listrik: number
  beban_transport: number
  beban_marketing: number
  beban_lain: number
  beban_depresiasi: number
  total_beban_operasional: number
  laba_bersih: number
  margin_bersih: number
}

export function usePnl(year: number) {
  return useQuery({
    queryKey: ['pnl', year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pnl', { p_year: year })
      if (error) throw new Error(error.message)
      return (data ?? []) as PnlMonth[]
    },
  })
}

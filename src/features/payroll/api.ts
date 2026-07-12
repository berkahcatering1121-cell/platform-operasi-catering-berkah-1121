import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PayrollView } from '@/lib/db'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export const payrollKeys = { all: ['payroll'] as const }

export function usePayroll() {
  return useQuery({
    queryKey: payrollKeys.all,
    queryFn: async () =>
      unwrap<PayrollView[]>(
        await supabase
          .from('v_payroll')
          .select(
            'id, employee_id, employee_name, employee_position, employee_department, salary_type, daily_wage, base_salary, period_month, period_label, pay_date, days_worked, allowance, bonus, deduction, status, base_pay, total_beban, take_home, month_key',
          )
          .order('period_month', { ascending: false }),
      ),
  })
}

/** Work dates (ISO) ticked on the calendar for a Harian payroll row. */
export async function fetchPayrollDays(payrollId: string): Promise<string[]> {
  const rows = unwrap<{ work_date: string }[]>(
    await supabase.from('payroll_days').select('work_date').eq('payroll_id', payrollId).order('work_date'),
  )
  return rows.map((r) => r.work_date)
}

export interface PayrollInput {
  id?: string
  employee_id: string
  period_month: string // YYYY-MM-01
  period_label: string | null
  pay_date: string | null
  days_worked: number
  allowance: number
  bonus: number
  deduction: number
  status: string
  /** Ticked calendar dates (Harian only); empty for Bulanan. */
  work_dates: string[]
}

export function useSavePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PayrollInput) => {
      const { id, work_dates, ...header } = input
      let payrollId = id
      if (payrollId) {
        unwrap(await supabase.from('payroll').update(header).eq('id', payrollId).select('id'))
        unwrap(await supabase.from('payroll_days').delete().eq('payroll_id', payrollId).select('id'))
      } else {
        const rows = unwrap<{ id: string }[]>(
          await supabase.from('payroll').insert(header).select('id'),
        )
        payrollId = rows[0].id
      }
      if (work_dates.length) {
        unwrap(
          await supabase
            .from('payroll_days')
            .insert(work_dates.map((d) => ({ payroll_id: payrollId, work_date: d })))
            .select('id'),
        )
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.all }),
  })
}

export function useDeletePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('payroll').delete().eq('id', id).select('id'))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.all }),
  })
}

import { createServerSupabase } from '@/lib/supabase/server'
import { vnYearMonth, lastNMonths, type CashflowMonth } from '@/lib/reports'

/** Đọc v_cashflow_monthly → map theo 'YYYY-MM'. */
async function cashflowMap(): Promise<Map<string, CashflowMonth>> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('v_cashflow_monthly')
    .select('month, total_income, total_expense, net_cashflow')
  const map = new Map<string, CashflowMonth>()
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const ym = String(r.month).slice(0, 7) // 'YYYY-MM' (month là timestamp giờ VN)
    map.set(ym, {
      ym,
      total_income: (r.total_income as number) ?? 0,
      total_expense: (r.total_expense as number) ?? 0,
      net_cashflow: (r.net_cashflow as number) ?? 0,
    })
  }
  return map
}

const zero = (ym: string): CashflowMonth => ({ ym, total_income: 0, total_expense: 0, net_cashflow: 0 })

/** N tháng gần nhất (liên tục, điền 0), kết thúc tháng hiện tại (giờ VN). */
export async function cashflowMonthly(n = 6): Promise<CashflowMonth[]> {
  const map = await cashflowMap()
  const end = vnYearMonth(new Date())
  return lastNMonths(n, end).map((ym) => map.get(ym) ?? zero(ym))
}

/** Các tháng trong [fromYM, toYM] (liên tục, điền 0). */
export async function cashflowRange(fromYM: string, toYM: string): Promise<CashflowMonth[]> {
  const map = await cashflowMap()
  const [fy, fm] = fromYM.split('-').map(Number)
  const [ty, tm] = toYM.split('-').map(Number)
  const n = (ty - fy) * 12 + (tm - fm) + 1
  if (n <= 0) return []
  return lastNMonths(n, toYM).map((ym) => map.get(ym) ?? zero(ym))
}

/** Tổng thu/chi/lợi nhuận/ròng trong kỳ. */
export async function reportSummary(fromYM: string, toYM: string): Promise<{
  income: number
  expense: number
  profit: number
  net: number
}> {
  const rows = await cashflowRange(fromYM, toYM)
  const income = rows.reduce((s, r) => s + r.total_income, 0)
  const expense = rows.reduce((s, r) => s + r.total_expense, 0)
  return { income, expense, profit: income - expense, net: income - expense }
}

export type ReceivableRow = { student_id: string; student_name: string | null; outstanding: number }

/** Công nợ phải thu theo học sinh + tổng (v_receivables_outstanding). */
export async function receivablesOutstanding(): Promise<{ rows: ReceivableRow[]; total: number }> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('v_receivables_outstanding')
    .select('student_id, student_name, outstanding')
    .order('outstanding', { ascending: false })
  const rows = (data ?? []).map((r) => ({
    student_id: r.student_id as string,
    student_name: (r.student_name as string | null) ?? null,
    outstanding: (r.outstanding as number) ?? 0,
  }))
  return { rows, total: rows.reduce((s, r) => s + r.outstanding, 0) }
}

/** Tổng công nợ phải trả (v_payables_outstanding). */
export async function payablesOutstanding(): Promise<number> {
  const supabase = await createServerSupabase()
  const { data } = await supabase.from('v_payables_outstanding').select('outstanding')
  return (data ?? []).reduce((s, r) => s + ((r.outstanding as number) ?? 0), 0)
}

export type UpcomingSession = {
  id: string
  student_id: string
  student_name: string | null
  start_time: string
  end_time: string
}

/** Buổi sắp tới (7 ngày, v_upcoming_sessions), sắp theo giờ tăng. */
export async function upcomingSessions(): Promise<UpcomingSession[]> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('v_upcoming_sessions')
    .select('id, student_id, student_name, start_time, end_time')
    .order('start_time', { ascending: true })
  return (data ?? []) as UpcomingSession[]
}

/** Chỉ số nhanh cho dashboard. */
export async function dashboardStats(): Promise<{
  activeStudents: number
  upcomingCount: number
  receivableTotal: number
  monthIncome: number
  monthExpense: number
}> {
  const supabase = await createServerSupabase()
  const nowYm = vnYearMonth(new Date())
  const [studentsRes, upcoming, receivable, cashflow] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).is('archived_at', null),
    upcomingSessions(),
    receivablesOutstanding(),
    cashflowMonthly(1),
  ])
  const cur = cashflow.find((c) => c.ym === nowYm)
  return {
    activeStudents: studentsRes.count ?? 0,
    upcomingCount: upcoming.length,
    receivableTotal: receivable.total,
    monthIncome: cur?.total_income ?? 0,
    monthExpense: cur?.total_expense ?? 0,
  }
}

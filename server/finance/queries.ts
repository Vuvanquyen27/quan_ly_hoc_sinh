import { createServerSupabase } from '@/lib/supabase/server'
import { vnLocalToUtc } from '@/lib/datetime'

export const INVOICES_PAGE_SIZE = 20

export type InvoiceRow = {
  id: string
  student_id: string
  student_name: string | null
  code: string | null
  title: string | null
  period_month: string | null
  subtotal: number
  discount: number
  total_amount: number
  amount_paid: number
  status: string
  issue_date: string | null
  due_date: string | null
  note: string | null
  created_at: string
}

export type InvoiceItemRow = {
  id: string
  session_id: string | null
  description: string | null
  quantity: number
  unit_price: number
  amount: number
}

export type TransactionRow = {
  id: string
  type: string
  amount: number
  occurred_at: string
  method: string
  reference: string | null
  note: string | null
}

function flattenInvoice(row: Record<string, unknown>): InvoiceRow {
  const student = row.students as { full_name?: string } | null
  const { students: _s, ...rest } = row
  return { ...(rest as Omit<InvoiceRow, 'student_name'>), student_name: student?.full_name ?? null }
}

/** Danh sách hóa đơn (RLS lọc theo user_id), mới nhất trước, có phân trang. */
export async function listInvoices(params: {
  status?: string
  studentId?: string
  page?: number
}): Promise<{ rows: InvoiceRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page && params.page > 0 ? params.page : 1
  const from = (page - 1) * INVOICES_PAGE_SIZE
  const to = from + INVOICES_PAGE_SIZE - 1

  const supabase = await createServerSupabase()
  let q = supabase
    .from('invoices')
    .select('*, students(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.status) q = q.eq('status', params.status)
  if (params.studentId) q = q.eq('student_id', params.studentId)

  const { data, count } = await q
  return {
    rows: (data ?? []).map((r) => flattenInvoice(r as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize: INVOICES_PAGE_SIZE,
  }
}

/** Một hóa đơn kèm dòng chi tiết + lịch sử giao dịch (RLS của chính USER). */
export async function getInvoice(id: string): Promise<{
  invoice: InvoiceRow
  items: InvoiceItemRow[]
  transactions: TransactionRow[]
} | null> {
  const supabase = await createServerSupabase()
  const { data: inv } = await supabase
    .from('invoices')
    .select('*, students(full_name)')
    .eq('id', id)
    .maybeSingle()
  if (!inv) return null

  const [{ data: items }, { data: transactions }] = await Promise.all([
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('amount', { ascending: false }),
    supabase.from('transactions').select('*').eq('invoice_id', id).order('occurred_at', { ascending: false }),
  ])

  return {
    invoice: flattenInvoice(inv as Record<string, unknown>),
    items: (items ?? []) as InvoiceItemRow[],
    transactions: (transactions ?? []) as TransactionRow[],
  }
}

/** Biên UTC của một tháng theo giờ VN, từ chuỗi 'YYYY-MM'. */
function monthRangeUtc(periodMonth: string): { fromIso: string; toIso: string } {
  const [y, m] = periodMonth.split('-').map(Number)
  const nextY = m === 12 ? y + 1 : y
  const nextM = m === 12 ? 1 : m + 1
  const fromIso = vnLocalToUtc(`${periodMonth}-01T00:00`)
  const toIso = vnLocalToUtc(`${nextY}-${String(nextM).padStart(2, '0')}-01T00:00`)
  return { fromIso, toIso }
}

/** Xem trước các buổi sẽ đưa vào hóa đơn (completed, chưa is_billed, trong kỳ). */
export async function previewInvoiceFromSessions(params: {
  studentId: string
  periodMonth: string
}): Promise<{ items: { sessionId: string; description: string; amount: number }[]; subtotal: number }> {
  const { fromIso, toIso } = monthRangeUtc(params.periodMonth)
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('sessions')
    .select('id, start_time, fee_amount')
    .eq('student_id', params.studentId)
    .eq('status', 'completed')
    .eq('is_billed', false)
    .gte('start_time', fromIso)
    .lt('start_time', toIso)
    .order('start_time', { ascending: true })

  const items = (data ?? []).map((s) => ({
    sessionId: s.id as string,
    description: s.start_time as string,
    amount: (s.fee_amount as number) ?? 0,
  }))
  const subtotal = items.reduce((sum, it) => sum + it.amount, 0)
  return { items, subtotal }
}

/** Công nợ phải thu còn lại theo học sinh (hóa đơn chưa paid/cancelled). */
export async function receivablesByStudent(): Promise<
  { studentId: string; studentName: string | null; outstanding: number }[]
> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('invoices')
    .select('student_id, total_amount, amount_paid, students(full_name)')
    .not('status', 'in', '("paid","cancelled")')

  const map = new Map<string, { studentName: string | null; outstanding: number }>()
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const sid = r.student_id as string
    const student = r.students as { full_name?: string } | null
    const remaining = ((r.total_amount as number) ?? 0) - ((r.amount_paid as number) ?? 0)
    const cur = map.get(sid) ?? { studentName: student?.full_name ?? null, outstanding: 0 }
    cur.outstanding += remaining
    map.set(sid, cur)
  }
  return [...map.entries()].map(([studentId, v]) => ({ studentId, ...v }))
}

/** Tổng công nợ phải thu (mọi học sinh). */
export async function receivablesTotal(): Promise<number> {
  const rows = await receivablesByStudent()
  return rows.reduce((sum, r) => sum + r.outstanding, 0)
}

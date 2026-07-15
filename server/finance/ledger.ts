import { createServerSupabase } from '@/lib/supabase/server'
import { vnLocalToUtc } from '@/lib/datetime'

export const TRANSACTIONS_PAGE_SIZE = 30

export type LedgerRow = {
  id: string
  type: string
  amount: number
  occurred_at: string
  method: string
  reference: string | null
  note: string | null
  category_name: string | null
  source: 'invoice' | 'payable' | 'free'
  student_name: string | null
  creditor_name: string | null
}

export type DueRow = {
  kind: 'receivable' | 'payable'
  id: string
  name: string | null
  remaining: number
  due_date: string
}

function flattenTx(row: Record<string, unknown>): LedgerRow {
  const cat = row.categories as { name?: string } | null
  const inv = row.invoices as { students?: { full_name?: string } | null } | null
  const pay = row.payables as { creditor_name?: string } | null
  const source: LedgerRow['source'] = row.invoice_id ? 'invoice' : row.payable_id ? 'payable' : 'free'
  return {
    id: row.id as string,
    type: row.type as string,
    amount: (row.amount as number) ?? 0,
    occurred_at: row.occurred_at as string,
    method: row.method as string,
    reference: (row.reference as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    category_name: cat?.name ?? null,
    source,
    student_name: inv?.students?.full_name ?? null,
    creditor_name: pay?.creditor_name ?? null,
  }
}

/** Sổ thu/chi + lịch sử: transactions (thu & chi), enrich nhãn nguồn, phân trang. */
export async function listTransactions(params: {
  type?: string
  categoryId?: string
  from?: string // 'YYYY-MM-DD' (giờ VN)
  to?: string // 'YYYY-MM-DD' (giờ VN, bao gồm cả ngày)
  page?: number
}): Promise<{ rows: LedgerRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page && params.page > 0 ? params.page : 1
  const from = (page - 1) * TRANSACTIONS_PAGE_SIZE
  const to = from + TRANSACTIONS_PAGE_SIZE - 1

  const supabase = await createServerSupabase()
  let q = supabase
    .from('transactions')
    .select('*, categories(name), invoices(students(full_name)), payables(creditor_name)', {
      count: 'exact',
    })
    .order('occurred_at', { ascending: false })
    .range(from, to)

  if (params.type) q = q.eq('type', params.type)
  if (params.categoryId) q = q.eq('category_id', params.categoryId)
  if (params.from) q = q.gte('occurred_at', vnLocalToUtc(`${params.from}T00:00`))
  if (params.to) q = q.lte('occurred_at', vnLocalToUtc(`${params.to}T23:59`))

  const { data, count } = await q
  return {
    rows: (data ?? []).map((r) => flattenTx(r as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize: TRANSACTIONS_PAGE_SIZE,
  }
}

/** Hạn thanh toán gộp: invoices (thu) + payables (trả) chưa paid/cancelled, có due_date. */
export async function listUpcomingDue(): Promise<{ overdue: DueRow[]; upcoming: DueRow[] }> {
  const supabase = await createServerSupabase()
  const [{ data: inv }, { data: pay }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, due_date, total_amount, amount_paid, students(full_name)')
      .not('status', 'in', '("paid","cancelled")')
      .not('due_date', 'is', null),
    supabase
      .from('payables')
      .select('id, due_date, total_amount, amount_paid, creditor_name')
      .not('status', 'in', '("paid","cancelled")')
      .not('due_date', 'is', null),
  ])

  const rows: DueRow[] = []
  for (const r of (inv ?? []) as Record<string, unknown>[]) {
    const remaining = ((r.total_amount as number) ?? 0) - ((r.amount_paid as number) ?? 0)
    if (remaining <= 0) continue
    const student = r.students as { full_name?: string } | null
    rows.push({ kind: 'receivable', id: r.id as string, name: student?.full_name ?? null, remaining, due_date: r.due_date as string })
  }
  for (const r of (pay ?? []) as Record<string, unknown>[]) {
    const remaining = ((r.total_amount as number) ?? 0) - ((r.amount_paid as number) ?? 0)
    if (remaining <= 0) continue
    rows.push({ kind: 'payable', id: r.id as string, name: (r.creditor_name as string | null) ?? null, remaining, due_date: r.due_date as string })
  }
  rows.sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0))

  const today = new Date().toISOString().slice(0, 10)
  return {
    overdue: rows.filter((r) => r.due_date < today),
    upcoming: rows.filter((r) => r.due_date >= today),
  }
}

import { createServerSupabase } from '@/lib/supabase/server'

export const PAYABLES_PAGE_SIZE = 20

export type PayableRow = {
  id: string
  creditor_name: string | null
  category_id: string | null
  category_name: string | null
  title: string | null
  total_amount: number
  amount_paid: number
  status: string
  due_date: string | null
  note: string | null
  created_at: string
}

export type PayableTxRow = {
  id: string
  amount: number
  occurred_at: string
  method: string
  reference: string | null
  note: string | null
}

function flatten(row: Record<string, unknown>): PayableRow {
  const cat = row.categories as { name?: string } | null
  const { categories: _c, ...rest } = row
  return { ...(rest as Omit<PayableRow, 'category_name'>), category_name: cat?.name ?? null }
}

/** Danh sách phải trả (RLS lọc theo user_id), mới nhất trước, phân trang. */
export async function listPayables(params: {
  status?: string
  page?: number
}): Promise<{ rows: PayableRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page && params.page > 0 ? params.page : 1
  const from = (page - 1) * PAYABLES_PAGE_SIZE
  const to = from + PAYABLES_PAGE_SIZE - 1

  const supabase = await createServerSupabase()
  let q = supabase
    .from('payables')
    .select('*, categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (params.status) q = q.eq('status', params.status)

  const { data, count } = await q
  return {
    rows: (data ?? []).map((r) => flatten(r as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize: PAYABLES_PAGE_SIZE,
  }
}

/** Một khoản phải trả kèm lịch sử giao dịch chi (RLS của chính USER). */
export async function getPayable(id: string): Promise<{
  payable: PayableRow
  transactions: PayableTxRow[]
} | null> {
  const supabase = await createServerSupabase()
  const { data: pay } = await supabase
    .from('payables')
    .select('*, categories(name)')
    .eq('id', id)
    .maybeSingle()
  if (!pay) return null

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, amount, occurred_at, method, reference, note')
    .eq('payable_id', id)
    .order('occurred_at', { ascending: false })

  return {
    payable: flatten(pay as Record<string, unknown>),
    transactions: (transactions ?? []) as PayableTxRow[],
  }
}

/** Tổng công nợ phải trả còn lại (payables chưa paid/cancelled). */
export async function payablesTotal(): Promise<number> {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('payables')
    .select('total_amount, amount_paid')
    .not('status', 'in', '("paid","cancelled")')
  return (data ?? []).reduce(
    (sum, r) => sum + (((r.total_amount as number) ?? 0) - ((r.amount_paid as number) ?? 0)),
    0,
  )
}

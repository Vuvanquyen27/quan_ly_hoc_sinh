'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { payableSchema } from '@/lib/validators/payable'
import { payablePaymentSchema } from '@/lib/validators/payment'
import { vnLocalToUtc } from '@/lib/datetime'

export type FinancePayableActionState = { error?: string } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/dang-nhap')
  if (isReadOnly(ctx)) {
    return { error: 'Tài khoản đang ở chế độ chỉ đọc (thuê bao hết hạn hoặc bị khóa).' }
  }
  return null
}

function parsePayable(formData: FormData) {
  return payableSchema.safeParse({
    creditorName: String(formData.get('creditorName') ?? ''),
    title: String(formData.get('title') ?? ''),
    categoryId: String(formData.get('categoryId') ?? ''),
    totalAmount: String(formData.get('totalAmount') ?? '0'),
    dueDate: String(formData.get('dueDate') ?? ''),
    note: String(formData.get('note') ?? ''),
  })
}

/** Tạo khoản phải trả. */
export async function createPayable(
  _prev: FinancePayableActionState,
  formData: FormData,
): Promise<FinancePayableActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = parsePayable(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { data, error } = await supabase
    .from('payables')
    .insert({
      creditor_name: (d.creditorName ?? '').trim() || null,
      title: (d.title ?? '').trim() || null,
      category_id: d.categoryId || null,
      total_amount: d.totalAmount,
      due_date: d.dueDate || null,
      note: (d.note ?? '').trim() || null,
    })
    .select('id')
    .maybeSingle()
  if (error || !data) return { error: 'Không tạo được khoản phải trả.' }

  revalidatePath('/tai-chinh/phai-tra')
  redirect(`/tai-chinh/phai-tra/${data.id}`)
}

/** Cập nhật khoản phải trả (khi chưa hủy). */
export async function updatePayable(
  _prev: FinancePayableActionState,
  formData: FormData,
): Promise<FinancePayableActionState> {
  const guard = await requireWritable()
  if (guard) return guard
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Thiếu mã khoản phải trả.' }

  const parsed = parsePayable(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('payables')
    .update({
      creditor_name: (d.creditorName ?? '').trim() || null,
      title: (d.title ?? '').trim() || null,
      category_id: d.categoryId || null,
      total_amount: d.totalAmount,
      due_date: d.dueDate || null,
      note: (d.note ?? '').trim() || null,
    })
    .eq('id', id)
  if (error) return { error: 'Không cập nhật được khoản phải trả.' }

  revalidatePath('/tai-chinh/phai-tra')
  revalidatePath(`/tai-chinh/phai-tra/${id}`)
  redirect(`/tai-chinh/phai-tra/${id}`)
}

/** Hủy khoản phải trả (xóa mềm status='cancelled'). */
export async function cancelPayableAction(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('payables').update({ status: 'cancelled' }).eq('id', id)
  if (error) {
    console.error('cancelPayableAction lỗi:', id, error.message)
    return
  }
  revalidatePath('/tai-chinh/phai-tra')
  revalidatePath(`/tai-chinh/phai-tra/${id}`)
}

/** Ghi trả nợ → transactions(expense, payable_id) → trigger cập nhật payable. */
export async function recordPayablePayment(
  _prev: FinancePayableActionState,
  formData: FormData,
): Promise<FinancePayableActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = payablePaymentSchema.safeParse({
    payableId: String(formData.get('payableId') ?? ''),
    amount: String(formData.get('amount') ?? '0'),
    method: String(formData.get('method') ?? 'cash'),
    occurredAt: String(formData.get('occurredAt') ?? ''),
    reference: String(formData.get('reference') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const { data: pay } = await supabase
    .from('payables')
    .select('status, category_id')
    .eq('id', d.payableId)
    .maybeSingle()
  if (!pay) return { error: 'Không tìm thấy khoản phải trả.' }
  if (pay.status === 'cancelled') return { error: 'Khoản đã hủy, không thể ghi trả.' }

  const row: {
    type: 'expense'
    amount: number
    payable_id: string
    category_id: string | null
    method: string
    reference: string | null
    occurred_at?: string
  } = {
    type: 'expense',
    amount: d.amount,
    payable_id: d.payableId,
    category_id: (pay.category_id as string | null) ?? null,
    method: d.method,
    reference: (d.reference ?? '').trim() || null,
  }
  if (d.occurredAt) row.occurred_at = vnLocalToUtc(d.occurredAt)

  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { error } = await supabase.from('transactions').insert(row)
  if (error) return { error: 'Không ghi được khoản trả.' }

  revalidatePath(`/tai-chinh/phai-tra/${d.payableId}`)
  revalidatePath('/tai-chinh/phai-tra')
  redirect(`/tai-chinh/phai-tra/${d.payableId}`)
}

'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { transactionSchema } from '@/lib/validators/transaction'
import { vnLocalToUtc } from '@/lib/datetime'

export type FinanceLedgerActionState = { error?: string; ok?: boolean } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) return { error: 'Chưa đăng nhập.' }
  if (isReadOnly(ctx)) return { error: 'Tài khoản đang ở chế độ chỉ đọc.' }
  return null
}

/** Ghi thu/chi tự do (không gắn hóa đơn/khoản trả). */
export async function createTransaction(
  _prev: FinanceLedgerActionState,
  formData: FormData,
): Promise<FinanceLedgerActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = transactionSchema.safeParse({
    type: String(formData.get('type') ?? ''),
    amount: String(formData.get('amount') ?? '0'),
    categoryId: String(formData.get('categoryId') ?? ''),
    method: String(formData.get('method') ?? 'cash'),
    occurredAt: String(formData.get('occurredAt') ?? ''),
    reference: String(formData.get('reference') ?? ''),
    note: String(formData.get('note') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const row: Record<string, unknown> = {
    type: d.type,
    amount: d.amount,
    category_id: d.categoryId || null,
    method: d.method,
    reference: (d.reference ?? '').trim() || null,
    note: (d.note ?? '').trim() || null,
  }
  if (d.occurredAt) row.occurred_at = vnLocalToUtc(d.occurredAt)

  const supabase = await createServerSupabase()
  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { error } = await supabase.from('transactions').insert(row)
  if (error) return { error: 'Không ghi được giao dịch.' }

  revalidatePath('/tai-chinh/thu-chi')
  revalidatePath('/tai-chinh/lich-su')
  return { ok: true }
}

/** Xóa giao dịch tự do (chỉ dòng chưa gắn hóa đơn/khoản trả). */
export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .is('invoice_id', null)
    .is('payable_id', null)
  if (error) {
    console.error('deleteTransactionAction lỗi:', id, error.message)
    return
  }
  revalidatePath('/tai-chinh/thu-chi')
  revalidatePath('/tai-chinh/lich-su')
}

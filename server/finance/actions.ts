'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { manualInvoiceSchema, previewParamsSchema } from '@/lib/validators/invoice'
import { paymentSchema } from '@/lib/validators/payment'
import { vnLocalToUtc } from '@/lib/datetime'

export type FinanceActionState = { error?: string } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/dang-nhap')
  if (isReadOnly(ctx)) {
    return { error: 'Tài khoản đang ở chế độ chỉ đọc (thuê bao hết hạn hoặc bị khóa).' }
  }
  return null
}

/** Tạo hóa đơn tự động tổng hợp từ buổi đã hoàn thành trong kỳ (RPC atomic). */
export async function createInvoiceFromSessions(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = previewParamsSchema.safeParse({
    studentId: String(formData.get('studentId') ?? ''),
    periodMonth: String(formData.get('periodMonth') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const discount = Number(formData.get('discount') ?? 0) || 0
  const dueDate = String(formData.get('dueDate') ?? '') || null
  const title = String(formData.get('title') ?? '') || null

  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('create_invoice_from_sessions', {
    p_student_id: parsed.data.studentId,
    p_period_month: `${parsed.data.periodMonth}-01`,
    p_discount: discount,
    p_due_date: dueDate,
    p_title: title,
  })
  if (error) {
    return {
      error: error.message.includes('Khong co buoi')
        ? 'Không có buổi học hoàn thành chưa lập hóa đơn trong kỳ này.'
        : 'Không tạo được hóa đơn từ buổi.',
    }
  }

  revalidatePath('/tai-chinh/phai-thu')
  redirect(`/tai-chinh/phai-thu/${data as string}`)
}

/** Tạo hóa đơn thủ công (nhập tổng tiền trực tiếp). */
export async function createManualInvoice(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = manualInvoiceSchema.safeParse({
    studentId: String(formData.get('studentId') ?? ''),
    title: String(formData.get('title') ?? ''),
    totalAmount: String(formData.get('totalAmount') ?? '0'),
    dueDate: String(formData.get('dueDate') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      student_id: d.studentId,
      title: d.title || null,
      subtotal: d.totalAmount,
      discount: 0,
      total_amount: d.totalAmount,
      due_date: d.dueDate || null,
    })
    .select('id')
    .maybeSingle()
  if (error || !data) return { error: 'Không tạo được hóa đơn.' }

  revalidatePath('/tai-chinh/phai-thu')
  redirect(`/tai-chinh/phai-thu/${data.id}`)
}

/** Ghi nhận thu học phí → transactions(income) → trigger cập nhật hóa đơn. */
export async function recordTuitionPayment(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = paymentSchema.safeParse({
    invoiceId: String(formData.get('invoiceId') ?? ''),
    amount: String(formData.get('amount') ?? '0'),
    method: String(formData.get('method') ?? 'cash'),
    occurredAt: String(formData.get('occurredAt') ?? ''),
    reference: String(formData.get('reference') ?? ''),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const supabase = await createServerSupabase()
  const { data: inv } = await supabase
    .from('invoices')
    .select('student_id, status')
    .eq('id', d.invoiceId)
    .maybeSingle()
  if (!inv) return { error: 'Không tìm thấy hóa đơn.' }
  if (inv.status === 'cancelled') return { error: 'Hóa đơn đã hủy, không thể ghi thanh toán.' }

  const row: {
    type: 'income'
    amount: number
    invoice_id: string
    student_id: string
    method: string
    reference: string | null
    occurred_at?: string
  } = {
    type: 'income',
    amount: d.amount,
    invoice_id: d.invoiceId,
    student_id: inv.student_id as string,
    method: d.method,
    reference: (d.reference ?? '').trim() || null,
  }
  if (d.occurredAt) row.occurred_at = vnLocalToUtc(d.occurredAt)

  // Không truyền user_id — CSDL đặt mặc định auth.uid().
  const { error } = await supabase.from('transactions').insert(row)
  if (error) return { error: 'Không ghi được thanh toán.' }

  revalidatePath(`/tai-chinh/phai-thu/${d.invoiceId}`)
  revalidatePath('/tai-chinh/phai-thu')
  redirect(`/tai-chinh/phai-thu/${d.invoiceId}`)
}

/** Hủy hóa đơn (xóa mềm bằng status='cancelled'). */
export async function cancelInvoiceAction(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', id)
  if (error) {
    console.error('cancelInvoiceAction lỗi:', id, error.message)
    return
  }
  revalidatePath('/tai-chinh/phai-thu')
  revalidatePath(`/tai-chinh/phai-thu/${id}`)
}

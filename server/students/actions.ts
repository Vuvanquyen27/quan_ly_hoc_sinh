'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getSessionContext, isReadOnly } from '@/lib/auth'
import { studentSchema } from '@/lib/validators/student'

export type StudentActionState = { error?: string } | null

async function requireWritable(): Promise<{ error: string } | null> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/dang-nhap')
  if (isReadOnly(ctx)) {
    return { error: 'Tài khoản đang ở chế độ chỉ đọc (thuê bao hết hạn hoặc bị khóa).' }
  }
  return null
}

function readForm(formData: FormData) {
  return {
    fullName: String(formData.get('fullName') ?? ''),
    dateOfBirth: String(formData.get('dateOfBirth') ?? ''),
    gender: String(formData.get('gender') ?? ''),
    gradeLevel: String(formData.get('gradeLevel') ?? ''),
    subjects: String(formData.get('subjects') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    parentName: String(formData.get('parentName') ?? ''),
    parentPhone: String(formData.get('parentPhone') ?? ''),
    address: String(formData.get('address') ?? ''),
    defaultFee: String(formData.get('defaultFee') ?? '0'),
    feeType: String(formData.get('feeType') ?? 'per_session'),
    status: String(formData.get('status') ?? 'active'),
    notes: String(formData.get('notes') ?? ''),
  }
}

function toRow(d: ReturnType<typeof studentSchema.parse>) {
  return {
    full_name: d.fullName,
    date_of_birth: d.dateOfBirth || null,
    gender: d.gender || null,
    grade_level: d.gradeLevel || null,
    subjects: d.subjects
      ? d.subjects.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    phone: d.phone || null,
    email: d.email || null,
    parent_name: d.parentName || null,
    parent_phone: d.parentPhone || null,
    address: d.address || null,
    default_fee: d.defaultFee,
    fee_type: d.feeType,
    status: d.status,
    notes: d.notes || null,
  }
}

/** Tạo hoặc cập nhật học sinh (dựa vào field ẩn `id`). */
export async function saveStudent(
  _prev: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const guard = await requireWritable()
  if (guard) return guard

  const parsed = studentSchema.safeParse(readForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createServerSupabase()
  const id = formData.get('id') ? String(formData.get('id')) : null
  const row = toRow(parsed.data)

  if (id) {
    // RLS đảm bảo chỉ sửa được học sinh của chính mình.
    const { error } = await supabase.from('students').update(row).eq('id', id)
    if (error) return { error: 'Không cập nhật được học sinh.' }
  } else {
    // Không truyền user_id — CSDL đặt mặc định auth.uid().
    const { error } = await supabase.from('students').insert(row)
    if (error) return { error: 'Không lưu được học sinh.' }
  }

  revalidatePath('/hoc-sinh')
  redirect('/hoc-sinh')
}

/** Lưu trữ (xóa mềm) học sinh. */
export async function archiveStudentAction(formData: FormData): Promise<void> {
  const guard = await requireWritable()
  if (guard) return
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createServerSupabase()
  await supabase.from('students').update({ archived_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/hoc-sinh')
  redirect('/hoc-sinh')
}

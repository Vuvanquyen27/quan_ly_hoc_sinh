'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertAdmin } from '@/lib/admin'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { planSchema } from '@/lib/validators/admin'

export type PlanActionState = { error?: string } | null

function readPlanForm(formData: FormData) {
  return {
    code: String(formData.get('code') ?? '').trim().toLowerCase(),
    name: String(formData.get('name') ?? '').trim(),
    description: String(formData.get('description') ?? ''),
    price: String(formData.get('price') ?? '0'),
    billingCycle: String(formData.get('billingCycle') ?? 'monthly'),
    isActive: formData.get('isActive') === 'on',
    sortOrder: String(formData.get('sortOrder') ?? '0'),
  }
}

/** Tạo gói mới. */
export async function createPlan(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await assertAdmin()
  const parsed = planSchema.safeParse(readPlanForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const admin = createAdminSupabase()
  const { error } = await admin.from('plans').insert({
    code: d.code,
    name: d.name,
    description: (d.description ?? '').trim() || null,
    price: d.price,
    billing_cycle: d.billingCycle,
    is_active: d.isActive,
    sort_order: d.sortOrder,
  })
  if (error) {
    return { error: error.code === '23505' ? 'Mã gói đã tồn tại.' : 'Không tạo được gói.' }
  }

  revalidatePath('/admin/goi')
  redirect('/admin/goi')
}

/** Cập nhật gói theo id (field ẩn). */
export async function updatePlan(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await assertAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Thiếu mã gói.' }
  const parsed = planSchema.safeParse(readPlanForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  const admin = createAdminSupabase()
  const { error } = await admin
    .from('plans')
    .update({
      code: d.code,
      name: d.name,
      description: (d.description ?? '').trim() || null,
      price: d.price,
      billing_cycle: d.billingCycle,
      is_active: d.isActive,
      sort_order: d.sortOrder,
    })
    .eq('id', id)
  if (error) {
    return { error: error.code === '23505' ? 'Mã gói đã tồn tại.' : 'Không cập nhật được gói.' }
  }

  revalidatePath('/admin/goi')
  redirect('/admin/goi')
}

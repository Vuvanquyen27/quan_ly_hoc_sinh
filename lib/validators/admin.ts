import { z } from 'zod'

// ---------- Hằng số hiển thị (tách chuỗi khỏi logic) ----------

export const SUB_STATUS_LABEL: Record<string, string> = {
  trialing: 'Đang dùng thử',
  active: 'Đang hoạt động',
  past_due: 'Quá hạn thanh toán',
  expired: 'Đã hết hạn',
  cancelled: 'Đã hủy',
}

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'e_wallet', 'other'] as const
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  e_wallet: 'Ví điện tử',
  other: 'Khác',
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
}

export const EVENT_KIND_LABEL: Record<string, string> = {
  activation: 'Kích hoạt',
  renewal: 'Gia hạn',
  upgrade: 'Nâng gói',
  downgrade: 'Hạ gói',
}

export const BILLING_CYCLES = ['monthly', 'yearly'] as const
export const BILLING_CYCLE_LABEL: Record<string, string> = {
  monthly: 'Theo tháng',
  yearly: 'Theo năm',
}

export const ADMIN_ACTIONS = [
  'activate_subscription',
  'renew_subscription',
  'change_plan',
  'cancel_subscription',
  'lock_account',
  'unlock_account',
  'update_account',
] as const
export type AdminAction = (typeof ADMIN_ACTIONS)[number]

export const ADMIN_ACTION_LABEL: Record<AdminAction, string> = {
  activate_subscription: 'Kích hoạt thuê bao',
  renew_subscription: 'Gia hạn thuê bao',
  change_plan: 'Đổi gói',
  cancel_subscription: 'Hủy thuê bao',
  lock_account: 'Khóa tài khoản',
  unlock_account: 'Mở khóa tài khoản',
  update_account: 'Cập nhật tài khoản',
}

// ---------- Schemas ----------

const methodEnum = z.enum(PAYMENT_METHODS)

/** Xác nhận thanh toán & kích hoạt: chọn gói, phương thức, số tiền, ngày bắt đầu. */
export const activateSchema = z.object({
  planId: z.string().uuid('Chưa chọn gói hợp lệ'),
  method: methodEnum,
  amount: z.coerce.number().int('Số tiền phải là số nguyên').min(0, 'Số tiền không được âm'),
  periodStart: z.string().min(1, 'Chưa chọn ngày bắt đầu'),
  reference: z.string().optional(),
  note: z.string().optional(),
})
export type ActivateInput = z.infer<typeof activateSchema>

/** Gia hạn: đẩy expires_at theo chu kỳ của gói hiện tại (hoặc gói mới nếu chọn). */
export const renewSchema = z.object({
  planId: z.string().uuid('Chưa chọn gói hợp lệ'),
  method: methodEnum,
  amount: z.coerce.number().int('Số tiền phải là số nguyên').min(0, 'Số tiền không được âm'),
  reference: z.string().optional(),
  note: z.string().optional(),
})
export type RenewInput = z.infer<typeof renewSchema>

/** Đổi gói (không phát sinh thanh toán — chỉ đổi plan_id/billing_cycle). */
export const changePlanSchema = z.object({
  planId: z.string().uuid('Chưa chọn gói hợp lệ'),
})
export type ChangePlanInput = z.infer<typeof changePlanSchema>

/** Sửa thông tin tài khoản (whitelist — không đụng role/is_locked ở đây). */
export const accountUpdateSchema = z.object({
  fullName: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
})
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>

/** CRUD gói (plans). */
export const planSchema = z.object({
  code: z
    .string()
    .min(2, 'Mã gói tối thiểu 2 ký tự')
    .regex(/^[a-z0-9_]+$/, 'Mã gói chỉ gồm chữ thường, số và gạch dưới'),
  name: z.string().min(2, 'Tên gói tối thiểu 2 ký tự'),
  description: z.string().optional(),
  price: z.coerce.number().int('Giá phải là số nguyên').min(0, 'Giá không được âm'),
  billingCycle: z.enum(BILLING_CYCLES),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).default(0),
})
export type PlanInput = z.infer<typeof planSchema>

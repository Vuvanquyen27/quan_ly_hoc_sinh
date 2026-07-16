import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAccountDetail } from '@/server/admin/queries'
import { lockAccount, unlockAccount } from '@/server/admin/accounts-actions'
import {
  SUB_STATUS_LABEL,
  EVENT_KIND_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
} from '@/lib/validators/admin'
import { formatVND, formatDate, formatDateTime } from '@/lib/format'
import { todayVnDate } from '@/lib/datetime'
import { SubmitButton } from '@/components/admin/submit-button'
import AccountEditForm from '@/components/admin/account-edit-form'
import SubscriptionPanel from '@/components/admin/subscription-panel'

export const metadata: Metadata = { title: 'Chi tiết tài khoản — Admin EduFlow' }

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getAccountDetail(id)
  if (!data) notFound()
  const { account, payments, plans } = data
  const sub = account.sub

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/tai-khoan" className="text-sm text-muted-foreground hover:text-foreground">
            ← Danh sách tài khoản
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            {account.email ?? '—'}
            {account.is_locked && (
              <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-sm text-destructive">Bị khóa</span>
            )}
          </h1>
        </div>
      </div>

      {/* Thông tin tài khoản */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-medium text-foreground">Thông tin tài khoản</h2>
        <AccountEditForm
          userId={account.id}
          fullName={account.full_name}
          phone={account.phone}
          email={account.email}
        />
      </section>

      {/* Khóa / mở */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-medium text-foreground">Trạng thái tài khoản</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {account.is_locked
              ? 'Tài khoản đang bị khóa — không đăng nhập/ghi được.'
              : 'Tài khoản đang hoạt động bình thường.'}
          </p>
        </div>
        {account.is_locked ? (
          <form action={unlockAccount}>
            <input type="hidden" name="userId" value={account.id} />
            <SubmitButton variant="success" pendingText="Đang mở…">Mở khóa</SubmitButton>
          </form>
        ) : (
          <form action={lockAccount}>
            <input type="hidden" name="userId" value={account.id} />
            <SubmitButton variant="destructive" pendingText="Đang khóa…">Khóa tài khoản</SubmitButton>
          </form>
        )}
      </section>

      {/* Thuê bao hiện tại */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-medium text-foreground">Thuê bao hiện tại</h2>
        {sub ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Trạng thái</dt>
              <dd className="text-foreground">{SUB_STATUS_LABEL[sub.status] ?? sub.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gói</dt>
              <dd className="text-foreground">{sub.plan_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dùng thử đến</dt>
              <dd className="text-foreground">{sub.trial_ends_at ? formatDate(sub.trial_ends_at) : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Hết hạn</dt>
              <dd className="text-foreground">{sub.expires_at ? formatDate(sub.expires_at) : '—'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có bản ghi thuê bao.</p>
        )}
      </section>

      {/* Thao tác thuê bao */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-medium text-foreground">Quản lý thuê bao</h2>
        <SubscriptionPanel
          userId={account.id}
          status={sub?.status ?? 'trialing'}
          currentPlanId={sub?.plan_id ?? null}
          plans={plans}
          defaultDate={todayVnDate()}
        />
      </section>

      {/* Lịch sử thanh toán */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-medium text-foreground">Lịch sử thanh toán</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có giao dịch thuê bao nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Thời gian</th>
                  <th className="px-3 py-2">Loại</th>
                  <th className="px-3 py-2 text-right">Số tiền</th>
                  <th className="px-3 py-2">Phương thức</th>
                  <th className="px-3 py-2">Kỳ áp dụng</th>
                  <th className="px-3 py-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{formatDateTime(p.created_at)}</td>
                    <td className="px-3 py-2">{EVENT_KIND_LABEL[p.kind] ?? p.kind}</td>
                    <td className="px-3 py-2 text-right text-foreground">{formatVND(p.amount)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.method ? PAYMENT_METHOD_LABEL[p.method] ?? p.method : '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.period_start && p.period_end
                        ? `${formatDate(p.period_start)} – ${formatDate(p.period_end)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                        {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

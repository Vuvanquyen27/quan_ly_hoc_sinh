import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSettings } from '@/server/settings/queries'
import { formatDate } from '@/lib/format'
import ProfileForm from '@/components/settings/profile-form'
import SettingsForm from '@/components/settings/settings-form'
import AvatarUpload from '@/components/settings/avatar-upload'

export const metadata: Metadata = { title: 'Cài đặt — EduFlow' }

const SUB_STATUS: Record<string, string> = {
  trialing: 'Đang dùng thử',
  active: 'Đang hoạt động',
  past_due: 'Quá hạn thanh toán',
  expired: 'Đã hết hạn',
  cancelled: 'Đã hủy',
}

export default async function CaiDatPage() {
  const data = await getSettings()
  if (!data) notFound()
  const s = data.settings ?? {
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh',
    date_format: 'dd/MM/yyyy',
    default_session_duration_min: 90,
    notify_session_reminder: true,
    notify_payment_due: true,
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cài đặt</h1>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-medium text-foreground">Hồ sơ</h2>
        <AvatarUpload current={data.profile?.avatar_url ?? null} />
        <ProfileForm
          fullName={data.profile?.full_name ?? null}
          phone={data.profile?.phone ?? null}
          email={data.email}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-medium text-foreground">Tùy chọn</h2>
        <SettingsForm s={s} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-medium text-foreground">Gói thuê bao</h2>
        {data.subscription ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="inline text-muted-foreground">Trạng thái: </dt>
              <dd className="inline text-foreground">{SUB_STATUS[data.subscription.status] ?? data.subscription.status}</dd>
            </div>
            {data.subscription.trial_ends_at && (
              <div>
                <dt className="inline text-muted-foreground">Dùng thử đến: </dt>
                <dd className="inline text-foreground">{formatDate(data.subscription.trial_ends_at)}</dd>
              </div>
            )}
            {data.subscription.expires_at && (
              <div>
                <dt className="inline text-muted-foreground">Hết hạn: </dt>
                <dd className="inline text-foreground">{formatDate(data.subscription.expires_at)}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có thông tin gói.</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Kích hoạt/gia hạn do quản trị viên xử lý.</p>
      </section>
    </div>
  )
}

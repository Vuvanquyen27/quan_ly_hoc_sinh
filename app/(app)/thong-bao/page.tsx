import type { Metadata } from 'next'
import Link from 'next/link'
import { listNotifications } from '@/server/notifications/queries'
import { markRead, markAllRead, deleteNotification, generateReminders } from '@/server/notifications/actions'
import { NOTIFICATION_TYPE_LABEL } from '@/lib/validators/notification'
import { formatDateTime } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Thông báo — EduFlow' }

type SearchParams = { page?: string }

export default async function ThongBaoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const { rows, total, pageSize } = await listNotifications({ page })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Thông báo</h1>
        <div className="flex gap-2">
          <form action={generateReminders}>
            <Button type="submit" variant="outline">Tạo nhắc nhở</Button>
          </form>
          <form action={markAllRead}>
            <Button type="submit" variant="ghost">Đọc hết</Button>
          </form>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            Chưa có thông báo. Bấm &quot;Tạo nhắc nhở&quot; để tổng hợp buổi sắp tới &amp; khoản quá hạn.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.map((n) => (
            <li
              key={n.id}
              className={`flex items-start justify-between gap-3 px-4 py-3 ${n.is_read ? '' : 'bg-secondary/40'}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="inline-block size-2 shrink-0 rounded-full bg-primary" />}
                  <span className="font-medium text-foreground">{n.title}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">
                    {NOTIFICATION_TYPE_LABEL[n.type] ?? n.type}
                  </span>
                </div>
                {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!n.is_read && (
                  <form action={markRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <Button type="submit" variant="ghost" className="h-8 px-2 text-xs">Đã đọc</Button>
                  </form>
                )}
                <form action={deleteNotification}>
                  <input type="hidden" name="id" value={n.id} />
                  <Button type="submit" variant="ghost" className="h-8 px-2 text-xs text-destructive">Xóa</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Trang {page}/{totalPages}</span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={`/thong-bao?page=${page - 1}`} className={buttonVariants({ variant: 'outline' })}>← Trước</Link>
            ) : (
              <Button variant="outline" disabled>← Trước</Button>
            )}
            {page < totalPages ? (
              <Link href={`/thong-bao?page=${page + 1}`} className={buttonVariants({ variant: 'outline' })}>Sau →</Link>
            ) : (
              <Button variant="outline" disabled>Sau →</Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { listAuditLogs } from '@/server/admin/queries'
import { ADMIN_ACTIONS, ADMIN_ACTION_LABEL } from '@/lib/validators/admin'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { ListResultsSkeleton } from '@/components/ui/skeletons'

export const metadata: Metadata = { title: 'Nhật ký — Admin EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type AuditSearchParams = { action?: string; page?: string }

function metaSummary(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta ?? {})
  if (entries.length === 0) return '—'
  return entries.map(([k, v]) => `${k}: ${v ?? '—'}`).join(' · ')
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<AuditSearchParams>
}) {
  const sp = await searchParams

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nhật ký kiểm toán</h1>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select name="action" defaultValue={sp.action ?? ''} className={inputClass}>
          <option value="">Tất cả hành động</option>
          {ADMIN_ACTIONS.map((a) => (
            <option key={a} value={a}>{ADMIN_ACTION_LABEL[a]}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      <Suspense key={JSON.stringify(sp)} fallback={<ListResultsSkeleton />}>
        <AuditResults sp={sp} />
      </Suspense>
    </div>
  )
}

async function AuditResults({ sp }: { sp: AuditSearchParams }) {
  const page = Math.max(1, Number(sp.page) || 1)
  const { rows, total, pageSize } = await listAuditLogs({ action: sp.action, page })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (sp.action) params.set('action', sp.action)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/admin/nhat-ky?${qs}` : '/admin/nhat-ky'
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{total} bản ghi</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có nhật ký nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Người thực hiện</th>
                <th className="px-4 py-3">Hành động</th>
                <th className="px-4 py-3">Đối tượng</th>
                <th className="px-4 py-3">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(r.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.actor_email ?? r.actor_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                      {ADMIN_ACTION_LABEL[r.action as keyof typeof ADMIN_ACTION_LABEL] ?? r.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.target_email ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{metaSummary(r.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Trang {page}/{totalPages}</span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={buildHref(page - 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">← Trước</Link>
            ) : (
              <span className="rounded-lg border border-border px-3 py-1.5 opacity-50">← Trước</span>
            )}
            {page < totalPages ? (
              <Link href={buildHref(page + 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted">Sau →</Link>
            ) : (
              <span className="rounded-lg border border-border px-3 py-1.5 opacity-50">Sau →</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

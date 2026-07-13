import type { Metadata } from 'next'
import Link from 'next/link'
import { listLessons } from '@/server/lessons/queries'
import { STATUS_LABEL, LESSON_STATUSES } from '@/lib/validators/lesson'
import { Button, buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Bài học — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

export default async function BaiHocPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string; status?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const { rows: lessons, total, pageSize } = await listLessons({
    search: sp.q,
    subject: sp.subject,
    status: sp.status,
    page,
  })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (sp.q) params.set('q', sp.q)
    if (sp.subject) params.set('subject', sp.subject)
    if (sp.status) params.set('status', sp.status)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/bai-hoc?${qs}` : '/bai-hoc'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bài học</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} bài học</p>
        </div>
        <Link
          href="/bai-hoc/moi"
          className={buttonVariants({ variant: 'success', className: 'w-full sm:w-auto' })}
        >
          + Thêm bài học
        </Link>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Tìm theo tiêu đề…"
          className={inputClass + ' w-full sm:w-auto sm:min-w-56'}
        />
        <input
          name="subject"
          defaultValue={sp.subject ?? ''}
          placeholder="Môn"
          className={inputClass + ' w-full sm:w-auto'}
        />
        <select name="status" defaultValue={sp.status ?? ''} className={inputClass}>
          <option value="">Tất cả trạng thái</option>
          {LESSON_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có bài học nào.</p>
          <Link
            href="/bai-hoc/moi"
            className={buttonVariants({ variant: 'success', className: 'mt-4' })}
          >
            Thêm bài học đầu tiên
          </Link>
        </div>
      ) : (
        <>
          {/* Bảng — hiển thị từ md trở lên */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Môn</th>
                  <th className="px-4 py-3">Khối</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted">
                    <td className="px-4 py-3">
                      <Link href={`/bai-hoc/${l.id}`} className="font-medium text-foreground hover:underline">
                        {l.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{l.subject ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.grade_level ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                        {STATUS_LABEL[l.status] ?? l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card — hiển thị dưới md (điện thoại) */}
          <ul className="space-y-3 md:hidden">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/bai-hoc/${l.id}`}
                  className="block rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-foreground">{l.title}</span>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div><dt className="inline">Môn: </dt><dd className="inline">{l.subject ?? '—'}</dd></div>
                    <div><dt className="inline">Khối: </dt><dd className="inline">{l.grade_level ?? '—'}</dd></div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">
            Trang {page}/{totalPages}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={buildHref(page - 1)} className={buttonVariants({ variant: 'outline' })}>
                ← Trước
              </Link>
            ) : (
              <Button variant="outline" disabled>← Trước</Button>
            )}
            {page < totalPages ? (
              <Link href={buildHref(page + 1)} className={buttonVariants({ variant: 'outline' })}>
                Sau →
              </Link>
            ) : (
              <Button variant="outline" disabled>Sau →</Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

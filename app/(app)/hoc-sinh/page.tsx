import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { listStudents } from '@/server/students/queries'
import { STATUS_LABEL, STUDENT_STATUSES } from '@/lib/validators/student'
import { formatVND } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import { ListResultsSkeleton } from '@/components/ui/skeletons'

export const metadata: Metadata = { title: 'Học sinh — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type StudentSearchParams = { q?: string; status?: string; page?: string }

export default async function HocSinhPage({
  searchParams,
}: {
  searchParams: Promise<StudentSearchParams>
}) {
  const sp = await searchParams

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Học sinh</h1>
        <Link
          href="/hoc-sinh/moi"
          className={buttonVariants({ variant: 'success', className: 'w-full sm:w-auto' })}
        >
          + Thêm học sinh
        </Link>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Tìm theo tên…"
          className={inputClass + ' w-full sm:w-auto sm:min-w-56'}
        />
        <select name="status" defaultValue={sp.status ?? ''} className={inputClass}>
          <option value="">Tất cả trạng thái</option>
          {STUDENT_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      {/* Chỉ phần kết quả chờ query — shell trên hiện ngay khi chuyển trang. */}
      <Suspense key={JSON.stringify(sp)} fallback={<ListResultsSkeleton />}>
        <StudentResults sp={sp} />
      </Suspense>
    </div>
  )
}

async function StudentResults({ sp }: { sp: StudentSearchParams }) {
  const page = Math.max(1, Number(sp.page) || 1)
  const { rows: students, total, pageSize } = await listStudents({
    search: sp.q,
    status: sp.status,
    page,
  })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (sp.q) params.set('q', sp.q)
    if (sp.status) params.set('status', sp.status)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/hoc-sinh?${qs}` : '/hoc-sinh'
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{total} học sinh</p>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có học sinh nào.</p>
          <Link
            href="/hoc-sinh/moi"
            className={buttonVariants({ variant: 'success', className: 'mt-4' })}
          >
            Thêm học sinh đầu tiên
          </Link>
        </div>
      ) : (
        <>
          {/* Bảng — hiển thị từ md trở lên */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Họ tên</th>
                  <th className="px-4 py-3">Lớp</th>
                  <th className="px-4 py-3">Môn</th>
                  <th className="px-4 py-3 text-right">Học phí</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted">
                    <td className="px-4 py-3">
                      <Link href={`/hoc-sinh/${s.id}`} className="font-medium text-foreground hover:underline">
                        {s.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.grade_level ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.subjects?.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-right">{formatVND(s.default_fee)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card — hiển thị dưới md (điện thoại) */}
          <ul className="space-y-3 md:hidden">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/hoc-sinh/${s.id}`}
                  className="block rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-foreground">{s.full_name}</span>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div><dt className="inline">Lớp: </dt><dd className="inline">{s.grade_level ?? '—'}</dd></div>
                    <div><dt className="inline">Môn: </dt><dd className="inline">{s.subjects?.join(', ') || '—'}</dd></div>
                    <div className="col-span-2"><dt className="inline">Học phí: </dt><dd className="inline text-foreground">{formatVND(s.default_fee)}</dd></div>
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

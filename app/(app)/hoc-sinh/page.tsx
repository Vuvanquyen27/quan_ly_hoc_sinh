import type { Metadata } from 'next'
import Link from 'next/link'
import { listStudents } from '@/server/students/queries'
import { STATUS_LABEL, STUDENT_STATUSES } from '@/lib/validators/student'
import { formatVND } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Học sinh — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

export default async function HocSinhPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const sp = await searchParams
  const students = await listStudents({ search: sp.q, status: sp.status })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#18211d]">Học sinh</h1>
          <p className="mt-1 text-sm text-muted-foreground">{students.length} học sinh</p>
        </div>
        <Link href="/hoc-sinh/moi" className={buttonVariants({ className: 'bg-[#315c48] text-white hover:bg-[#244637]' })}>
          + Thêm học sinh
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <input name="q" defaultValue={sp.q ?? ''} placeholder="Tìm theo tên…" className={inputClass + ' min-w-56'} />
        <select name="status" defaultValue={sp.status ?? ''} className={inputClass}>
          <option value="">Tất cả trạng thái</option>
          {STUDENT_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d8cbb4] bg-white p-12 text-center">
          <p className="text-muted-foreground">Chưa có học sinh nào.</p>
          <Link href="/hoc-sinh/moi" className={buttonVariants({ className: 'mt-4 bg-[#315c48] text-white hover:bg-[#244637]' })}>
            Thêm học sinh đầu tiên
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#d8cbb4] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#eadfc8] text-xs uppercase tracking-wide text-muted-foreground">
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
                <tr key={s.id} className="border-t border-[#f0e7d7] hover:bg-[#faf6ed]">
                  <td className="px-4 py-3">
                    <Link href={`/hoc-sinh/${s.id}`} className="font-medium text-[#18211d] hover:underline">
                      {s.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.grade_level ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.subjects?.join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-right">{formatVND(s.default_fee)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#eadfc8] px-2.5 py-0.5 text-xs text-[#6f4f1f]">
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

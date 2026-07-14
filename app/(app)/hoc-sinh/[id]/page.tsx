import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStudent } from '@/server/students/queries'
import { listDocumentsForStudent } from '@/server/documents/queries'
import { archiveStudentAction } from '@/server/students/actions'
import { STATUS_LABEL, FEE_TYPE_LABEL } from '@/lib/validators/student'
import { formatVND, formatDate } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import { DocumentList } from '@/components/documents/document-list'

export const metadata: Metadata = { title: 'Chi tiết học sinh — EduFlow' }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words text-foreground sm:text-right">{value}</span>
    </div>
  )
}

export default async function ChiTietHocSinhPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const s = await getStudent(id)
  if (!s) notFound()

  const docs = await listDocumentsForStudent(id)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/hoc-sinh" className="text-sm text-primary hover:underline">← Danh sách học sinh</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{s.full_name}</h1>
          <div className="flex items-center gap-2">
            <Link href={`/hoc-sinh/${s.id}/sua`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Sửa
            </Link>
            <form action={archiveStudentAction}>
              <input type="hidden" name="id" value={s.id} />
              <Button type="submit" variant="outline" size="sm">Lưu trữ</Button>
            </form>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <Row label="Trạng thái" value={STATUS_LABEL[s.status] ?? s.status} />
        <Row label="Lớp / khối" value={s.grade_level ?? '—'} />
        <Row label="Môn học" value={s.subjects?.join(', ') || '—'} />
        <Row label="Ngày sinh" value={s.date_of_birth ? formatDate(s.date_of_birth) : '—'} />
        <Row label="SĐT học sinh" value={s.phone ?? '—'} />
        <Row label="Email" value={s.email ?? '—'} />
        <Row label="Phụ huynh" value={s.parent_name ?? '—'} />
        <Row label="SĐT phụ huynh" value={s.parent_phone ?? '—'} />
        <Row label="Địa chỉ" value={s.address ?? '—'} />
        <Row label="Học phí" value={`${formatVND(s.default_fee)} · ${FEE_TYPE_LABEL[s.fee_type] ?? s.fee_type}`} />
        <Row label="Ghi chú" value={s.notes ?? '—'} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Tài liệu liên quan</h2>
          <Link href={`/tai-lieu/moi?studentId=${id}`} className="text-sm text-primary hover:underline">
            + Đính kèm
          </Link>
        </div>
        <DocumentList rows={docs} />
      </section>
    </div>
  )
}

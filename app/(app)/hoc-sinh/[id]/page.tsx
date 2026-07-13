import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStudent } from '@/server/students/queries'
import { archiveStudentAction } from '@/server/students/actions'
import { STATUS_LABEL, FEE_TYPE_LABEL } from '@/lib/validators/student'
import { formatVND, formatDate } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Chi tiết học sinh — EduFlow' }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#f0e7d7] py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-[#18211d]">{value}</span>
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/hoc-sinh" className="text-sm text-[#315c48] hover:underline">← Danh sách học sinh</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[#18211d]">{s.full_name}</h1>
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

      <div className="rounded-2xl border border-[#d8cbb4] bg-white p-6">
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

      <div className="rounded-2xl border border-dashed border-[#d8cbb4] bg-white p-6 text-sm text-muted-foreground">
        Lịch sử buổi học, công nợ và tài liệu của học sinh sẽ hiển thị ở đây trong các giai đoạn tiếp theo.
      </div>
    </div>
  )
}

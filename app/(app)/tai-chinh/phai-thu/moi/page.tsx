import type { Metadata } from 'next'
import Link from 'next/link'
import { listStudents } from '@/server/students/queries'
import { previewInvoiceFromSessions } from '@/server/finance/queries'
import CreateFromSessionsForm from '@/components/finance/create-from-sessions-form'
import ManualInvoiceForm from '@/components/finance/manual-invoice-form'
import { formatVND, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Tạo hóa đơn — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type SearchParams = { studentId?: string; period?: string }

export default async function TaoHoaDonPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const students = await listStudents({ page: 1 })
  const studentOpts = students.rows.map((s) => ({ id: s.id, label: s.full_name }))

  const preview =
    sp.studentId && sp.period
      ? await previewInvoiceFromSessions({ studentId: sp.studentId, periodMonth: sp.period })
      : null

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href="/tai-chinh/phai-thu" className="text-sm text-primary hover:underline">← Danh sách hóa đơn</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Tạo hóa đơn</h1>
      </div>

      {/* Tổng hợp tự động từ buổi học */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tổng hợp từ buổi học</h2>
          <p className="text-sm text-muted-foreground">
            Chọn học sinh và kỳ để gộp các buổi đã hoàn thành chưa lập hóa đơn.
          </p>
        </div>

        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="studentId" className="text-sm font-medium text-foreground">Học sinh</label>
            <select id="studentId" name="studentId" defaultValue={sp.studentId ?? ''} className={inputClass + ' w-full'}>
              <option value="">— Chọn học sinh —</option>
              {studentOpts.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="period" className="text-sm font-medium text-foreground">Kỳ (tháng)</label>
            <input id="period" type="month" name="period" defaultValue={sp.period ?? ''} className={inputClass + ' w-full'} />
          </div>
          <Button type="submit" variant="outline">Xem trước</Button>
        </form>

        {preview && (
          <div className="rounded-2xl border border-border bg-card p-6">
            {preview.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Không có buổi học hoàn thành chưa lập hóa đơn trong kỳ này.
              </p>
            ) : (
              <div className="space-y-4">
                <ul className="divide-y divide-border">
                  {preview.items.map((it) => (
                    <li key={it.sessionId} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="text-foreground">{formatDateTime(it.description)}</span>
                      <span className="font-medium text-foreground">{formatVND(it.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Tạm tính ({preview.items.length} buổi)</span>
                  <span className="text-base font-semibold text-foreground">{formatVND(preview.subtotal)}</span>
                </div>
                <CreateFromSessionsForm
                  studentId={sp.studentId!}
                  periodMonth={sp.period!}
                  subtotal={preview.subtotal}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Tạo thủ công */}
      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Hoặc tạo thủ công</h2>
          <p className="text-sm text-muted-foreground">Nhập tổng tiền trực tiếp (không gắn buổi học).</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <ManualInvoiceForm students={studentOpts} />
        </div>
      </section>
    </div>
  )
}

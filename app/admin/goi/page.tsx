import type { Metadata } from 'next'
import Link from 'next/link'
import { listPlansAdmin } from '@/server/admin/queries'
import { BILLING_CYCLE_LABEL } from '@/lib/validators/admin'
import { formatVND } from '@/lib/format'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Gói — Admin EduFlow' }

export default async function AdminPlansPage() {
  const plans = await listPlansAdmin()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Gói thuê bao</h1>
        <Link href="/admin/goi/moi" className={buttonVariants({ variant: 'success' })}>+ Thêm gói</Link>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Chưa có gói nào.</p>
          <Link href="/admin/goi/moi" className={buttonVariants({ variant: 'success', className: 'mt-4' })}>
            Tạo gói đầu tiên
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3 text-right">Giá</th>
                <th className="px-4 py-3">Chu kỳ</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.code}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-right">{formatVND(p.price)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{BILLING_CYCLE_LABEL[p.billing_cycle] ?? p.billing_cycle}</td>
                  <td className="px-4 py-3">
                    {p.is_active ? (
                      <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs text-success">Đang bán</span>
                    ) : (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">Ngưng bán</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/goi/${p.id}/sua`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                      Sửa
                    </Link>
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

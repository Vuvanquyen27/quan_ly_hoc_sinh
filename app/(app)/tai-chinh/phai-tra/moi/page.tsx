import type { Metadata } from 'next'
import Link from 'next/link'
import { listCategories } from '@/server/finance/categories'
import PayableForm from '@/components/finance/payable-form'

export const metadata: Metadata = { title: 'Thêm khoản phải trả — EduFlow' }

export default async function PhaiTraMoiPage() {
  const categories = await listCategories({ kind: 'expense' })
  return (
    <div className="space-y-6">
      <div>
        <Link href="/tai-chinh/phai-tra" className="text-sm text-muted-foreground hover:text-foreground">← Phải trả</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Thêm khoản phải trả</h1>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <PayableForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </div>
  )
}

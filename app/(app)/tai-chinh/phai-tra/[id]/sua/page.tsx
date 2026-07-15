import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayable } from '@/server/finance/payables'
import { listCategories } from '@/server/finance/categories'
import PayableForm from '@/components/finance/payable-form'

export const metadata: Metadata = { title: 'Sửa khoản phải trả — EduFlow' }

export default async function PhaiTraSuaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [data, categories] = await Promise.all([getPayable(id), listCategories({ kind: 'expense' })])
  if (!data) notFound()
  const p = data.payable
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/tai-chinh/phai-tra/${id}`} className="text-sm text-muted-foreground hover:text-foreground">← Chi tiết</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Sửa khoản phải trả</h1>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <PayableForm
          payableId={id}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          defaults={{
            creditorName: p.creditor_name,
            title: p.title,
            categoryId: p.category_id,
            totalAmount: p.total_amount,
            dueDate: p.due_date,
            note: p.note,
          }}
        />
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import PlanForm from '@/components/admin/plan-form'

export const metadata: Metadata = { title: 'Thêm gói — Admin EduFlow' }

export default function NewPlanPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/goi" className="text-sm text-muted-foreground hover:text-foreground">
          ← Danh sách gói
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Thêm gói</h1>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <PlanForm />
      </div>
    </div>
  )
}

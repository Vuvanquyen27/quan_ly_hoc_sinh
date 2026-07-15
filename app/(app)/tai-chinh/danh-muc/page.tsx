import type { Metadata } from 'next'
import { listCategories } from '@/server/finance/categories'
import CategoryManager from '@/components/finance/category-manager'

export const metadata: Metadata = { title: 'Danh mục thu/chi — EduFlow' }

export default async function DanhMucPage() {
  const cats = await listCategories()
  const income = cats.filter((c) => c.kind === 'income').map((c) => ({ id: c.id, name: c.name }))
  const expense = cats.filter((c) => c.kind === 'expense').map((c) => ({ id: c.id, name: c.name }))
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Danh mục thu/chi</h1>
      <CategoryManager income={income} expense={expense} />
    </div>
  )
}

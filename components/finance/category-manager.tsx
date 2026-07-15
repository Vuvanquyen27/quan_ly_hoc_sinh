'use client'

import { useActionState } from 'react'
import { createCategory, updateCategory, archiveCategoryAction, type FinanceCategoryActionState } from '@/server/finance/categories-actions'
import { CATEGORY_KIND_LABEL } from '@/lib/validators/category'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Cat = { id: string; name: string }

function AddForm({ kind }: { kind: 'income' | 'expense' }) {
  const [state, action, pending] = useActionState<FinanceCategoryActionState, FormData>(createCategory, null)
  return (
    <form action={action} className="flex items-start gap-2">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex-1">
        <Input name="name" placeholder={`Thêm danh mục ${CATEGORY_KIND_LABEL[kind].toLowerCase()}…`} required />
        {state?.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
      </div>
      <Button type="submit" variant="outline" disabled={pending}>Thêm</Button>
    </form>
  )
}

function Row({ cat }: { cat: Cat }) {
  const [state, action, pending] = useActionState<FinanceCategoryActionState, FormData>(updateCategory, null)
  return (
    <li className="flex items-center gap-2 px-4 py-2.5">
      <form action={action} className="flex flex-1 items-center gap-2">
        <input type="hidden" name="id" value={cat.id} />
        <Input name="name" defaultValue={cat.name} className="h-8" />
        <Button type="submit" variant="ghost" className="h-8 px-2 text-xs" disabled={pending}>Lưu</Button>
        {state?.error && <span className="text-xs text-destructive">{state.error}</span>}
      </form>
      <form action={archiveCategoryAction}>
        <input type="hidden" name="id" value={cat.id} />
        <Button type="submit" variant="ghost" className="h-8 px-2 text-xs text-destructive">Ẩn</Button>
      </form>
    </li>
  )
}

export default function CategoryManager({ income, expense }: { income: Cat[]; expense: Cat[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {([['expense', expense], ['income', income]] as const).map(([kind, list]) => (
        <div key={kind} className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-medium text-foreground">Danh mục {CATEGORY_KIND_LABEL[kind].toLowerCase()}</h2>
          </div>
          <ul className="divide-y divide-border">
            {list.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">Chưa có danh mục.</li>
            ) : (
              list.map((c) => <Row key={c.id} cat={c} />)
            )}
          </ul>
          <div className="border-t border-border p-3">
            <AddForm kind={kind} />
          </div>
        </div>
      ))}
    </div>
  )
}

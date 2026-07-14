import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { listDocuments } from '@/server/documents/queries'
import { DocumentList } from '@/components/documents/document-list'
import { Button, buttonVariants } from '@/components/ui/button'
import { ListResultsSkeleton } from '@/components/ui/skeletons'

export const metadata: Metadata = { title: 'Tài liệu — EduFlow' }

const inputClass =
  'h-9 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40'

type DocumentSearchParams = { search?: string; type?: string; page?: string }

export default async function TaiLieuPage({
  searchParams,
}: {
  searchParams: Promise<DocumentSearchParams>
}) {
  const sp = await searchParams

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tài liệu</h1>
        <Link
          href="/tai-lieu/moi"
          className={buttonVariants({ variant: 'success', className: 'w-full sm:w-auto' })}
        >
          + Thêm tài liệu
        </Link>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center" action="/tai-lieu">
        <input
          name="search"
          defaultValue={sp.search ?? ''}
          placeholder="Tìm theo tiêu đề…"
          className={inputClass + ' w-full sm:w-auto sm:min-w-56'}
        />
        <select
          name="type"
          defaultValue={sp.type ?? ''}
          className={inputClass}
        >
          <option value="">Tất cả loại</option>
          <option value="file">Tệp</option>
          <option value="link">Liên kết</option>
        </select>
        <Button type="submit" variant="outline">Lọc</Button>
      </form>

      {/* Chỉ phần kết quả chờ query — shell trên hiện ngay khi chuyển trang. */}
      <Suspense key={JSON.stringify(sp)} fallback={<ListResultsSkeleton />}>
        <DocumentResults sp={sp} />
      </Suspense>
    </div>
  )
}

async function DocumentResults({ sp }: { sp: DocumentSearchParams }) {
  const page = Math.max(1, Number(sp.page) || 1)
  const { rows, total, pageSize } = await listDocuments({
    search: sp.search,
    type: sp.type,
    page,
  })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (sp.search) params.set('search', sp.search)
    if (sp.type) params.set('type', sp.type)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/tai-lieu?${qs}` : '/tai-lieu'
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{total} tài liệu</p>

      <DocumentList rows={rows} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">
            Trang {page}/{totalPages}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={buildHref(page - 1)} className={buttonVariants({ variant: 'outline' })}>
                ← Trước
              </Link>
            ) : (
              <Button variant="outline" disabled>← Trước</Button>
            )}
            {page < totalPages ? (
              <Link href={buildHref(page + 1)} className={buttonVariants({ variant: 'outline' })}>
                Sau →
              </Link>
            ) : (
              <Button variant="outline" disabled>Sau →</Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLesson } from '@/server/lessons/queries'
import { archiveLessonAction } from '@/server/lessons/actions'
import { STATUS_LABEL } from '@/lib/validators/lesson'
import { Button, buttonVariants } from '@/components/ui/button'
import { Markdown } from '@/components/lessons/markdown'

export const metadata: Metadata = { title: 'Chi tiết bài học — EduFlow' }

export default async function ChiTietBaiHocPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const l = await getLesson(id)
  if (!l) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/bai-hoc" className="text-sm text-primary hover:underline">← Danh sách bài học</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{l.title}</h1>
          <div className="flex items-center gap-2">
            <Link href={`/bai-hoc/${l.id}/sua`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Sửa
            </Link>
            <form action={archiveLessonAction}>
              <input type="hidden" name="id" value={l.id} />
              <Button type="submit" variant="outline" size="sm">Lưu trữ</Button>
            </form>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
            {STATUS_LABEL[l.status] ?? l.status}
          </span>
          {l.subject && <span>Môn: {l.subject}</span>}
          {l.grade_level && <span>· Khối: {l.grade_level}</span>}
        </div>
        {l.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {l.tags.map((t) => (
              <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {l.description && <p className="text-sm text-muted-foreground">{l.description}</p>}

      <div className="rounded-2xl border border-border bg-card p-6">
        {l.content
          ? <Markdown>{l.content}</Markdown>
          : <p className="text-sm text-muted-foreground">Chưa có nội dung.</p>}
      </div>
    </div>
  )
}

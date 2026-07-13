import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLesson } from '@/server/lessons/queries'
import { LessonForm } from '@/components/lessons/lesson-form'

export const metadata: Metadata = { title: 'Sửa bài học — EduFlow' }

export default async function SuaBaiHocPage({
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
        <Link href={`/bai-hoc/${l.id}`} className="text-sm text-primary hover:underline">← Chi tiết bài học</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Sửa: {l.title}</h1>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <LessonForm lesson={l} />
      </div>
    </div>
  )
}

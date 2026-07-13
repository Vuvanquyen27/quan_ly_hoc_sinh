import type { Metadata } from 'next'
import Link from 'next/link'
import { LessonForm } from '@/components/lessons/lesson-form'

export const metadata: Metadata = { title: 'Thêm bài học — EduFlow' }

export default function ThemBaiHocPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/bai-hoc" className="text-sm text-primary hover:underline">← Danh sách bài học</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Thêm bài học</h1>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <LessonForm />
      </div>
    </div>
  )
}
